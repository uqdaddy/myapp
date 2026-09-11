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
        {/* premium hardwood surface: warm honey tones with depth */}
        <linearGradient id="woodGrad" x1="0" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#e7bd82" />
          <stop offset="45%" stopColor="#d8a862" />
          <stop offset="100%" stopColor="#bf8c46" />
        </linearGradient>
        {/* dark walnut frame */}
        <linearGradient id="woodBorder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a4e28" />
          <stop offset="50%" stopColor="#5c3a1c" />
          <stop offset="100%" stopColor="#3c2410" />
        </linearGradient>
        {/* soft warm vignette for depth */}
        <radialGradient id="vignette" cx="50%" cy="44%" r="74%">
          <stop offset="55%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(60,34,8,0.30)" />
        </radialGradient>

        {/* BROAD figure grain: long, low-frequency streaks running lengthwise,
            giving the "cathedral"/plank look of real hardwood. */}
        <filter id="woodGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.055"
            numOctaves={5}
            seed={7}
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.40
                    0 0 0 0 0.25
                    0 0 0 0 0.09
                    0 0 0 0.55 0"
            result="grain"
          />
        </filter>
        {/* FINE grain: tight high-frequency lines for the polished top layer */}
        <filter id="woodGrainFine" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02 0.5"
            numOctaves={3}
            seed={19}
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.32
                    0 0 0 0 0.20
                    0 0 0 0 0.08
                    0 0 0 0.22 0"
          />
        </filter>
        {/* grain for the walnut border, running vertically */}
        <filter id="woodGrainBorder" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.16" numOctaves={3} seed={3} stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix"
            values="0 0 0 0 0.14
                    0 0 0 0 0.08
                    0 0 0 0 0.03
                    0 0 0 0.55 0" />
        </filter>

        {/* IVORY stone face: warm off-white, softly lit — reads as carved bone
            rather than plastic (no single hard highlight). */}
        <radialGradient id="stoneFace" cx="36%" cy="26%" r="84%">
          <stop offset="0%" stopColor="#fffdf6" />
          <stop offset="30%" stopColor="#faf1d8" />
          <stop offset="70%" stopColor="#eeddb4" />
          <stop offset="100%" stopColor="#d8be8a" />
        </radialGradient>
        {/* ivory rim: aged bone edge, darker at the bottom for thickness */}
        <linearGradient id="stoneRim" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#f3e6c4" />
          <stop offset="50%" stopColor="#d3bb88" />
          <stop offset="100%" stopColor="#a88a56" />
        </linearGradient>
        {/* fine ivory grain / mottling on each face */}
        <filter id="stoneGrain" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.35 0.55" numOctaves={2} seed={11} result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0.55
                    0 0 0 0 0.44
                    0 0 0 0 0.22
                    0 0 0 0.08 0" />
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
      {/* playing surface: base wood + broad figure grain + fine grain + vignette */}
      <rect x={0} y={0} width={W} height={H} rx={3} fill="url(#woodGrad)" />
      <rect x={0} y={0} width={W} height={H} rx={3} filter="url(#woodGrain)" opacity={0.5} />
      <rect x={0} y={0} width={W} height={H} rx={3} filter="url(#woodGrainFine)" opacity={0.35} />
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
                      {/* soft diffuse sheen, upper-left — gentle (ivory, not
                          glossy plastic) */}
                      <ellipse
                        cx={px - rad * 0.26}
                        cy={py - rad * 0.32}
                        rx={rad * 0.55}
                        ry={rad * 0.4}
                        fill="rgba(255,252,242,0.32)"
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
