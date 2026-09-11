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
        {/* board surface: light-grey / off-white (black & white theme) */}
        <linearGradient id="gWood" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="50%" stopColor="#ececed" />
          <stop offset="100%" stopColor="#dadade" />
        </linearGradient>
        {/* charcoal frame */}
        <linearGradient id="gBorder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a3e" />
          <stop offset="50%" stopColor="#2a2a2d" />
          <stop offset="100%" stopColor="#161618" />
        </linearGradient>
        {/* fine matte grey texture */}
        <filter id="gGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9 0.9"
            numOctaves={2}
            seed={11}
            stitchTiles="stitch"
            result="n"
          />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0.35
                    0 0 0 0 0.35
                    0 0 0 0 0.38
                    0 0 0 0.06 0"
          />
        </filter>
        <radialGradient id="gVignette" cx="50%" cy="46%" r="72%">
          <stop offset="62%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(20,20,24,0.13)" />
        </radialGradient>

        {/* black stone: glossy with a bright highlight */}
        <radialGradient id="blackStone" cx="36%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#8f8f8f" />
          <stop offset="28%" stopColor="#3a3a3a" />
          <stop offset="70%" stopColor="#141414" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        {/* white stone: neutral pearl with subtle grey shading */}
        <radialGradient id="whiteStone" cx="36%" cy="30%" r="82%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f0f0f2" />
          <stop offset="100%" stopColor="#c9c9cf" />
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
      {/* playing surface + grain + vignette */}
      <rect x={0} y={0} width={W} height={W} rx={3} fill="url(#gWood)" />
      <rect x={0} y={0} width={W} height={W} rx={3} filter="url(#gGrain)" opacity={0.45} />
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
                    stroke={v === 'white' ? 'rgba(150,145,135,0.6)' : 'rgba(0,0,0,0.5)'}
                    strokeWidth={0.6}
                  />
                  {/* broad soft sheen */}
                  <ellipse
                    cx={px - R * 0.26}
                    cy={py - R * 0.3}
                    rx={R * 0.56}
                    ry={R * 0.44}
                    fill={v === 'black' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.4)'}
                  />
                  {/* tight specular highlight */}
                  <ellipse
                    cx={px - R * 0.3}
                    cy={py - R * 0.36}
                    rx={R * 0.3}
                    ry={R * 0.2}
                    fill={v === 'black' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.95)'}
                  />
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

      {/* connecting line through the winning stones */}
      {winningLine && winningLine.length >= 2 && (
        <line
          x1={x(winningLine[0].c)}
          y1={y(winningLine[0].r)}
          x2={x(winningLine[winningLine.length - 1].c)}
          y2={y(winningLine[winningLine.length - 1].r)}
          className="gwin-line"
        />
      )}
    </svg>
  );
}
