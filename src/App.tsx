import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './Board';
import { initialBoard } from './engine/board';
import {
  allLegalMoves,
  applyMove,
  legalMovesFor,
} from './engine/moves';
import { getStatus } from './engine/game';
import { chooseMove, Difficulty } from './engine/ai';
import { Board as BoardState, Move, Pos, Side, opponent } from './engine/types';

const SIDE_NAME: Record<Side, string> = { cho: '초 (楚)', han: '한 (漢)' };

export default function App() {
  const [humanSide, setHumanSide] = useState<Side>('cho');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [board, setBoard] = useState<BoardState>(() => initialBoard());
  const [toMove, setToMove] = useState<Side>('cho'); // Cho (bottom) moves first
  const [selected, setSelected] = useState<Pos | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState<
    { board: BoardState; toMove: Side; lastMove: Move | null }[]
  >([]);

  const status = useMemo(() => getStatus(board, toMove), [board, toMove]);
  const gameOver = status.kind !== 'playing';

  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return legalMovesFor(board, selected);
  }, [board, selected]);

  const aiSide = opponent(humanSide);

  const doMove = useCallback(
    (move: Move) => {
      setHistory((h) => [...h, { board, toMove, lastMove }]);
      const next = applyMove(board, move);
      setBoard(next);
      setLastMove(move);
      setSelected(null);
      setToMove((s) => opponent(s));
    },
    [board, toMove, lastMove]
  );

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
        // tapping own another piece re-selects; otherwise deselect
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
  const aiTimer = useRef<number | null>(null);
  useEffect(() => {
    if (gameOver) return;
    if (toMove !== aiSide) return;
    setThinking(true);
    // defer so the UI can paint the "thinking" state
    aiTimer.current = window.setTimeout(() => {
      const move = chooseMove(board, aiSide, difficulty);
      setThinking(false);
      if (move) doMove(move);
    }, 60);
    return () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toMove, aiSide, gameOver]);

  const newGame = useCallback(
    (side: Side, diff: Difficulty) => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
      setHumanSide(side);
      setDifficulty(diff);
      setBoard(initialBoard());
      setToMove('cho');
      setSelected(null);
      setLastMove(null);
      setThinking(false);
      setHistory([]);
    },
    []
  );

  const undo = useCallback(() => {
    // undo back to the human's previous turn (undo AI move + human move)
    setHistory((h) => {
      if (h.length === 0) return h;
      let target = h.length - 1;
      // step back until it's the human's turn again (or start)
      const prevList = [...h];
      let snap = prevList[target];
      // if it's AI's move next after restore, go one more back
      while (target > 0 && snap.toMove !== humanSide) {
        target--;
        snap = prevList[target];
      }
      setBoard(snap.board);
      setToMove(snap.toMove);
      setLastMove(snap.lastMove);
      setSelected(null);
      setThinking(false);
      return prevList.slice(0, target);
    });
  }, [humanSide]);

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

  const moveCount = allLegalMoves(board, toMove).length;

  const inCheck = status.kind === 'playing' && status.check;

  return (
    <div className="app">
      <header className="topbar">
        <h1>장기 · Janggi</h1>
        <div className={`status ${inCheck ? 'status-check' : ''}`}>
          {thinking ? 'AI가 생각하는 중…' : statusText}
        </div>
      </header>

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

      <div className="controls">
        <div className="control-row">
          <label>내 진영</label>
          <div className="segmented">
            <button
              className={humanSide === 'cho' ? 'active' : ''}
              onClick={() => newGame('cho', difficulty)}
            >
              초 (선공)
            </button>
            <button
              className={humanSide === 'han' ? 'active' : ''}
              onClick={() => newGame('han', difficulty)}
            >
              한 (후공)
            </button>
          </div>
        </div>

        <div className="control-row">
          <label>난이도</label>
          <div className="segmented">
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                className={difficulty === d ? 'active' : ''}
                onClick={() => newGame(humanSide, d)}
              >
                {d === 'easy' ? '쉬움' : d === 'normal' ? '보통' : '어려움'}
              </button>
            ))}
          </div>
        </div>

        <div className="control-row buttons">
          <button className="btn" onClick={() => newGame(humanSide, difficulty)}>
            새 게임
          </button>
          <button
            className="btn"
            onClick={undo}
            disabled={history.length === 0 || thinking}
          >
            무르기
          </button>
        </div>

        {gameOver && (
          <div className="control-row">
            <button className="btn primary" onClick={() => newGame(humanSide, difficulty)}>
              다시 시작
            </button>
          </div>
        )}
        {!gameOver && moveCount === 0 && null}
      </div>

      <footer className="footer">
        서버 없이 브라우저에서 실행 · 홈 화면에 추가하면 앱처럼 쓸 수 있어요
      </footer>
    </div>
  );
}
