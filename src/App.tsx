import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './Board';
import { CapturedTray } from './CapturedTray';
import { SetupScreen, StartConfig } from './SetupScreen';
import { initialBoard } from './engine/board';
import { applyMove, legalMovesFor } from './engine/moves';
import { getStatus } from './engine/game';
import { chooseMove, chooseSetup, Difficulty } from './engine/ai';
import { openingMove, OPENING_PLIES } from './engine/openings';
import type { AiRequest, AiResponse } from './engine/aiWorker';
import { materialScore, capturedByOpponentOf } from './engine/score';
import { Board as BoardState, Move, Pos, Side, SideSetup, opponent } from './engine/types';

const SIDE_NAME: Record<Side, string> = { cho: '초', han: '한' };

type Phase = 'setup' | 'playing';

export default function App() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [humanSide, setHumanSide] = useState<Side>('cho');
  // Difficulty is fixed to the strongest level.
  const difficulty: Difficulty = 'hard';
  const [board, setBoard] = useState<BoardState>(() => initialBoard());
  const [toMove, setToMove] = useState<Side>('cho'); // Cho (bottom) moves first
  const [selected, setSelected] = useState<Pos | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [thinking, setThinking] = useState(false);

  const status = useMemo(() => getStatus(board, toMove), [board, toMove]);
  const gameOver = status.kind !== 'playing';

  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return legalMovesFor(board, selected);
  }, [board, selected]);

  const aiSide = opponent(humanSide);
  const aiTimer = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const aiMoveCount = useRef(0); // how many moves the AI has made this game

  // Create the search worker once (runs the heavy AI off the main thread so
  // the UI never freezes while the AI thinks).
  useEffect(() => {
    const worker = new Worker(new URL('./engine/aiWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Scores and captured pieces derived from the current board.
  const humanScore = useMemo(() => materialScore(board, humanSide), [board, humanSide]);
  const aiScore = useMemo(() => materialScore(board, aiSide), [board, aiSide]);
  // Pieces the human captured = opponent (AI) pieces missing from the board.
  const humanCaptured = useMemo(
    () => capturedByOpponentOf(board, aiSide),
    [board, aiSide]
  );
  const aiCaptured = useMemo(
    () => capturedByOpponentOf(board, humanSide),
    [board, humanSide]
  );

  const doMove = useCallback((move: Move) => {
    setBoard((b) => applyMove(b, move));
    setLastMove(move);
    setSelected(null);
    setToMove((s) => opponent(s));
  }, []);

  const onCellTap = useCallback(
    (r: number, c: number) => {
      if (gameOver || thinking) return;
      if (toMove !== humanSide) return; // not your turn

      const piece = board[r][c];
      if (selected) {
        const move = legalTargets.find((m) => m.to.r === r && m.to.c === c);
        if (move) {
          doMove(move);
          return;
        }
        if (piece && piece.side === humanSide) {
          setSelected({ r, c });
        } else {
          setSelected(null);
        }
        return;
      }
      if (piece && piece.side === humanSide) {
        setSelected({ r, c });
      }
    },
    [board, selected, legalTargets, doMove, gameOver, thinking, toMove, humanSide]
  );

  // AI turn. The worker searches with a time budget; we also enforce a minimum
  // total delay so the opponent's move is clearly noticeable after the player.
  const MIN_AI_DELAY = 600; // ms — small floor so a move is visible
  const AI_TIME_BUDGET = 10000; // ms of search the worker is allowed (higher = stronger)
  const AI_MAX_DEPTH = 30; // let time, not depth, be the limiter
  useEffect(() => {
    if (phase !== 'playing') return;
    if (gameOver) return;
    if (toMove !== aiSide) return;
    setThinking(true);

    const startedAt = Date.now();
    let cancelled = false;

    const applyResult = (move: Move | null) => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_AI_DELAY - elapsed);
      aiTimer.current = window.setTimeout(() => {
        if (cancelled) return;
        setThinking(false);
        if (move) {
          aiMoveCount.current += 1;
          doMove(move);
        }
      }, wait);
    };

    const worker = workerRef.current;
    if (worker) {
      const onMessage = (e: MessageEvent<AiResponse>) => {
        worker.removeEventListener('message', onMessage);
        applyResult(e.data.move);
      };
      worker.addEventListener('message', onMessage);
      const req: AiRequest = {
        board,
        side: aiSide,
        difficulty,
        timeMs: AI_TIME_BUDGET,
        maxDepth: AI_MAX_DEPTH,
        aiMoveNumber: aiMoveCount.current,
      };
      worker.postMessage(req);
      return () => {
        cancelled = true;
        worker.removeEventListener('message', onMessage);
        if (aiTimer.current) window.clearTimeout(aiTimer.current);
      };
    }

    // Fallback: no worker available -> compute on the main thread.
    aiTimer.current = window.setTimeout(() => {
      let move: Move | null = null;
      if (aiMoveCount.current < OPENING_PLIES) {
        move = openingMove(board, aiSide, aiMoveCount.current);
      }
      if (!move) {
        move = chooseMove(board, aiSide, difficulty, {
          timeMs: AI_TIME_BUDGET,
          maxDepth: AI_MAX_DEPTH,
        });
      }
      applyResult(move);
    }, 60);
    return () => {
      cancelled = true;
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toMove, aiSide, gameOver, phase]);

  const startGame = useCallback((cfg: StartConfig) => {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    const human = cfg.humanSide;
    const humanSetup: SideSetup = cfg.humanSetup;
    // The AI picks its own wing formation based on the human's choice.
    const aiSideLocal = opponent(human);
    const aiSetup = chooseSetup(aiSideLocal, human, humanSetup);
    const choSetup = human === 'cho' ? humanSetup : aiSetup;
    const hanSetup = human === 'han' ? humanSetup : aiSetup;

    setHumanSide(human);
    setBoard(initialBoard(choSetup, hanSetup));
    setToMove('cho');
    setSelected(null);
    setLastMove(null);
    setThinking(false);
    aiMoveCount.current = 0; // reset opening-book counter for the new game
    setPhase('playing');
  }, []);

  const backToSetup = useCallback(() => {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    setThinking(false);
    setSelected(null);
    setPhase('setup');
  }, []);

  const statusText = useMemo(() => {
    if (status.kind === 'checkmate') {
      return status.winner === humanSide ? '외통수! 승리했습니다 🎉' : '외통수… 패배했습니다';
    }
    if (status.kind === 'stalemate') {
      return status.winner === humanSide ? '상대가 둘 수 없습니다. 승리! 🎉' : '둘 곳이 없습니다. 패배…';
    }
    const turn = toMove === humanSide ? '내 차례' : 'AI 차례';
    const check = status.check ? ' · 장군!' : '';
    return `${turn} (${SIDE_NAME[toMove]})${check}`;
  }, [status, toMove, humanSide]);

  const inCheck = status.kind === 'playing' && status.check;

  // Game-over result for the overlay popup.
  const endResult = useMemo(() => {
    if (status.kind === 'checkmate') {
      const win = status.winner === humanSide;
      return {
        win,
        title: win ? '승리!' : '패배',
        detail: win ? '외통수로 이겼습니다 🎉' : '외통수… 아쉽네요',
      };
    }
    if (status.kind === 'stalemate') {
      const win = status.winner === humanSide;
      return {
        win,
        title: win ? '승리!' : '패배',
        detail: win ? '상대가 둘 수 없습니다 🎉' : '둘 곳이 없습니다',
      };
    }
    return null;
  }, [status, humanSide]);

  if (phase === 'setup') {
    return <SetupScreen onStart={startGame} />;
  }

  return (
    <div className="app">
      <div className={`status-bar ${inCheck ? 'status-check' : ''}`}>
        {thinking ? 'AI가 생각하는 중…' : statusText}
      </div>

      {/* Opponent (AI) tray at the top: shows pieces the AI captured. */}
      <CapturedTray
        owner={aiSide}
        captured={aiCaptured}
        score={aiScore}
        label={`AI (${SIDE_NAME[aiSide]})`}
      />

      <div className="board-wrap">
        <Board
          board={board}
          selected={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          onCellTap={onCellTap}
          humanSide={humanSide}
        />

        {endResult && (
          <div className="result-overlay">
            <div className={`result-card ${endResult.win ? 'win' : 'lose'}`}>
              <div className="result-title">{endResult.title}</div>
              <div className="result-detail">{endResult.detail}</div>
              <button className="btn primary result-btn" onClick={backToSetup}>
                새 게임
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Human tray at the bottom: shows pieces the player captured. */}
      <CapturedTray
        owner={humanSide}
        captured={humanCaptured}
        score={humanScore}
        label={`나 (${SIDE_NAME[humanSide]})`}
      />

      <div className="game-actions">
        <button className="btn primary" onClick={backToSetup}>
          새 게임
        </button>
      </div>
    </div>
  );
}
