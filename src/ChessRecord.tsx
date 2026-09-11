import { useMemo, useState } from 'react';
import { ChessBoard } from './ChessBoard';
import { advanceState, legalMovesFor } from './engine/chess/moves';
import { CGameMove, formatMove } from './engine/chess/notation';
import { CMove, CSide, CState } from './engine/chess/types';

interface Props {
  startState: CState;
  history: CGameMove[];
  humanSide: CSide;
  onClose: () => void;
}

// Chess game record (기보): step through the game move by move on a replay
// board. We re-derive each move object from the recorded from/to/promotion by
// matching against the legal moves of the replayed position (so castling /
// en-passant / promotion replay correctly).
export function ChessRecord({ startState, history, humanSide, onClose }: Props) {
  const [ply, setPly] = useState(history.length);

  const { state, lastMove } = useMemo(() => {
    let s = startState;
    let last: CMove | null = null;
    for (let i = 0; i < ply; i++) {
      const gm = history[i];
      const legal = legalMovesFor(s, gm.from);
      const mv =
        legal.find(
          (m) =>
            m.to.r === gm.to.r &&
            m.to.c === gm.to.c &&
            (gm.promotion ? m.promotion === gm.promotion : true)
        ) ?? null;
      if (!mv) break;
      s = advanceState(s, mv);
      last = mv;
    }
    return { state: s, lastMove: last };
  }, [startState, history, ply]);

  const atStart = ply === 0;
  const atEnd = ply === history.length;

  return (
    <div className="record-overlay">
      <div className="record-panel">
        <div className="record-head">
          <span className="record-title">기보</span>
          <button className="record-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <div className="record-board">
          <ChessBoard
            board={state.board}
            selected={null}
            legalTargets={[]}
            lastMove={lastMove}
            onCellTap={() => {}}
            humanSide={humanSide}
          />
        </div>

        <div className="record-controls">
          <button className="btn" onClick={() => setPly(0)} disabled={atStart}>처음</button>
          <button className="btn" onClick={() => setPly((p) => Math.max(0, p - 1))} disabled={atStart}>◀ 이전</button>
          <span className="record-count">{ply} / {history.length}</span>
          <button className="btn" onClick={() => setPly((p) => Math.min(history.length, p + 1))} disabled={atEnd}>다음 ▶</button>
          <button className="btn" onClick={() => setPly(history.length)} disabled={atEnd}>끝</button>
        </div>

        <ol className="record-list">
          {history.length === 0 && <li className="record-empty">아직 둔 수가 없습니다</li>}
          {history.map((gm, i) => (
            <li
              key={i}
              className={`record-move ${i + 1 === ply ? 'current' : ''} move-${gm.side === 'white' ? 'cho' : 'han'}`}
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
