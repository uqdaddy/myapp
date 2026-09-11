import { CPieceType, CSide } from './engine/chess/types';

// Chess pieces rendered as uniform round discs (like Janggi stones) with a
// large, clear chess symbol inside. The DISC COLOR shows the side (white =
// ivory disc, black = charcoal disc); the SYMBOL shows the piece type. The
// symbol scales per piece (pawn smallest, queen/king largest) so ranks are
// distinguishable at a glance. The disc lies flat with a soft drop shadow
// directly beneath it (no upright "standing" shadow).
//
// Drawn in a 0..100 box; the disc is centered at (50,50).

interface Props {
  type: CPieceType;
  side: CSide;
  size: number; // pixel size of the (square) bounding box
  x: number; // top-left x of the box
  y: number; // top-left y of the box
  idPrefix: string; // unique gradient id namespace (avoid clashes)
}

const GLYPH: Record<CPieceType, string> = {
  king: '\u265A',
  queen: '\u265B',
  rook: '\u265C',
  bishop: '\u265D',
  knight: '\u265E',
  pawn: '\u265F',
};

// Symbol size relative to the disc face, by rank. Bigger = more important.
const GLYPH_SCALE: Record<CPieceType, number> = {
  king: 2.0,
  queen: 2.0,
  rook: 1.7,
  bishop: 1.75,
  knight: 1.75,
  pawn: 1.35,
};

export function ChessPiece({ type, side, size, x, y, idPrefix }: Props) {
  const s = size / 100;
  const white = side === 'white';
  const faceGrad = `${idPrefix}-face`;
  const rimGrad = `${idPrefix}-rim`;
  const shadow = `${idPrefix}-sh`;

  // Disc geometry (flat, centered).
  const cx = 50;
  const cy = 50;
  const rim = 42;
  const face = 37;

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        {/* soft round drop shadow directly beneath the flat disc */}
        <filter id={shadow} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.2" floodColor="#000" floodOpacity="0.42" />
        </filter>
        <radialGradient id={faceGrad} cx="36%" cy="30%" r="80%">
          {white ? (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#f1efe9" />
              <stop offset="100%" stopColor="#d8d4ca" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#54545a" />
              <stop offset="55%" stopColor="#33333a" />
              <stop offset="100%" stopColor="#1a1a1e" />
            </>
          )}
        </radialGradient>
        <linearGradient id={rimGrad} x1="0.2" y1="0" x2="0.8" y2="1">
          {white ? (
            <>
              <stop offset="0%" stopColor="#eceae3" />
              <stop offset="50%" stopColor="#c7c3b8" />
              <stop offset="100%" stopColor="#98948a" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#45454b" />
              <stop offset="50%" stopColor="#2a2a30" />
              <stop offset="100%" stopColor="#0e0e12" />
            </>
          )}
        </linearGradient>
      </defs>

      {/* disc = rim + face, with the shadow applied to the whole disc group */}
      <g filter={`url(#${shadow})`}>
        <circle cx={cx} cy={cy} r={rim} fill={`url(#${rimGrad})`} />
        <circle
          cx={cx}
          cy={cy}
          r={face + 1.4}
          fill="none"
          stroke={white ? 'rgba(120,116,104,0.5)' : 'rgba(0,0,0,0.5)'}
          strokeWidth={0.9}
        />
        <circle
          cx={cx}
          cy={cy}
          r={face}
          fill={`url(#${faceGrad})`}
          stroke={white ? 'rgba(150,146,134,0.5)' : 'rgba(0,0,0,0.4)'}
          strokeWidth={0.6}
        />
      </g>

      {/* soft top sheen (subtle, no hard hot-spot) */}
      <ellipse
        cx={cx - face * 0.24}
        cy={cy - face * 0.32}
        rx={face * 0.48}
        ry={face * 0.3}
        fill={white ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.1)'}
      />

      {/* LARGE chess symbol, sized per rank; contrasts the disc */}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: face * GLYPH_SCALE[type] }}
        fill={white ? '#23232a' : '#f4f2ec'}
        stroke={white ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)'}
        strokeWidth={0.5}
        paintOrder="stroke"
      >
        {GLYPH[type]}
      </text>
    </g>
  );
}
