import { Board as BoardState, Move, PieceType, Pos, Side } from './engine/types';
import { PIECE_LABEL } from './pieces';

interface Props {
  board: BoardState;
  selected: Pos | null;
  legalTargets: Move[];
  lastMove: Move | null;
  onCellTap: (r: number, c: number) => void;
  humanSide: Side;
  checkedKing?: Pos | null; // general currently in check -> highlight it
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
  checkedKing,
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
        {/* board surface: clean off-white / light-grey (black & white theme) */}
        <linearGradient id="woodGrad" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="55%" stopColor="#ededf0" />
          <stop offset="100%" stopColor="#dcdce0" />
        </linearGradient>
        {/* charcoal frame */}
        <linearGradient id="woodBorder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a3e" />
          <stop offset="50%" stopColor="#2a2a2d" />
          <stop offset="100%" stopColor="#161618" />
        </linearGradient>
        {/* soft neutral vignette for depth */}
        <radialGradient id="vignette" cx="50%" cy="45%" r="72%">
          <stop offset="58%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(20,20,24,0.14)" />
        </radialGradient>

        {/* fine matte texture on the surface (very subtle grey noise) */}
        <filter id="woodGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9 0.9"
            numOctaves={2}
            seed={7}
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.35
                    0 0 0 0 0.35
                    0 0 0 0 0.38
                    0 0 0 0.06 0"
            result="grain"
          />
        </filter>
        {/* texture for the charcoal border */}
        <filter id="woodGrainBorder" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8 0.8"
            numOctaves={2}
            seed={3}
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.06
                    0 0 0 0 0.06
                    0 0 0 0 0.07
                    0 0 0 0.5 0"
          />
        </filter>

        {/* stone face: bright white-grey, lit from top-left */}
        <radialGradient id="stoneFace" cx="35%" cy="28%" r="82%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#f2f2f4" />
          <stop offset="100%" stopColor="#d3d3d8" />
        </radialGradient>
        {/* grey rim giving each disc a rounded thickness */}
        <linearGradient id="stoneRim" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#e8e8ec" />
          <stop offset="45%" stopColor="#b7b7bd" />
          <stop offset="100%" stopColor="#7c7c82" />
        </linearGradient>
        {/* subtle grey grain on each stone face */}
        <filter id="stoneGrain" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.6 0.4" numOctaves={2} seed={11} result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0.5
                    0 0 0 0 0.5
                    0 0 0 0 0.52
                    0 0 0 0.06 0" />
        </filter>

        <filter id="pieceShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2.4" stdDeviation="1.9" floodColor="#000" floodOpacity="0.4" />
        </filter>
        <filter id="boardShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.45" />
        </filter>
        <filter id="selGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#ffcf5a" floodOpacity="1" />
        </filter>
      </defs>

      {/* wooden outer frame + its grain */}
      <rect
        x={-PAD}
        y={-PAD}
        width={W + PAD * 2}
        height={H + PAD * 2}
        rx={12}
        fill="url(#woodBorder)"
        filter="url(#boardShadow)"
      />
      <rect
        x={-PAD}
        y={-PAD}
        width={W + PAD * 2}
        height={H + PAD * 2}
        rx={12}
        filter="url(#woodGrainBorder)"
        opacity={0.5}
      />
      {/* inner frame bevel */}
      <rect
        x={-PAD / 2}
        y={-PAD / 2}
        width={W + PAD}
        height={H + PAD}
        rx={8}
        fill="none"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={1.5}
      />
      <rect
        x={-PAD / 2 + 1.5}
        y={-PAD / 2 + 1.5}
        width={W + PAD - 3}
        height={H + PAD - 3}
        rx={7}
        fill="none"
        stroke="rgba(255,225,170,0.25)"
        strokeWidth={1}
      />
      {/* playing surface: base colour + procedural grain + vignette */}
      <rect x={0} y={0} width={W} height={H} rx={3} fill="url(#woodGrad)" />
      <rect x={0} y={0} width={W} height={H} rx={3} filter="url(#woodGrain)" opacity={0.55} />
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

      {/* check highlight: pulsing red ring on the general that is in check */}
      {checkedKing && (
        <circle
          cx={sx(checkedKing.c)}
          cy={sy(checkedKing.r)}
          r={22}
          className="check-ring"
        />
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
                  const faceR = rad - 2;
                  return (
                    <g filter={isSel ? 'url(#selGlow)' : 'url(#pieceShadow)'}>
                      {/* wooden rim (edge thickness) */}
                      <polygon points={octagonPoints(px, py, rad)} fill="url(#stoneRim)" />
                      {/* thin dark seam between rim and face for definition */}
                      <polygon
                        points={octagonPoints(px, py, faceR + 0.9)}
                        fill="none"
                        stroke="rgba(70,45,15,0.45)"
                        strokeWidth={0.8}
                      />
                      {/* ivory face slightly inset */}
                      <polygon
                        points={octagonPoints(px, py, faceR)}
                        fill="url(#stoneFace)"
                        className={`piece-oct ${isSel ? 'piece-selected' : ''}`}
                      />
                      {/* subtle wood grain on the face (clipped to the octagon) */}
                      <polygon
                        points={octagonPoints(px, py, faceR)}
                        filter="url(#stoneGrain)"
                        opacity={0.5}
                      />
                      {/* specular sheen highlight, upper-left */}
                      <ellipse
                        cx={px - rad * 0.28}
                        cy={py - rad * 0.34}
                        rx={rad * 0.52}
                        ry={rad * 0.34}
                        fill="rgba(255,255,255,0.45)"
                      />
                      {/* top bevel highlight edge */}
                      <polygon points={octagonPoints(px, py, faceR)} className="piece-edge" />
                      {/* engraved double ring in the side's color */}
                      <polygon
                        points={octagonPoints(px, py, rad - 4.6)}
                        className={`piece-inner inner-${piece.side}`}
                      />
                      {/* engraving highlight: a pale copy offset down-right,
                          so the colored glyph reads as carved into the ivory */}
                      <text
                        x={px + 0.7}
                        y={py + 1.2}
                        style={{ fontSize }}
                        className="piece-label piece-label-emboss"
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {PIECE_LABEL[piece.side][piece.type]}
                      </text>
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
