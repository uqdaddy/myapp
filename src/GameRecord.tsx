import { useMemo, useState } from 'react';
import { Board } from './Board';
import { applyMove } from './engine/moves';
import { GameMove, formatMove } from './engine/notation';
import { Board as BoardState, Move, Side } from './engine/types';

interface Props {
  startBoard: BoardState;
  history: GameMove[];
  humanSide: Side;
  onClose: () => void;
}

// Game record (기보): shows the move list and lets the user step through the
// game one move at a time on a replay board.
export function GameRecord({ startBoard, history, humanSide, onClose }: Props) {
  // ply = number of moves applied (0 = starting position, history.length = end)
  const [ply, setPly] = useState(history.length);

  // Board state after `ply` moves, and the last move for highlighting.
  const { board, lastMove } = useMemo(() => {
    let b = startBoard;
    let last: Move | null = null;
    for (let i = 0; i < ply; i++) {
      const gm = history[i];
      const mv: Move = { from: gm.from, to: gm.to };
      b = applyMove(b, mv);
      last = mv;
    }
    return { board: b, lastMove: last };
  }, [startBoard, history, ply]);

  const atStart = ply === 0;
  const atEnd = ply === history.length;

  return (
    <div className="record-overlay">
      <div className="record-panel">
        <div className="record-head">
          <span className="record-title">기보</span>
          <button className="record-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="record-board">
          <Board
            board={board}
            selected={null}
            legalTargets={[]}
            lastMove={lastMove}
            onCellTap={() => {}}
            humanSide={humanSide}
          />
        </div>

        <div className="record-controls">
          <button className="btn" onClick={() => setPly(0)} disabled={atStart}>
            처음
          </button>
          <button className="btn" onClick={() => setPly((p) => Math.max(0, p - 1))} disabled={atStart}>
            ◀ 이전
          </button>
          <span className="record-count">
            {ply} / {history.length}
          </span>
          <button
            className="btn"
            onClick={() => setPly((p) => Math.min(history.length, p + 1))}
            disabled={atEnd}
          >
            다음 ▶
          </button>
          <button className="btn" onClick={() => setPly(history.length)} disabled={atEnd}>
            끝
          </button>
        </div>

        <ol className="record-list">
          {history.length === 0 && <li className="record-empty">아직 둔 수가 없습니다</li>}
          {history.map((gm, i) => (
            <li
              key={i}
              className={`record-move ${i + 1 === ply ? 'current' : ''} move-${gm.side}`}
              onClick={() => setPly(i + 1)}
            >
              <span className="record-no">{i + 1}.</span> {formatMove(gm)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
