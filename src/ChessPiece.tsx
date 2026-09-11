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

// Body (everything above the base) per piece. All symmetric about x=45 except
// the knight (a horse head is inherently a profile).
function Body({ type, fill, stroke, sw }: { type: CPieceType; fill: string; stroke: string; sw: number }) {
  const p = { fill, stroke, strokeWidth: sw, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  switch (type) {
    case 'pawn':
      return (
        <>
          <circle cx={45} cy={28} r={11} {...p} />
          {/* symmetric collar + flared stem */}
          <path d="M35 44 q10 6 20 0 l-3 6 q7 5 8 24 h-30 q1 -19 8 -24 z" {...p} />
        </>
      );
    case 'rook':
      return (
        <>
          {/* crenellated top (4 merlons, symmetric) */}
          <path d="M26 18 h8 v6 h5 v-6 h12 v6 h5 v-6 h8 v14 h-38 z" {...p} />
          {/* neck ring */}
          <path d="M30 32 h30 l-2 7 h-26 z" {...p} />
          {/* flared body */}
          <path d="M32 39 h26 q4 18 8 33 h-42 q4 -15 8 -33 z" {...p} />
        </>
      );
    case 'knight': {
      // Staunton horse head facing left. Outline traced clockwise from the
      // chest (lower left): up the front of the neck, jaw, MUZZLE jutting left,
      // up the nose bridge to the brow, back over the head to a pointed EAR,
      // then down the arched mane (right) to the neck base.
      return (
        <>
          <path
            d="M27 74 C28 63 39 57 43 47
               L36 44 L29 50 L19 46 L20 38 L34 24
               L38 13 L46 21 L52 16 L53 25
               C67 30 73 48 68 74 Z"
            {...p}
          />
          {/* eye */}
          <circle cx={37} cy={33} r={2.2} fill={stroke} />
          <path d="M52 30 C61 39 63 52 59 64 M22 43 L29 44" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          {/* nostril hint on the muzzle */}
          <circle cx={25} cy={39} r={1.3} fill={stroke} />
        </>
      );
    }
    case 'bishop':
      return (
        <>
          {/* top bead */}
          <circle cx={45} cy={14} r={4} {...p} />
          {/* mitre — symmetric teardrop */}
          <path d="M45 18 q13 9 13 26 q0 9 -13 14 q-13 -5 -13 -14 q0 -17 13 -26 z" {...p} />
          {/* diagonal slit */}
          <path d="M41 34 l8 -9" fill="none" stroke={stroke} strokeWidth={sw + 0.4} strokeLinecap="round" />
          {/* collar + body */}
          <path d="M33 58 q12 7 24 0 l-3 14 h-18 z" {...p} />
        </>
      );
    case 'queen':
      return (
        <>
          {/* five symmetric points with beads */}
          {[
            [21, 24],
            [33, 18],
            [45, 15],
            [57, 18],
            [69, 24],
          ].map(([bx, by], i) => (
            <circle key={i} cx={bx} cy={by} r={3.4} {...p} />
          ))}
          {/* crown: symmetric zigzag connecting the five points down to a band */}
          <path
            d="M21 26 L29 40 L33 21 L39 38 L45 18 L51 38 L57 21 L61 40 L69 26 L62 51 L28 51 Z"
            {...p}
          />
          <path d="M29 47 H61 L60 53 H30 Z" {...p} />
          {/* flared body */}
          <path d="M30 51 H60 L56 57 Q55 65 64 74 H26 Q35 65 34 57 Z" {...p} />
        </>
      );
    case 'king':
      return (
        <>
          {/* symmetric cross finial */}
          <path d="M41 6 h8 v6 h6 v7 h-6 v8 h-8 v-8 h-6 v-7 h6 z" {...p} />
          {/* crown shoulders (symmetric) */}
          <path d="M30 30 q15 -7 30 0 l-3 14 h-24 z" {...p} />
          {/* flared body */}
          <path d="M29 44 h32 q3 15 7 28 h-46 q4 -13 7 -28 z" {...p} />
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
  const stroke = white ? '#66533c' : '#bba887';
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
              <stop offset="0%" stopColor="#fffdf6" />
              <stop offset="55%" stopColor="#f3e7cb" />
              <stop offset="100%" stopColor="#cdb98f" />
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
