import { GameActions } from './GameActions';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChessBoard } from './ChessBoard';
import { ChessPiece } from './ChessPiece';
import { initialState } from './engine/chess/board';
import {
  allLegalMoves,
  legalMovesFor,
  advanceState,
  findKing,
} from './engine/chess/moves';
import { getStatus } from './engine/chess/game';
import {
  initChessEngine,
  chessBestMove,
  setChessSkill,
  CHESS_DIFFICULTY,
  ChessDifficulty,
} from './engine/chess/chessEngine';
import { playPlaceSound, unlockAudio } from './sound';
import { isInAppBrowser } from './inapp';
import { InAppNotice } from './InAppNotice';
import {
  CMove,
  CPos,
  CSide,
  CState,
  CPieceType,
  cOpponent,
} from './engine/chess/types';

const SIDE_NAME: Record<CSide, string> = { white: '백', black: '흑' };
const DIFF_DESC: Record<ChessDifficulty, string> = {
  easy: '가볍게 한 판',
  normal: '적당한 상대',
  hard: '더 깊이 읽음',
};

type Phase = 'setup' | 'playing';

export function ChessApp({ onExit }: { onExit?: () => void }) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [humanSide, setHumanSide] = useState<CSide>('white');
  const [difficulty, setDifficulty] = useState<ChessDifficulty>('normal');

  const [state, setState] = useState<CState>(() => initialState());
  const [selected, setSelected] = useState<CPos | null>(null);
  const [lastMove, setLastMove] = useState<CMove | null>(null);
  const [thinking, setThinking] = useState(false);

  // Pending promotion: a legal pawn move set awaiting the user's piece choice.
  const [promoChoice, setPromoChoice] = useState<{ moves: CMove[] } | null>(null);


  const status = useMemo(() => getStatus(state), [state]);
  const gameOver = status.kind !== 'playing';
  const aiSide = cOpponent(humanSide);
  const aiTimer = useRef<number | null>(null);

  const [engineState, setEngineState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [engineError, setEngineError] = useState('');

  useEffect(() => {
    let alive = true;
    initChessEngine()
      .then(() => {
        if (alive) setEngineState('ready');
      })
      .catch((e) => {
        if (!alive) return;
        setEngineState('failed');
        setEngineError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return legalMovesFor(state, selected);
  }, [state, selected]);

  const doMove = useCallback((move: CMove) => {
    playPlaceSound(!!move.captured || !!move.castle);
    setState((s) => advanceState(s, move));
    setLastMove(move);
    setSelected(null);
  }, []);

  const onCellTap = useCallback(
    (r: number, c: number) => {
      unlockAudio();
      if (gameOver || thinking || promoChoice) return;
      if (state.toMove !== humanSide) return;

      const piece = state.board[r][c];
      if (selected) {
        // All legal moves from `selected` landing on (r,c). Could be multiple
        // if this is a promotion (queen/rook/bishop/knight).
        const matches = legalTargets.filter((m) => m.to.r === r && m.to.c === c);
        if (matches.length > 1 && matches.every((m) => m.promotion)) {
          setPromoChoice({ moves: matches }); // ask which piece
          return;
        }
        if (matches.length >= 1) {
          doMove(matches[0]);
          return;
        }
        if (piece && piece.side === humanSide) setSelected({ r, c });
        else setSelected(null);
        return;
      }
      if (piece && piece.side === humanSide) setSelected({ r, c });
    },
    [state, selected, legalTargets, doMove, gameOver, thinking, humanSide, promoChoice]
  );

  // AI turn.
  const MIN_AI_DELAY = 400;
  const AI_TIME_BUDGET = CHESS_DIFFICULTY[difficulty].timeMs;
  useEffect(() => {
    if (phase !== 'playing') return;
    if (gameOver) return;
    if (state.toMove !== aiSide) return;
    if (engineState === 'failed') return;
    setThinking(true);

    const startedAt = Date.now();
    let cancelled = false;

    const legal = allLegalMoves(state, aiSide);
    if (legal.length === 0) {
      setThinking(false);
      return;
    }

    // Match the engine's from/to/promotion to one of our validated legal moves.
    const toLegalMove = (
      res: { from: CPos; to: CPos; promotion?: CPieceType } | null
    ): CMove | null => {
      if (!res) return null;
      const cands = legal.filter(
        (m) =>
          m.from.r === res.from.r &&
          m.from.c === res.from.c &&
          m.to.r === res.to.r &&
          m.to.c === res.to.c
      );
      if (cands.length === 0) return null;
      if (res.promotion) return cands.find((m) => m.promotion === res.promotion) ?? cands[0];
      // Prefer a non-promotion; else default to queen promotion.
      return cands.find((m) => !m.promotion) ?? cands.find((m) => m.promotion === 'queen') ?? cands[0];
    };

    const finish = (move: CMove | null) => {
      if (cancelled) return;
      const chosen = move ?? legal[Math.floor(Math.random() * legal.length)];
      const wait = Math.max(0, MIN_AI_DELAY - (Date.now() - startedAt));
      aiTimer.current = window.setTimeout(() => {
        if (cancelled) return;
        setThinking(false);
        doMove(chosen);
      }, wait);
    };

    const watchdog = window.setTimeout(() => finish(null), AI_TIME_BUDGET + 8000);

    chessBestMove(state, AI_TIME_BUDGET)
      .then((res) => {
        if (cancelled) return;
        window.clearTimeout(watchdog);
        finish(toLegalMove(res));
      })
      .catch(() => {
        if (cancelled) return;
        window.clearTimeout(watchdog);
        finish(null);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, aiSide, gameOver, phase, engineState]);

  const start = useCallback((side: CSide, diff: ChessDifficulty) => {
    unlockAudio();
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    const init = initialState();
    setHumanSide(side);
    setDifficulty(diff);
    setChessSkill(CHESS_DIFFICULTY[diff].skill).catch(() => {});
    setState(init);
    setSelected(null);
    setLastMove(null);
    setThinking(false);
    setPromoChoice(null);
    setPhase('playing');
  }, []);

  const backToSetup = useCallback(() => {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    setThinking(false);
    setSelected(null);
    setPhase('setup');
  }, []);

  const inCheck = status.kind === 'playing' && status.check;
  const checkedKing = useMemo(
    () => (inCheck ? findKing(state.board, state.toMove) : null),
    [inCheck, state]
  );

  const statusText = useMemo(() => {
    if (status.kind === 'checkmate') {
      return status.winner === humanSide ? '체크메이트! 승리했습니다' : '체크메이트… 패배했습니다';
    }
    if (status.kind === 'stalemate') return '스테일메이트 · 무승부';
    if (status.kind === 'draw') return status.reason === 'fifty' ? '50수 규칙 · 무승부' : '기물 부족 · 무승부';
    const turn = state.toMove === humanSide ? '내 차례' : 'AI 차례';
    return `${turn} (${SIDE_NAME[state.toMove]})`;
  }, [status, state.toMove, humanSide]);

  const endResult = useMemo(() => {
    if (status.kind === 'checkmate') {
      const win = status.winner === humanSide;
      return { win, draw: false, title: win ? '승리!' : '패배', detail: win ? '체크메이트로 이겼습니다' : '체크메이트… 아쉽네요' };
    }
    if (status.kind === 'stalemate') return { win: false, draw: true, title: '무승부', detail: '스테일메이트' };
    if (status.kind === 'draw') return { win: false, draw: true, title: '무승부', detail: status.reason === 'fifty' ? '50수 규칙' : '기물 부족' };
    return null;
  }, [status, humanSide]);

  if (isInAppBrowser()) return <InAppNotice />;

  if (phase === 'setup') {
    return (
      <ChessSetup
        onStart={start}
        onBack={onExit}
        side={humanSide}
        setSide={setHumanSide}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
      />
    );
  }

  return (
    <div className="app">
      <div className={`status-bar ${inCheck ? 'status-check' : ''}`}>
        {engineState === 'loading' && state.toMove === aiSide
          ? '엔진 준비 중…'
          : thinking
            ? 'AI가 생각하는 중…'
            : statusText}
      </div>

      <div className="board-wrap">
        <ChessBoard
          board={state.board}
          selected={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          onCellTap={onCellTap}
          humanSide={humanSide}
          checkedKing={checkedKing}
        />

        {inCheck && !gameOver && <div className="check-banner">체크!</div>}

        {promoChoice && (
          <div className="result-overlay">
            <div className="result-card">
              <div className="result-title" style={{ fontSize: 22 }}>승진할 기물 선택</div>
              <div className="promo-row">
                {(['queen', 'rook', 'bishop', 'knight'] as const).map((t) => {
                  const mv = promoChoice.moves.find((m) => m.promotion === t)!;
                  return (
                    <button
                      key={t}
                      className="promo-btn"
                      onClick={() => {
                        setPromoChoice(null);
                        doMove(mv);
                      }}
                    >
                      <svg viewBox="0 0 48 48" width="44" height="44" aria-label={t}>
                        <ChessPiece type={t} side={humanSide} size={48} x={0} y={0} idPrefix={`promo-${t}`} />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {endResult && (
          <div className="result-overlay">
            <div className={`result-card ${endResult.draw ? 'draw' : endResult.win ? 'win' : 'lose'}`}>
              <div className="result-title">{endResult.title}</div>
              <div className="result-detail">{endResult.detail}</div>
              <button className="btn primary result-btn" onClick={backToSetup}>새 게임</button>
            </div>
          </div>
        )}

        {engineState === 'failed' && !endResult && (
          <div className="result-overlay">
            <div className="result-card lose">
              <div className="result-title">엔진을 열 수 없어요</div>
              <div className="result-detail">
                AI 엔진을 불러오지 못했습니다. 페이지를 새로고침해 주세요.
                {engineError ? ` (${engineError})` : ''}
              </div>
              <button className="btn primary result-btn" onClick={() => window.location.reload()}>새로고침</button>
            </div>
          </div>
        )}
      </div>

      <GameActions onExit={onExit} onNewGame={backToSetup} />
    </div>
  );
}

// --- Inline setup screen (side + difficulty; no formation step) -------------
function ChessSetup({
  onStart,
  onBack,
  side,
  setSide,
  difficulty,
  setDifficulty,
}: {
  onStart: (side: CSide, diff: ChessDifficulty) => void;
  onBack?: () => void;
  side: CSide;
  setSide: (s: CSide) => void;
  difficulty: ChessDifficulty;
  setDifficulty: (d: ChessDifficulty) => void;
}) {
  return (
    <div className="setup">
      {onBack && (
        <button className="back-link" onClick={onBack}>← 게임 선택</button>
      )}
      <h1 className="setup-title">체스</h1>
      <p className="setup-sub">AI와 대전 · 시작 전에 설정을 골라주세요</p>

      <div className="setup-card">
        <h2>기물 색</h2>
        <p className="hint">백(White)이 먼저 둡니다. 흑을 고르면 AI가 선공합니다.</p>
        <div className="choice-grid">
          <button className={`choice ${side === 'white' ? 'active' : ''}`} onClick={() => setSide('white')}>
            <svg viewBox="0 0 44 44" width="40" height="40" aria-hidden>
              <ChessPiece type="king" side="white" size={44} x={0} y={0} idPrefix="setup-w" />
            </svg>
            <span>백 (선공)</span>
          </button>
          <button className={`choice ${side === 'black' ? 'active' : ''}`} onClick={() => setSide('black')}>
            <svg viewBox="0 0 44 44" width="40" height="40" aria-hidden>
              <ChessPiece type="king" side="black" size={44} x={0} y={0} idPrefix="setup-b" />
            </svg>
            <span>흑 (후공)</span>
          </button>
        </div>
      </div>

      <div className="setup-card">
        <h2>난이도</h2>
        <div className="diff-list">
          {(['easy', 'normal', 'hard'] as ChessDifficulty[]).map((d) => (
            <button key={d} className={`diff-btn ${difficulty === d ? 'active' : ''}`} onClick={() => setDifficulty(d)}>
              <span className="diff-name">{CHESS_DIFFICULTY[d].label}</span>
              <span className="diff-desc">{DIFF_DESC[d]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="setup-nav">
        <button className="btn primary" onClick={() => onStart(side, difficulty)}>대국 시작</button>
      </div>
    </div>
  );
}
