import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './Board';
import { CapturedTray } from './CapturedTray';
import { SetupScreen, StartConfig } from './SetupScreen';
import { initialBoard, DEFAULT_SETUP } from './engine/board';
import { applyMove, legalMovesFor } from './engine/moves';
import { getStatus } from './engine/game';
import { chooseMove, Difficulty } from './engine/ai';
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

  // AI turn. Enforce a minimum "thinking" time so the opponent's move is
  // clearly noticeable after the player moves.
  const MIN_AI_DELAY = 2000; // ms
  useEffect(() => {
    if (phase !== 'playing') return;
    if (gameOver) return;
    if (toMove !== aiSide) return;
    setThinking(true);

    const startedAt = Date.now();
    aiTimer.current = window.setTimeout(() => {
      const move = chooseMove(board, aiSide, difficulty);
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_AI_DELAY - elapsed);
      aiTimer.current = window.setTimeout(() => {
        setThinking(false);
        if (move) doMove(move);
      }, wait);
    }, 60);

    return () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toMove, aiSide, gameOver, phase]);

  const startGame = useCallback((cfg: StartConfig) => {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    const human = cfg.humanSide;
    const humanSetup: SideSetup = cfg.humanSetup;
    const choSetup = human === 'cho' ? humanSetup : DEFAULT_SETUP;
    const hanSetup = human === 'han' ? humanSetup : DEFAULT_SETUP;

    setHumanSide(human);
    setBoard(initialBoard(choSetup, hanSetup));
    setToMove('cho');
    setSelected(null);
    setLastMove(null);
    setThinking(false);
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
