import { CPieceType, CSide } from './engine/chess/types';

// Vector chess pieces rendered as SVG paths so both colors are visually
// consistent (same silhouette, only shaded differently) and look 3D — a body
// gradient, a specular highlight, and a contact shadow beneath the base. This
// replaces the flat Unicode glyphs, which rendered with inconsistent weights
// across fonts and looked 2D.
//
// Each piece is drawn in a 0..100 x 0..100 box, standing on a base near y≈88.

interface Props {
  type: CPieceType;
  side: CSide;
  // pixel size of the (square) bounding box
  size: number;
  x: number; // top-left x of the box
  y: number; // top-left y of the box
  idPrefix: string; // unique gradient id namespace (avoid clashes)
}

// Each piece is ONE continuous, left-right symmetric silhouette that includes
// its own base sitting on the ground line (y≈86). Drawing the whole piece as a
// single path (head → body → base) avoids the earlier "top and bottom split"
// look where a separate floating base plate didn't line up with the body.
// All shapes are centered on x=50.
const PATHS: Record<CPieceType, string> = {
  // Pawn: round head, waist, flared skirt, base.
  pawn:
    'M50 20 a9 9 0 0 0 -5 16 c-4 2 -6 6 -4 10 c1 2 3 3 5 4 l-5 20 h-9 v10 h46 v-10 h-9 l-5 -20 c2 -1 4 -2 5 -4 c2 -4 0 -8 -4 -10 a9 9 0 0 0 -5 -16 z',
  // Rook: crenellated top, body, base.
  rook:
    'M32 22 v10 h6 v-5 h6 v5 h6 v-5 h6 v5 h6 v-5 h6 v-10 h-6 v5 h-7 v-5 h-8 v5 h-7 v-5 z ' +
    'M36 34 h28 l-3 34 h6 v12 h-40 v-12 h6 z',
  // Bishop: cross-slit mitre, round head, collar, base.
  bishop:
    'M50 16 c8 6 14 16 14 25 c0 6 -3 10 -7 13 c2 2 4 5 5 9 h-24 c1 -4 3 -7 5 -9 c-4 -3 -7 -7 -7 -13 c0 -9 6 -19 14 -25 z ' +
    'M34 65 h32 v6 h5 v9 h-42 v-9 h5 z',
  // Knight: horse-head profile (symmetric-ish about the body) + base.
  knight:
    'M44 20 c-4 3 -7 8 -8 14 c-4 2 -8 6 -9 12 c3 -2 6 -3 9 -3 c-4 6 -6 12 -6 20 h34 c1 -18 -1 -34 -8 -44 c-2 -3 -5 -6 -12 -8 z ' +
    'M31 65 h38 v6 h5 v9 h-48 v-9 h5 z',
  // Queen: coronet of points, bell body, base.
  queen:
    'M30 30 l5 22 l7 -20 l8 20 l8 -20 l7 20 l5 -22 l-3 34 h-34 z ' +
    'M32 66 h36 v5 h5 v9 h-46 v-9 h5 z',
  // King: cross finial, crowned bell body, base.
  king:
    'M46 14 h8 v6 h6 v7 h-6 v6 c8 4 14 13 14 22 c0 4 -1 7 -3 10 h-30 c-2 -3 -3 -6 -3 -10 c0 -9 6 -18 14 -22 v-6 h-6 v-7 h6 z ' +
    'M32 66 h36 v5 h5 v9 h-46 v-9 h5 z',
};

export function ChessPiece({ type, side, size, x, y, idPrefix }: Props) {
  const s = size / 100;
  const white = side === 'white';
  const bodyGrad = `${idPrefix}-body`;

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        {/* body: lit from upper-left, darker lower-right for roundness */}
        <radialGradient id={bodyGrad} cx="38%" cy="28%" r="85%">
          {white ? (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="48%" stopColor="#f0f0f2" />
              <stop offset="100%" stopColor="#c8c8ce" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#6f6f74" />
              <stop offset="40%" stopColor="#3a3a3e" />
              <stop offset="100%" stopColor="#141416" />
            </>
          )}
        </radialGradient>
      </defs>

      {/* contact shadow on the square, under the base */}
      <ellipse cx={50} cy={84} rx={26} ry={5.5} fill="rgba(0,0,0,0.3)" />

      {/* the whole piece as one continuous silhouette */}
      <path
        d={PATHS[type]}
        fill={`url(#${bodyGrad})`}
        stroke={white ? '#6f6f77' : '#050506'}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* specular highlight, upper-left of the body */}
      <ellipse
        cx={43}
        cy={40}
        rx={6}
        ry={11}
        fill={white ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}
        transform="rotate(-16 43 40)"
      />
    </g>
  );
}
