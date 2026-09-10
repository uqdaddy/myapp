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
const MARGIN = 30; // px around the grid
const GAP = 40; // px between grid lines
const PAD = 12; // wood border outside the play grid

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
  const flipped = humanSide === 'han';
  const sx = (c: number) => MARGIN + (flipped ? COLS - 1 - c : c) * GAP;
  const sy = (r: number) => MARGIN + (flipped ? ROWS - 1 - r : r) * GAP;

  return (
    <svg
      className="board"
      viewBox={`${-PAD} ${-PAD} ${W + PAD * 2} ${H + PAD * 2}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="장기판"
    >
      <defs>
        {/* wood grain gradient for the board */}
        <linearGradient id="woodGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e6bd82" />
          <stop offset="45%" stopColor="#d8a862" />
          <stop offset="100%" stopColor="#c28f4d" />
        </linearGradient>
        <linearGradient id="woodBorder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a4f24" />
          <stop offset="100%" stopColor="#5c3a18" />
        </linearGradient>
        {/* subtle grain streaks */}
        <linearGradient id="grain" x1="0" y1="0" x2="1" y2="0.15">
          <stop offset="0%" stopColor="rgba(120,80,30,0)" />
          <stop offset="50%" stopColor="rgba(120,80,30,0.10)" />
          <stop offset="100%" stopColor="rgba(120,80,30,0)" />
        </linearGradient>

        {/* ivory stone face gradient (radial, lit from top-left) */}
        <radialGradient id="stoneCho" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#fdf3dc" />
          <stop offset="60%" stopColor="#eeddb6" />
          <stop offset="100%" stopColor="#d9c193" />
        </radialGradient>
        <radialGradient id="stoneHan" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#fdf3dc" />
          <stop offset="60%" stopColor="#eeddb6" />
          <stop offset="100%" stopColor="#d9c193" />
        </radialGradient>

        <filter id="pieceShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.8" floodColor="#000" floodOpacity="0.45" />
        </filter>
        <filter id="boardShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* wooden border frame */}
      <rect
        x={-PAD}
        y={-PAD}
        width={W + PAD * 2}
        height={H + PAD * 2}
        rx={10}
        fill="url(#woodBorder)"
        filter="url(#boardShadow)"
      />
      {/* playing surface */}
      <rect x={0} y={0} width={W} height={H} rx={4} fill="url(#woodGrad)" />
      {/* faint grain streaks */}
      {Array.from({ length: 6 }, (_, i) => (
        <rect
          key={`grain${i}`}
          x={0}
          y={(H / 6) * i + 6}
          width={W}
          height={10}
          fill="url(#grain)"
        />
      ))}

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

      {/* vertical lines: outer columns and the CENTER column run fully;
          the other inner columns are broken by the river (강). */}
      {Array.from({ length: COLS }, (_, c) => {
        const full = c === 0 || c === COLS - 1 || c === 4;
        if (full) {
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
              {piece &&
                (() => {
                  const rad = PIECE_RADIUS[piece.type];
                  const fontSize = rad * 1.15;
                  return (
                    <g
                      className={isSel ? 'piece-group selected' : 'piece-group'}
                      filter="url(#pieceShadow)"
                    >
                      {/* stone body */}
                      <polygon
                        points={octagonPoints(px, py, rad)}
                        fill={piece.side === 'cho' ? 'url(#stoneCho)' : 'url(#stoneHan)'}
                        className={`piece-oct ${isSel ? 'piece-selected' : ''}`}
                      />
                      {/* outer edge line */}
                      <polygon
                        points={octagonPoints(px, py, rad - 0.6)}
                        className="piece-edge"
                      />
                      {/* engraved ring in the side's color */}
                      <polygon
                        points={octagonPoints(px, py, rad - 3.2)}
                        className={`piece-inner inner-${piece.side}`}
                      />
                      <text
                        x={px}
                        y={py + 0.5}
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
            </g>
          );
        })
      )}
    </svg>
  );
}
