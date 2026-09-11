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

// Silhouette path per piece in the 100x100 space. Kept intentionally clean and
// chunky so it reads at small sizes.
const PATHS: Record<CPieceType, string> = {
  // Pawn: ball head, waisted neck, flared skirt to the base.
  pawn:
    'M50 22 a10 10 0 0 1 5 18 c4 3 6 6 6 10 c-2 2 -4 4 -4 7 c4 4 7 9 8 15 h-30 c1 -6 4 -11 8 -15 c0 -3 -2 -5 -4 -7 c0 -4 2 -7 6 -10 a10 10 0 0 1 5 -18 z',
  // Rook: three crenellations, waisted body, wide foot.
  rook:
    'M33 26 h6 v6 h7 v-6 h8 v6 h7 v-6 h6 v13 l-5 5 v3 h-27 v-3 l-5 -5 z ' +
    'M36 47 h28 l3 24 h-34 z',
  // Knight: horse-head profile facing right (ears, muzzle, jaw, neck).
  knight:
    'M38 72 c-2 -14 2 -22 10 -30 c-3 -1 -6 0 -9 3 c-3 -5 -1 -11 4 -15 c1 -4 3 -8 7 -11 c1 3 1 5 0 7 c4 -3 8 -4 12 -3 c9 3 15 12 16 24 c1 9 1 18 1 25 z',
  // Bishop: pointed mitre with a diagonal slit, round head, collar.
  bishop:
    'M50 20 c9 6 15 15 15 25 c0 6 -3 10 -6 13 c3 3 5 7 6 13 h-30 c1 -6 3 -10 6 -13 c-3 -3 -6 -7 -6 -13 c0 -10 6 -19 15 -25 z',
  // Queen: five-point coronet on a bell body.
  queen:
    'M27 40 a4 4 0 1 0 0.1 0 z M50 30 a4 4 0 1 0 0.1 0 z M73 40 a4 4 0 1 0 0.1 0 z ' +
    'M30 42 l7 16 l6 -22 l7 22 l7 -22 l6 22 l7 -16 l-3 30 h-41 z',
  // King: cross finial on a crowned bell body.
  king:
    'M47 16 h6 v6 h6 v6 h-6 v7 c9 4 15 13 15 23 c0 6 -3 10 -6 14 h-30 c-3 -4 -6 -8 -6 -14 c0 -10 6 -19 15 -23 v-7 h-6 v-6 h6 z',
};

// Base ellipse (the piece stands on it) drawn separately for all types.
export function ChessPiece({ type, side, size, x, y, idPrefix }: Props) {
  const s = size / 100;
  const white = side === 'white';
  const bodyGrad = `${idPrefix}-body`;
  const baseGrad = `${idPrefix}-base`;

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        {/* body: lit from upper-left, darker lower-right for roundness */}
        <radialGradient id={bodyGrad} cx="38%" cy="30%" r="80%">
          {white ? (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#f2ead6" />
              <stop offset="100%" stopColor="#c9b58c" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#6b6b6f" />
              <stop offset="38%" stopColor="#3a3a3e" />
              <stop offset="100%" stopColor="#161618" />
            </>
          )}
        </radialGradient>
        <linearGradient id={baseGrad} x1="0" y1="0" x2="0" y2="1">
          {white ? (
            <>
              <stop offset="0%" stopColor="#f2ead6" />
              <stop offset="100%" stopColor="#b9a377" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#3a3a3e" />
              <stop offset="100%" stopColor="#111113" />
            </>
          )}
        </linearGradient>
      </defs>

      {/* contact shadow on the square */}
      <ellipse cx={50} cy={92} rx={28} ry={6} fill="rgba(0,0,0,0.32)" />

      {/* base plate (two stacked ellipses for a turned-wood look) */}
      <ellipse cx={50} cy={86} rx={26} ry={7.5} fill={`url(#${baseGrad})`} stroke={white ? '#8f7a4f' : '#000'} strokeWidth={1} />
      <rect x={26} y={78} width={48} height={8} fill={`url(#${baseGrad})`} />
      <ellipse cx={50} cy={78} rx={24} ry={6.5} fill={`url(#${baseGrad})`} />

      {/* body silhouette */}
      <path
        d={PATHS[type]}
        fill={`url(#${bodyGrad})`}
        stroke={white ? '#8f7a4f' : '#050506'}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />

      {/* specular highlight, upper-left of the body */}
      <ellipse
        cx={42}
        cy={40}
        rx={7}
        ry={12}
        fill={white ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.16)'}
        transform="rotate(-18 42 40)"
      />
    </g>
  );
}
