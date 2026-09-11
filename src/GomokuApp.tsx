import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GomokuBoard } from './GomokuBoard';
import { emptyBoard, GBoard, GPos, idx, otherStone, Stone } from './engine/gomoku/types';
import { gomokuStatus } from './engine/gomoku/game';
import { findWinningLine } from './engine/gomoku/rules';
import { chooseGomokuMove, GDifficulty, G_DIFFICULTY } from './engine/gomoku/ai';
import type { GAiRequest, GAiResponse } from './engine/gomoku/aiWorker';

type Phase = 'setup' | 'playing';

const DIFF_DESC: Record<GDifficulty, string> = {
  easy: '가볍게 한 판',
  normal: '적당한 상대',
  hard: '더 깊이 읽음',
};

// Think-time budget per difficulty (ms).
const THINK_MS: Record<GDifficulty, number> = { easy: 400, normal: 1200, hard: 2500 };

export function GomokuApp({ onExit }: { onExit?: () => void }) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [humanColor, setHumanColor] = useState<Stone>('black');
  const [difficulty, setDifficulty] = useState<GDifficulty>('normal');

  const [board, setBoard] = useState<GBoard>(() => emptyBoard());
  const [toMove, setToMove] = useState<Stone>('black'); // black always first
  const [lastMove, setLastMove] = useState<GPos | null>(null);
  const [thinking, setThinking] = useState(false);

  const status = useMemo(() => gomokuStatus(board), [board]);
  const gameOver = status.kind !== 'playing';
  const aiColor = otherStone(humanColor);

  const workerRef = useRef<Worker | null>(null);
  const aiTimer = useRef<number | null>(null);
  useEffect(() => {
    const w = new Worker(new URL('./engine/gomoku/aiWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = w;
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  const place = useCallback((r: number, c: number, color: Stone) => {
    setBoard((b) => {
      if (b[idx(r, c)] !== null) return b;
      const nb = b.slice();
      nb[idx(r, c)] = color;
      return nb;
    });
    setLastMove({ r, c });
    setToMove((s) => otherStone(s));
  }, []);

  const onCellTap = useCallback(
    (r: number, c: number) => {
      if (gameOver || thinking) return;
      if (toMove !== humanColor) return;
      if (board[idx(r, c)] !== null) return;
      place(r, c, humanColor);
    },
    [gameOver, thinking, toMove, humanColor, board, place]
  );

  // AI turn.
  useEffect(() => {
    if (phase !== 'playing') return;
    if (gameOver) return;
    if (toMove !== aiColor) return;
    setThinking(true);

    let cancelled = false;
    const startedAt = Date.now();
    const MIN_DELAY = 300;

    const apply = (mv: GPos | null) => {
      if (cancelled) return;
      const wait = Math.max(0, MIN_DELAY - (Date.now() - startedAt));
      aiTimer.current = window.setTimeout(() => {
        if (cancelled) return;
        setThinking(false);
        if (mv) place(mv.r, mv.c, aiColor);
      }, wait);
    };

    const worker = workerRef.current;
    const budget = THINK_MS[difficulty];
    if (worker) {
      const onMsg = (e: MessageEvent<GAiResponse>) => {
        worker.removeEventListener('message', onMsg);
        apply(e.data.result.move);
      };
      worker.addEventListener('message', onMsg);
      // guard against a hung worker
      const watchdog = window.setTimeout(() => {
        worker.removeEventListener('message', onMsg);
        const res = chooseGomokuMove(board, aiColor, difficulty, budget);
        apply(res.move);
      }, budget + 6000);
      const req: GAiRequest = { board, me: aiColor, difficulty, timeMs: budget };
      worker.postMessage(req);
      return () => {
        cancelled = true;
        worker.removeEventListener('message', onMsg);
        window.clearTimeout(watchdog);
        if (aiTimer.current) window.clearTimeout(aiTimer.current);
      };
    }

    // Fallback: compute on the main thread.
    aiTimer.current = window.setTimeout(() => {
      const res = chooseGomokuMove(board, aiColor, difficulty, budget);
      apply(res.move);
    }, 30);
    return () => {
      cancelled = true;
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toMove, aiColor, gameOver, phase]);

  const start = useCallback((color: Stone, diff: GDifficulty) => {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    setHumanColor(color);
    setDifficulty(diff);
    setBoard(emptyBoard());
    setToMove('black');
    setLastMove(null);
    setThinking(false);
    setPhase('playing');
  }, []);

  const backToSetup = useCallback(() => {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    setThinking(false);
    setPhase('setup');
  }, []);

  const statusText = useMemo(() => {
    if (status.kind === 'win') {
      const iWon = status.winner === humanColor;
      return iWon ? '승리했습니다!' : '패배했습니다';
    }
    if (status.kind === 'draw') return '무승부';
    const turn = toMove === humanColor ? '내 차례' : 'AI 차례';
    return `${turn} (${toMove === 'black' ? '흑' : '백'})`;
  }, [status, toMove, humanColor]);

  const endResult = useMemo(() => {
    if (status.kind === 'win') {
      const win = status.winner === humanColor;
      return { win, title: win ? '승리!' : '패배', detail: win ? '오목 완성!' : '상대가 먼저 완성했어요' };
    }
    if (status.kind === 'draw') return { win: false, title: '무승부', detail: '판이 가득 찼습니다' };
    return null;
  }, [status, humanColor]);

  // The winning five (or more) in a row — highlighted on the board at game end.
  const winningLine = useMemo(
    () => (status.kind === 'win' ? findWinningLine(board, status.winner) : null),
    [status, board]
  );

  // ---- Setup screen ----
  if (phase === 'setup') {
    return (
      <div className="setup">
        {onExit && (
          <button className="back-link" onClick={onExit}>
            ← 게임 선택
          </button>
        )}
        <h1 className="setup-title">오목</h1>
        <p className="setup-sub">AI와 대전 · 시작 전에 설정을 골라주세요</p>

        <div className="setup-card">
          <h2>돌 색 (흑이 먼저)</h2>
          <div className="choice-grid">
            <button
              className={`choice ${humanColor === 'black' ? 'active' : ''}`}
              onClick={() => setHumanColor('black')}
            >
              <span className="choice-big gs-stone-lg black" />
              <span>흑 (선공)</span>
            </button>
            <button
              className={`choice ${humanColor === 'white' ? 'active' : ''}`}
              onClick={() => setHumanColor('white')}
            >
              <span className="choice-big gs-stone-lg white" />
              <span>백 (후공)</span>
            </button>
          </div>
        </div>

        <div className="setup-card">
          <h2>난이도</h2>
          <div className="diff-list">
            {(['easy', 'normal', 'hard'] as GDifficulty[]).map((d) => (
              <button
                key={d}
                className={`diff-btn ${difficulty === d ? 'active' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                <span className="diff-name">{G_DIFFICULTY[d].label}</span>
                <span className="diff-desc">{DIFF_DESC[d]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setup-nav">
          <button className="btn primary" onClick={() => start(humanColor, difficulty)}>
            대국 시작
          </button>
        </div>
      </div>
    );
  }

  // ---- Playing screen ----
  return (
    <div className="app">
      <div className="status-bar">{thinking ? 'AI가 생각하는 중…' : statusText}</div>

      {/* Compact result banner ABOVE the board so the highlighted winning
          line stays fully visible (no full-board popup). */}
      {endResult && (
        <div className={`gresult ${endResult.win ? 'win' : 'lose'}`}>
          <span className="gresult-title">{endResult.title}</span>
          <span className="gresult-detail">{endResult.detail}</span>
        </div>
      )}

      <div className="board-wrap">
        <GomokuBoard
          board={board}
          lastMove={lastMove}
          onCellTap={onCellTap}
          disabled={gameOver || thinking || toMove !== humanColor}
          winningLine={winningLine}
        />
      </div>

      <div className="game-actions">
        <button className="btn" onClick={onExit}>
          게임 선택
        </button>
        <button className="btn primary" onClick={backToSetup}>
          새 게임
        </button>
      </div>
    </div>
  );
}
