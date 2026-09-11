import { CPieceType, CSide } from './engine/chess/types';

// Vector chess pieces composed from simple primitives (ellipses, rounded
// rects, polygons) rather than one hand-authored path. This keeps every piece
// symmetric and undistorted, makes each type clearly distinguishable, and lets
// them share consistent 3D shading (body gradient + specular highlight +
// contact shadow). Drawn in a 0..100 x 0..100 box, centered on x=50, standing
// on a base at y≈84.

interface Props {
  type: CPieceType;
  side: CSide;
  size: number; // pixel size of the (square) bounding box
  x: number; // top-left x of the box
  y: number; // top-left y of the box
  idPrefix: string; // unique gradient id namespace (avoid clashes)
}

// Shared base + collar drawn under every piece so they sit consistently.
function Base({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      {/* wide foot */}
      <path
        d="M28 84 q-2 -8 6 -9 h32 q8 1 6 9 z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {/* small collar disc above the foot */}
      <ellipse cx={50} cy={74} rx={16} ry={4.5} fill={fill} stroke={stroke} strokeWidth={1.2} />
    </>
  );
}

// Per-piece body shapes (everything ABOVE the shared base at y≈74).
function Body({ type, fill, stroke }: { type: CPieceType; fill: string; stroke: string }) {
  const common = { fill, stroke, strokeWidth: 1.4, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'pawn':
      return (
        <>
          <path d="M42 74 q-3 -14 8 -20 q11 6 8 20 z" {...common} />
          <circle cx={50} cy={44} r={10} {...common} />
        </>
      );
    case 'rook':
      return (
        <>
          {/* body taper */}
          <path d="M40 74 l-2 -26 h24 l-2 26 z" {...common} />
          {/* crenellated top */}
          <path
            d="M34 48 v-14 h6 v6 h6 v-6 h8 v6 h6 v-6 h6 v14 z"
            {...common}
          />
        </>
      );
    case 'bishop':
      return (
        <>
          <path d="M40 74 q-4 -12 10 -16 q14 4 10 16 z" {...common} />
          {/* mitre */}
          <path d="M50 24 q13 10 10 26 q-10 6 -20 0 q-3 -16 10 -26 z" {...common} />
          {/* top bead */}
          <circle cx={50} cy={22} r={3.6} {...common} />
          {/* slit */}
          <path d="M50 40 l5 -6" fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
        </>
      );
    case 'knight':
      return (
        // Horse-head profile facing left; single clean polygon.
        <path
          d="M58 74 q4 -20 0 -32 q-3 -10 -13 -12 q1 -4 4 -6 q-8 1 -12 8 q-4 5 -5 12 q-3 3 -4 8 q3 1 6 -1 q1 6 -2 10 q4 3 9 3 q-2 5 -1 10 z"
          {...common}
        />
      );
    case 'queen':
      return (
        <>
          <path d="M38 74 l-3 -22 h30 l-3 22 z" {...common} />
          {/* crown: five points via a zigzag */}
          <path
            d="M35 52 l-4 -22 l9 12 l6 -16 l6 16 l9 -12 l-4 22 z"
            {...common}
          />
          {/* point beads */}
          <circle cx={31} cy={28} r={3} {...common} />
          <circle cx={50} cy={24} r={3} {...common} />
          <circle cx={69} cy={28} r={3} {...common} />
        </>
      );
    case 'king':
      return (
        <>
          <path d="M38 74 l-3 -22 h30 l-3 22 z" {...common} />
          {/* crown band */}
          <path d="M34 52 q16 -8 32 0 l-3 -12 h-26 z" {...common} />
          {/* cross */}
          <path d="M46 30 h8 v-6 h-8 z M44 22 h12 v5 h-12 z" {...common} />
        </>
      );
    default:
      return null;
  }
}

export function ChessPiece({ type, side, size, x, y, idPrefix }: Props) {
  const s = size / 100;
  const white = side === 'white';
  const grad = `${idPrefix}-body`;
  const fill = `url(#${grad})`;
  const stroke = white ? '#6f6f77' : '#0a0a0c';

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <radialGradient id={grad} cx="38%" cy="30%" r="85%">
          {white ? (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#eeeef0" />
              <stop offset="100%" stopColor="#c6c6cc" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#71717a" />
              <stop offset="45%" stopColor="#3a3a40" />
              <stop offset="100%" stopColor="#141418" />
            </>
          )}
        </radialGradient>
      </defs>

      {/* contact shadow under the base */}
      <ellipse cx={50} cy={85} rx={25} ry={5} fill="rgba(0,0,0,0.28)" />

      <Body type={type} fill={fill} stroke={stroke} />
      <Base fill={fill} stroke={stroke} />

      {/* specular highlight (upper-left) for a rounded, 3D feel */}
      <ellipse
        cx={43}
        cy={40}
        rx={5.5}
        ry={10}
        fill={white ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.14)'}
        transform="rotate(-16 43 40)"
      />
    </g>
  );
}
