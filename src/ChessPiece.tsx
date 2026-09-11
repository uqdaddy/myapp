import { CPieceType, CSide } from './engine/chess/types';

// Chess pieces rendered as uniform round discs (like Janggi stones) with a
// clear chess symbol inside. This is far more legible at small sizes than
// per-piece silhouettes: the DISC COLOR shows the side (white = ivory disc,
// black = charcoal disc) and the SYMBOL shows the piece type. No stray
// highlight blobs.
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

// Solid (filled) Unicode chess glyphs — one consistent style so all six read
// with the same weight. We color them to contrast the disc.
const GLYPH: Record<CPieceType, string> = {
  king: '\u265A',
  queen: '\u265B',
  rook: '\u265C',
  bishop: '\u265D',
  knight: '\u265E',
  pawn: '\u265F',
};

export function ChessPiece({ type, side, size, x, y, idPrefix }: Props) {
  const s = size / 100;
  const white = side === 'white';
  const faceGrad = `${idPrefix}-face`;
  const rimGrad = `${idPrefix}-rim`;

  // Disc geometry.
  const cx = 50;
  const cy = 49;
  const rim = 40;
  const face = 35;

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        {/* disc face: lit from top-left */}
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
        {/* rim: gives the disc a rounded edge thickness */}
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

      {/* contact shadow */}
      <ellipse cx={cx} cy={cy + rim + 3} rx={rim * 0.82} ry={4.5} fill="rgba(0,0,0,0.28)" />

      {/* rim (edge thickness) */}
      <circle cx={cx} cy={cy} r={rim} fill={`url(#${rimGrad})`} />
      {/* thin seam between rim and face */}
      <circle cx={cx} cy={cy} r={face + 1.4} fill="none" stroke={white ? 'rgba(120,116,104,0.5)' : 'rgba(0,0,0,0.5)'} strokeWidth={0.9} />
      {/* face */}
      <circle
        cx={cx}
        cy={cy}
        r={face}
        fill={`url(#${faceGrad})`}
        stroke={white ? 'rgba(150,146,134,0.5)' : 'rgba(0,0,0,0.4)'}
        strokeWidth={0.6}
      />
      {/* soft top sheen on the face (subtle, no hard hot-spot) */}
      <ellipse
        cx={cx - face * 0.24}
        cy={cy - face * 0.3}
        rx={face * 0.5}
        ry={face * 0.32}
        fill={white ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'}
      />

      {/* chess symbol: contrasts the disc (dark glyph on white disc, light
          glyph on black disc), with a subtle outline for extra separation */}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: face * 1.5 }}
        fill={white ? '#2a2a2e' : '#f2f0ea'}
        stroke={white ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)'}
        strokeWidth={0.6}
        paintOrder="stroke"
      >
        {GLYPH[type]}
      </text>
    </g>
  );
}
