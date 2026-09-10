import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './Board';
import { SetupScreen, StartConfig } from './SetupScreen';
import { initialBoard, DEFAULT_SETUP } from './engine/board';
import { applyMove, legalMovesFor } from './engine/moves';
import { getStatus } from './engine/game';
import { chooseMove, Difficulty } from './engine/ai';
import { Board as BoardState, Move, Pos, Side, SideSetup, opponent } from './engine/types';

const SIDE_NAME: Record<Side, string> = { cho: '초 (楚)', han: '한 (漢)' };

type Phase = 'setup' | 'playing';

export default function App() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [humanSide, setHumanSide] = useState<Side>('cho');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
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

  // AI turn.
  useEffect(() => {
    if (phase !== 'playing') return;
    if (gameOver) return;
    if (toMove !== aiSide) return;
    setThinking(true);
    aiTimer.current = window.setTimeout(() => {
      const move = chooseMove(board, aiSide, difficulty);
      setThinking(false);
      if (move) doMove(move);
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
    // AI uses the default formation for its own side.
    const choSetup = human === 'cho' ? humanSetup : DEFAULT_SETUP;
    const hanSetup = human === 'han' ? humanSetup : DEFAULT_SETUP;

    setHumanSide(human);
    setDifficulty(cfg.difficulty);
    setBoard(initialBoard(choSetup, hanSetup));
    setToMove('cho'); // Cho always moves first
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

      <div className="game-actions">
        <button className="btn primary" onClick={backToSetup}>
          새 게임
        </button>
      </div>
    </div>
  );
}
