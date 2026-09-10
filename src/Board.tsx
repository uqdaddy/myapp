import { Board as BoardState, Move, PieceType, Pos, Side } from './engine/types';
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

// Real Janggi pieces are octagonal wooden discs whose size reflects rank:
// the General is largest, then Chariot/Cannon, then Horse/Elephant, then
// Guard, and the Soldiers are smallest.
const PIECE_RADIUS: Record<PieceType, number> = {
  general: 20,
  chariot: 18,
  cannon: 18,
  horse: 16.5,
  elephant: 16.5,
  guard: 15,
  soldier: 14,
};

// Build the point list for a regular octagon of the given radius, rotated so
// a flat edge sits at the top (like a real Janggi stone).
function octagonPoints(cx: number, cy: number, radius: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    // start at -67.5° so top and bottom are flat edges
    const angle = (Math.PI / 4) * i - Math.PI / 8 - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(' ');
}

export function Board({
  board,
  selected,
  legalTargets,
  lastMove,
  onCellTap,
  humanSide,
}: Props) {
  // When the human plays Han (top side), flip the board 180° so the human's
  // own pieces are always drawn at the bottom of the screen. This is a pure
  // display transform; the underlying board coordinates never change.
  const flipped = humanSide === 'han';

  // Map a LOGICAL board coordinate to a SCREEN pixel position.
  const sx = (c: number) => MARGIN + (flipped ? COLS - 1 - c : c) * GAP;
  const sy = (r: number) => MARGIN + (flipped ? ROWS - 1 - r : r) * GAP;

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
          x1={sx(0)}
          y1={sy(r)}
          x2={sx(COLS - 1)}
          y2={sy(r)}
          className="grid-line"
        />
      ))}
      {/* vertical lines (river gap in the middle for cols 1..7) */}
      {Array.from({ length: COLS }, (_, c) => {
        if (c === 0 || c === COLS - 1) {
          return (
            <line
              key={`v${c}`}
              x1={sx(c)}
              y1={sy(0)}
              x2={sx(c)}
              y2={sy(ROWS - 1)}
              className="grid-line"
            />
          );
        }
        return (
          <g key={`v${c}`}>
            <line x1={sx(c)} y1={sy(0)} x2={sx(c)} y2={sy(4)} className="grid-line" />
            <line x1={sx(c)} y1={sy(5)} x2={sx(c)} y2={sy(ROWS - 1)} className="grid-line" />
          </g>
        );
      })}

      {/* palace diagonals */}
      {[0, 7].map((base) => (
        <g key={`palace${base}`}>
          <line x1={sx(3)} y1={sy(base)} x2={sx(5)} y2={sy(base + 2)} className="grid-line" />
          <line x1={sx(5)} y1={sy(base)} x2={sx(3)} y2={sy(base + 2)} className="grid-line" />
        </g>
      ))}

      {/* last move highlight */}
      {lastMove && (
        <>
          <circle cx={sx(lastMove.from.c)} cy={sy(lastMove.from.r)} r={16} className="last-from" />
          <circle cx={sx(lastMove.to.c)} cy={sy(lastMove.to.r)} r={16} className="last-to" />
        </>
      )}

      {/* legal target dots */}
      {legalTargets.map((m) => (
        <circle
          key={`t${m.to.r}-${m.to.c}`}
          cx={sx(m.to.c)}
          cy={sy(m.to.r)}
          r={m.captured ? 17 : 7}
          className={m.captured ? 'target-capture' : 'target-dot'}
        />
      ))}

      {/* pieces + tap zones (iterate LOGICAL cells; tap passes logical coords) */}
      {board.map((row, r) =>
        row.map((piece, c) => {
          const isSel = selected && selected.r === r && selected.c === c;
          const isTarget = targetSet.has(`${r},${c}`);
          const px = sx(c);
          const py = sy(r);
          return (
            <g
              key={`cell${r}-${c}`}
              onClick={() => onCellTap(r, c)}
              style={{ cursor: 'pointer' }}
            >
              {/* invisible tap area covering the full cell */}
              <rect
                x={px - GAP / 2}
                y={py - GAP / 2}
                width={GAP}
                height={GAP}
                fill="transparent"
              />
              {piece && (() => {
                const rad = PIECE_RADIUS[piece.type];
                const fontSize = rad * 1.15;
                return (
                  <g className={isSel ? 'piece-group selected' : 'piece-group'}>
                    {/* outer bevel ring */}
                    <polygon
                      points={octagonPoints(px, py, rad)}
                      className={`piece-oct piece-${piece.side} ${
                        isSel ? 'piece-selected' : ''
                      }`}
                    />
                    {/* inner engraved ring */}
                    <polygon
                      points={octagonPoints(px, py, rad - 3)}
                      className={`piece-inner inner-${piece.side}`}
                    />
                    <text
                      x={px}
                      y={py}
                      style={{ fontSize }}
                      className={`piece-label label-${piece.side}`}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {PIECE_LABEL[piece.side][piece.type]}
                    </text>
                  </g>
                );
              })()}
              {isTarget && !piece && null}
            </g>
          );
        })
      )}
    </svg>
  );
}
