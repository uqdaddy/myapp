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

const COLS = 9;
const ROWS = 10;
const MARGIN = 32; // px around the grid
const GAP = 42; // px between grid lines
const PAD = 16; // wood border outside the play grid

const W = MARGIN * 2 + GAP * (COLS - 1);
const H = MARGIN * 2 + GAP * (ROWS - 1);

// Piece sizes reflect rank: General largest, then Chariot/Cannon, Horse/
// Elephant, Guard, Soldier smallest.
const PIECE_RADIUS: Record<PieceType, number> = {
  general: 21,
  chariot: 19,
  cannon: 19,
  horse: 17,
  elephant: 17,
  guard: 15.5,
  soldier: 14.5,
};

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
        {/* board wood surface */}
        <linearGradient id="woodGrad" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#eec488" />
          <stop offset="40%" stopColor="#e0ad68" />
          <stop offset="100%" stopColor="#c98f49" />
        </linearGradient>
        <linearGradient id="woodBorder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a5a2c" />
          <stop offset="50%" stopColor="#6e451f" />
          <stop offset="100%" stopColor="#4f3013" />
        </linearGradient>
        {/* soft vignette to give the surface depth */}
        <radialGradient id="vignette" cx="50%" cy="45%" r="72%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(60,35,10,0.28)" />
        </radialGradient>

        {/* ivory stone face, lit from top-left */}
        <radialGradient id="stoneFace" cx="36%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fff6e2" />
          <stop offset="55%" stopColor="#f0dfb8" />
          <stop offset="100%" stopColor="#cdb079" />
        </radialGradient>
        {/* thin rim for the wooden edge of the disc */}
        <linearGradient id="stoneRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8be8a" />
          <stop offset="100%" stopColor="#9c7c46" />
        </linearGradient>

        <filter id="pieceShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2.2" stdDeviation="1.8" floodColor="#000" floodOpacity="0.5" />
        </filter>
        <filter id="boardShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.45" />
        </filter>
        <filter id="selGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#ffcf5a" floodOpacity="1" />
        </filter>
      </defs>

      {/* wooden outer frame */}
      <rect
        x={-PAD}
        y={-PAD}
        width={W + PAD * 2}
        height={H + PAD * 2}
        rx={12}
        fill="url(#woodBorder)"
        filter="url(#boardShadow)"
      />
      {/* inner frame line */}
      <rect
        x={-PAD / 2}
        y={-PAD / 2}
        width={W + PAD}
        height={H + PAD}
        rx={8}
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={1}
      />
      {/* playing surface */}
      <rect x={0} y={0} width={W} height={H} rx={3} fill="url(#woodGrad)" />
      <rect x={0} y={0} width={W} height={H} rx={3} fill="url(#vignette)" />

      {/* ALL horizontal lines (10 rows), full width */}
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

      {/* ALL vertical lines (9 cols), full height — no river gaps */}
      {Array.from({ length: COLS }, (_, c) => (
        <line
          key={`v${c}`}
          x1={sx(c)}
          y1={sy(0)}
          x2={sx(c)}
          y2={sy(ROWS - 1)}
          className="grid-line"
        />
      ))}

      {/* palace diagonals (both palaces) */}
      {[0, 7].map((base) => (
        <g key={`palace${base}`}>
          <line x1={sx(3)} y1={sy(base)} x2={sx(5)} y2={sy(base + 2)} className="grid-line" />
          <line x1={sx(5)} y1={sy(base)} x2={sx(3)} y2={sy(base + 2)} className="grid-line" />
        </g>
      ))}

      {/* last move highlight */}
      {lastMove && (
        <>
          <circle cx={sx(lastMove.from.c)} cy={sy(lastMove.from.r)} r={17} className="last-from" />
          <circle cx={sx(lastMove.to.c)} cy={sy(lastMove.to.r)} r={17} className="last-to" />
        </>
      )}

      {/* legal target markers */}
      {legalTargets.map((m) => (
        <circle
          key={`t${m.to.r}-${m.to.c}`}
          cx={sx(m.to.c)}
          cy={sy(m.to.r)}
          r={m.captured ? 18 : 7}
          className={m.captured ? 'target-capture' : 'target-dot'}
        />
      ))}

      {/* pieces + tap zones (iterate LOGICAL cells) */}
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
                  const fontSize = rad * 1.18;
                  return (
                    <g filter={isSel ? 'url(#selGlow)' : 'url(#pieceShadow)'}>
                      {/* wooden rim */}
                      <polygon points={octagonPoints(px, py, rad)} fill="url(#stoneRim)" />
                      {/* ivory face slightly inset */}
                      <polygon
                        points={octagonPoints(px, py, rad - 2)}
                        fill="url(#stoneFace)"
                        className={`piece-oct ${isSel ? 'piece-selected' : ''}`}
                      />
                      {/* top bevel highlight */}
                      <polygon points={octagonPoints(px, py, rad - 2)} className="piece-edge" />
                      {/* engraved ring in the side's color */}
                      <polygon
                        points={octagonPoints(px, py, rad - 4.6)}
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
