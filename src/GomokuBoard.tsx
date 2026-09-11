import { GBoard, GPos, SIZE, Stone, idx } from './engine/gomoku/types';

interface Props {
  board: GBoard;
  lastMove: GPos | null;
  onCellTap: (r: number, c: number) => void;
  disabled?: boolean;
  winningLine?: GPos[] | null; // the 5+ stones that won — highlighted
}

const MARGIN = 24; // px padding from frame to the outer grid line
const GAP = 30; // px between grid lines
const PAD = 14; // wooden border outside the grid
const W = MARGIN * 2 + GAP * (SIZE - 1);
const R = GAP * 0.46; // stone radius

function x(c: number) {
  return MARGIN + c * GAP;
}
function y(r: number) {
  return MARGIN + r * GAP;
}

// Traditional star points (화점) on a 15x15 board.
const STARS: [number, number][] = [
  [3, 3],
  [3, 11],
  [11, 3],
  [11, 11],
  [7, 7],
];

export function GomokuBoard({ board, lastMove, onCellTap, disabled, winningLine }: Props) {
  const winSet = new Set((winningLine ?? []).map((p) => idx(p.r, p.c)));
  return (
    <svg
      className="gboard"
      viewBox={`${-PAD} ${-PAD} ${W + PAD * 2} ${W + PAD * 2}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="오목판"
    >
      <defs>
        {/* premium hardwood surface: warm honey tones (like a fine goban) */}
        <linearGradient id="gWood" x1="0" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#ecc98d" />
          <stop offset="48%" stopColor="#deb673" />
          <stop offset="100%" stopColor="#c99a52" />
        </linearGradient>
        {/* dark walnut frame */}
        <linearGradient id="gBorder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a4e28" />
          <stop offset="50%" stopColor="#5c3a1c" />
          <stop offset="100%" stopColor="#3c2410" />
        </linearGradient>
        {/* broad figure grain */}
        <filter id="gGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.05"
            numOctaves={5}
            seed={11}
            stitchTiles="stitch"
            result="n"
          />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0.42
                    0 0 0 0 0.27
                    0 0 0 0 0.10
                    0 0 0 0.5 0"
          />
        </filter>
        {/* fine grain for the polished top layer */}
        <filter id="gGrainFine" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.5" numOctaves={3} seed={23} stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0.34
                    0 0 0 0 0.22
                    0 0 0 0 0.09
                    0 0 0 0.2 0" />
        </filter>
        <radialGradient id="gVignette" cx="50%" cy="46%" r="72%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(60,34,8,0.28)" />
        </radialGradient>

        {/* black stone: glossy with a bright highlight */}
        <radialGradient id="blackStone" cx="36%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#8f8f8f" />
          <stop offset="28%" stopColor="#3a3a3a" />
          <stop offset="70%" stopColor="#141414" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        {/* A single smooth surface keeps the white stone clean and round. */}
        <radialGradient id="whiteStone" cx="36%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="48%" stopColor="#fafbfc" />
          <stop offset="80%" stopColor="#e8ecef" />
          <stop offset="100%" stopColor="#cbd2d7" />
        </radialGradient>

        <filter id="gStoneShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.4" floodColor="#000" floodOpacity="0.45" />
        </filter>
        <filter id="gBoardShadow" x="-12%" y="-12%" width="124%" height="124%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
        </filter>
        <filter id="gWinGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff3b30" floodOpacity="1" />
        </filter>
      </defs>

      {/* wooden frame */}
      <rect
        x={-PAD}
        y={-PAD}
        width={W + PAD * 2}
        height={W + PAD * 2}
        rx={10}
        fill="url(#gBorder)"
        filter="url(#gBoardShadow)"
      />
      {/* inner frame bevel: dark groove + bright inner edge */}
      <rect
        x={-PAD / 2}
        y={-PAD / 2}
        width={W + PAD}
        height={W + PAD}
        rx={7}
        fill="none"
        stroke="rgba(0,0,0,0.32)"
        strokeWidth={1.5}
      />
      <rect
        x={-PAD / 2 + 1.5}
        y={-PAD / 2 + 1.5}
        width={W + PAD - 3}
        height={W + PAD - 3}
        rx={6}
        fill="none"
        stroke="rgba(255,228,175,0.28)"
        strokeWidth={1}
      />
      {/* playing surface: base wood + broad grain + fine grain + vignette */}
      <rect x={0} y={0} width={W} height={W} rx={3} fill="url(#gWood)" />
      <rect x={0} y={0} width={W} height={W} rx={3} filter="url(#gGrain)" opacity={0.42} />
      <rect x={0} y={0} width={W} height={W} rx={3} filter="url(#gGrainFine)" opacity={0.32} />
      <rect x={0} y={0} width={W} height={W} rx={3} fill="url(#gVignette)" />

      {/* grid lines */}
      {Array.from({ length: SIZE }, (_, i) => (
        <g key={`l${i}`}>
          <line x1={x(0)} y1={y(i)} x2={x(SIZE - 1)} y2={y(i)} className="gline" />
          <line x1={x(i)} y1={y(0)} x2={x(i)} y2={y(SIZE - 1)} className="gline" />
        </g>
      ))}

      {/* star points */}
      {STARS.map(([r, c], i) => (
        <circle key={`s${i}`} cx={x(c)} cy={y(r)} r={4} className="gstar" />
      ))}

      {/* stones + tap zones */}
      {Array.from({ length: SIZE }, (_, r) =>
        Array.from({ length: SIZE }, (_, c) => {
          const v: Stone | null = board[idx(r, c)];
          const isLast = lastMove && lastMove.r === r && lastMove.c === c;
          const px = x(c);
          const py = y(r);
          return (
            <g
              key={`c${r}-${c}`}
              onClick={() => !disabled && onCellTap(r, c)}
              style={{ cursor: disabled ? 'default' : 'pointer' }}
            >
              <rect x={px - GAP / 2} y={py - GAP / 2} width={GAP} height={GAP} fill="transparent" />
              {v && (
                <g filter="url(#gStoneShadow)">
                  {/* stone body */}
                  <circle
                    cx={px}
                    cy={py}
                    r={R}
                    fill={v === 'black' ? 'url(#blackStone)' : 'url(#whiteStone)'}
                    stroke={v === 'white' ? 'rgba(105,119,128,0.65)' : 'rgba(0,0,0,0.5)'}
                    strokeWidth={0.6}
                  />
                  {v === 'black' && <>
                  {/* broad soft sheen */}
                  <ellipse
                    cx={px - R * 0.26}
                    cy={py - R * 0.3}
                    rx={R * 0.56}
                    ry={R * 0.44}
                    fill="rgba(255,255,255,0.14)"
                  />
                  {/* tight specular highlight */}
                  <ellipse
                    cx={px - R * 0.3}
                    cy={py - R * 0.36}
                    rx={R * 0.3}
                    ry={R * 0.2}
                    fill="rgba(255,255,255,0.6)"
                  />
                  </>}
                  {isLast && !winSet.has(idx(r, c)) && (
                    <circle
                      cx={px}
                      cy={py}
                      r={3.6}
                      className={`glast ${v === 'black' ? 'on-black' : 'on-white'}`}
                    />
                  )}
                  {winSet.has(idx(r, c)) && (
                    <circle cx={px} cy={py} r={R + 1} className="gwin-ring" filter="url(#gWinGlow)" />
                  )}
                </g>
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}
