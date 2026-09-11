import { CPieceType, CSide } from './engine/chess/types';

// Staunton-style chess pieces drawn as clean vector silhouettes (no disc).
// The Staunton SHAPE is standard/uncopyrightable; these paths are our own,
// authored to be symmetric and clearly distinct per rank. White = ivory fill
// with a dark outline; black = charcoal fill with a light outline. Each piece
// stands on a base with a soft contact shadow.
//
// Coordinate space: 0..90 wide, 0..90 tall, centered on x=45, base near y=82.

interface Props {
  type: CPieceType;
  side: CSide;
  size: number; // pixel size of the (square) bounding box
  x: number; // top-left x of the box
  y: number; // top-left y of the box
  idPrefix: string; // unique gradient id namespace (avoid clashes)
}

// A shared base (foot) so every piece sits consistently on the square.
function Base({ fill, stroke, sw }: { fill: string; stroke: string; sw: number }) {
  return (
    <path
      d="M22 82 q-2 -7 7 -8 h32 q9 1 7 8 z"
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinejoin="round"
    />
  );
}

// Body (everything above the base, ~ y 8..74) per piece.
function Body({ type, fill, stroke, sw }: { type: CPieceType; fill: string; stroke: string; sw: number }) {
  const p = { fill, stroke, strokeWidth: sw, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  switch (type) {
    case 'pawn':
      return (
        <>
          <circle cx={45} cy={30} r={11} {...p} />
          <path d="M34 46 q11 7 22 0 q3 16 6 28 h-34 q3 -12 6 -28 z" {...p} />
        </>
      );
    case 'rook':
      return (
        <>
          {/* crenellated top */}
          <path d="M27 20 h7 v6 h6 v-6 h8 v6 h6 v-6 h7 v14 h-40 z" {...p} />
          {/* neck + flared body */}
          <path d="M31 34 h28 l-3 10 q6 6 6 30 h-34 q0 -24 6 -30 z" {...p} />
        </>
      );
    case 'knight':
      // Horse head facing left — one clean silhouette.
      return (
        <path
          d="M55 74 q3 -8 3 -18 q0 -18 -12 -26 q3 -3 3 -8 q-9 1 -15 9 q-5 6 -8 15 q-3 3 -5 9 q3 2 7 0 q-2 5 -6 8 q3 4 9 4 q-3 6 -3 12 q0 6 2 10 z"
          {...p}
        />
      );
    case 'bishop':
      return (
        <>
          {/* top bead */}
          <circle cx={45} cy={16} r={4.5} {...p} />
          {/* mitre */}
          <path d="M45 20 q14 10 12 30 q-3 8 -12 10 q-9 -2 -12 -10 q-2 -20 12 -30 z" {...p} />
          {/* slit */}
          <path d="M45 34 l6 -7" fill="none" stroke={stroke} strokeWidth={sw + 0.6} strokeLinecap="round" />
          {/* collar */}
          <path d="M31 60 q14 8 28 0 l-2 12 h-24 z" {...p} />
        </>
      );
    case 'queen':
      return (
        <>
          {/* five-point crown from a zigzag, with point beads */}
          <circle cx={22} cy={22} r={3.5} {...p} />
          <circle cx={33.5} cy={16} r={3.5} {...p} />
          <circle cx={45} cy={13} r={3.5} {...p} />
          <circle cx={56.5} cy={16} r={3.5} {...p} />
          <circle cx={68} cy={22} r={3.5} {...p} />
          <path
            d="M22 24 l4 18 l7 -22 l5 20 l7 -22 l7 22 l5 -20 l7 22 l4 -18 l-3 26 h-51 z"
            {...p}
          />
          {/* flared body */}
          <path d="M27 50 h36 q3 14 6 22 h-48 q3 -8 6 -22 z" {...p} />
        </>
      );
    case 'king':
      return (
        <>
          {/* cross finial */}
          <path d="M42 8 h6 v6 h6 v6 h-6 v7 h-6 v-7 h-6 v-6 h6 z" {...p} />
          {/* crown / shoulders */}
          <path d="M30 34 q15 -8 30 0 q4 16 6 38 h-42 q2 -22 6 -38 z" {...p} />
          {/* collar band */}
          <path d="M30 48 q15 7 30 0" fill="none" stroke={stroke} strokeWidth={sw} />
        </>
      );
    default:
      return null;
  }
}

export function ChessPiece({ type, side, size, x, y, idPrefix }: Props) {
  const s = size / 90;
  const white = side === 'white';
  const grad = `${idPrefix}-g`;
  const shadow = `${idPrefix}-sh`;
  const fill = `url(#${grad})`;
  const stroke = white ? '#5b5b62' : '#0a0a0e';
  const sw = 2;

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <filter id={shadow} x="-40%" y="-30%" width="180%" height="160%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.4" floodColor="#000" floodOpacity="0.4" />
        </filter>
        <radialGradient id={grad} cx="38%" cy="30%" r="85%">
          {white ? (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#f0eee8" />
              <stop offset="100%" stopColor="#cfcbc0" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#5a5a61" />
              <stop offset="48%" stopColor="#34343b" />
              <stop offset="100%" stopColor="#141418" />
            </>
          )}
        </radialGradient>
      </defs>

      {/* flat contact shadow beneath the base */}
      <ellipse cx={45} cy={85} rx={24} ry={4} fill="rgba(0,0,0,0.26)" />

      <g filter={`url(#${shadow})`}>
        <Body type={type} fill={fill} stroke={stroke} sw={sw} />
        <Base fill={fill} stroke={stroke} sw={sw} />
      </g>
    </g>
  );
}
