import { Board as BoardState, Move, Pos, Side } from './engine/types';
import { PIECE_LABEL } from './pieces';

interface Props {
  board: BoardState;
  selected: Pos | null;
  legalTargets: Move[];
  lastMove: Move | null;
  onCellTap: (r: number, c: number) => void;
  humanSide: Side;
}

// The board is drawn as an SVG grid. Pieces sit on the intersections
// (9 columns x 10 rows of points => 8 x 9 cells).
const COLS = 9;
const ROWS = 10;
const MARGIN = 26; // px around the grid
const GAP = 40; // px between grid lines

const W = MARGIN * 2 + GAP * (COLS - 1);
const H = MARGIN * 2 + GAP * (ROWS - 1);

function x(c: number) {
  return MARGIN + c * GAP;
}
function y(r: number) {
  return MARGIN + r * GAP;
}

export function Board({
  board,
  selected,
  legalTargets,
  lastMove,
  onCellTap,
  humanSide,
}: Props) {
  const targetSet = new Set(legalTargets.map((m) => `${m.to.r},${m.to.c}`));

  return (
    <svg
      className="board"
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="장기판"
    >
      {/* wood background */}
      <rect x={0} y={0} width={W} height={H} rx={8} className="board-bg" />

      {/* horizontal lines */}
      {Array.from({ length: ROWS }, (_, r) => (
        <line
          key={`h${r}`}
          x1={x(0)}
          y1={y(r)}
          x2={x(COLS - 1)}
          y2={y(r)}
          className="grid-line"
        />
      ))}
      {/* vertical lines (river gap in the middle for cols 1..7) */}
      {Array.from({ length: COLS }, (_, c) => {
        if (c === 0 || c === COLS - 1) {
          return (
            <line
              key={`v${c}`}
              x1={x(c)}
              y1={y(0)}
              x2={x(c)}
              y2={y(ROWS - 1)}
              className="grid-line"
            />
          );
        }
        return (
          <g key={`v${c}`}>
            <line x1={x(c)} y1={y(0)} x2={x(c)} y2={y(4)} className="grid-line" />
            <line x1={x(c)} y1={y(5)} x2={x(c)} y2={y(ROWS - 1)} className="grid-line" />
          </g>
        );
      })}

      {/* palace diagonals */}
      {[0, 7].map((base) => (
        <g key={`palace${base}`}>
          <line x1={x(3)} y1={y(base)} x2={x(5)} y2={y(base + 2)} className="grid-line" />
          <line x1={x(5)} y1={y(base)} x2={x(3)} y2={y(base + 2)} className="grid-line" />
        </g>
      ))}

      {/* last move highlight */}
      {lastMove && (
        <>
          <circle cx={x(lastMove.from.c)} cy={y(lastMove.from.r)} r={16} className="last-from" />
          <circle cx={x(lastMove.to.c)} cy={y(lastMove.to.r)} r={16} className="last-to" />
        </>
      )}

      {/* legal target dots */}
      {legalTargets.map((m) => (
        <circle
          key={`t${m.to.r}-${m.to.c}`}
          cx={x(m.to.c)}
          cy={y(m.to.r)}
          r={m.captured ? 17 : 7}
          className={m.captured ? 'target-capture' : 'target-dot'}
        />
      ))}

      {/* pieces + tap zones */}
      {board.map((row, r) =>
        row.map((piece, c) => {
          const isSel = selected && selected.r === r && selected.c === c;
          const isTarget = targetSet.has(`${r},${c}`);
          return (
            <g
              key={`cell${r}-${c}`}
              onClick={() => onCellTap(r, c)}
              style={{ cursor: 'pointer' }}
            >
              {/* invisible tap area covering the full cell */}
              <rect
                x={x(c) - GAP / 2}
                y={y(r) - GAP / 2}
                width={GAP}
                height={GAP}
                fill="transparent"
              />
              {piece && (
                <g>
                  <circle
                    cx={x(c)}
                    cy={y(r)}
                    r={17}
                    className={`piece piece-${piece.side} ${isSel ? 'piece-selected' : ''}`}
                  />
                  <text
                    x={x(c)}
                    y={y(r)}
                    className={`piece-label label-${piece.side}`}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {PIECE_LABEL[piece.side][piece.type]}
                  </text>
                </g>
              )}
              {isTarget && !piece && null}
            </g>
          );
        })
      )}

      {/* side hint markers */}
      <text x={x(0)} y={y(0) - 14} className="side-hint">
        {humanSide === 'han' ? '' : '한(漢)'}
      </text>
    </svg>
  );
}
