import { CPieceType, CSide } from './engine/chess/types';

interface Props {
  type: CPieceType;
  side: CSide;
  size: number;
  x: number;
  y: number;
  idPrefix: string;
}

// Rounded, flat vector pieces, drawn in a shared 90 × 90 coordinate space.
// All frontal silhouettes are symmetric; the knight uses a horse profile.
export function ChessPiece({ type, side, size, x, y }: Props) {
  const white = side === 'white';
  const fill = white ? '#d8e5ec' : '#60615f';
  const stroke = white ? '#98afbb' : '#414340';
  const shine = white ? '#ffffff' : '#898b88';
  const shape = { fill, stroke: white ? stroke : fill, strokeWidth: 3.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const line = { fill: 'none', stroke, strokeWidth: 3.5, strokeLinecap: 'round' as const };

  return (
    <g transform={`translate(${x} ${y}) scale(${size / 90})`}>
      <ellipse cx={45} cy={76} rx={type === 'pawn' ? 23 : 25} ry={12} fill="#182028" opacity={0.17} />
      {type === 'pawn' && <>
        <path d="M35 42 C33 52 24 59 24 68 C24 86 66 86 66 68 C66 59 57 52 55 42 Z" {...shape} />
        <path d="M37 45 Q45 50 53 45" {...line} />
        <circle cx={45} cy={31} r={16} {...shape} />
        <circle cx={41} cy={27} r={6} fill={shine} />
      </>}
      {type === 'rook' && <>
        <path d="M24 51 L24 69 C24 87 66 87 66 69 L66 51 Z" {...shape} />
        <path d="M18 30 Q18 20 26 16 L31 25 L34 24 L34 14 Q45 11 56 14 L56 24 L59 25 L64 16 Q72 20 72 30 L72 47 C72 67 18 67 18 47 Z" {...shape} />
        <ellipse cx={45} cy={35} rx={15} ry={8} fill={stroke} />
        <path d="M23 27 L23 37 M38 18 L51 18 M66 27 L66 37" fill="none" stroke={shine} strokeWidth={7} strokeLinecap="round" />
        <path d="M33 43 Q45 46 57 43" fill="none" stroke={shine} strokeWidth={7} strokeLinecap="round" />
      </>}
      {type === 'knight' && <>
        <path d="M28 50 L24 65 C18 86 70 88 70 69 L70 29 Q70 12 46 15 L36 17 L26 11 Q23 18 26 27 L14 40 Q10 46 17 53 Q22 57 29 52 L35 47 Q48 57 58 49" {...shape} />
        <path d="M29 22 L36 26 Q50 19 63 26" fill="none" stroke={shine} strokeWidth={7} strokeLinecap="round" />
        <path d="M16 43 L28 32" fill="none" stroke={shine} strokeWidth={8} strokeLinecap="round" />
        <path d="M41 35 L41 39" {...line} strokeWidth={6} />
        <path d="M35 51 Q48 60 59 51" {...line} />
      </>}
      {type === 'bishop' && <>
        <ellipse cx={45} cy={70} rx={18} ry={12} fill={stroke} />
        <path d="M43 20 C36 32 18 42 18 55 C18 83 72 83 72 55 Q72 46 66 40 L51 50 L59 32 L48 20 Z" {...shape} />
        <path d="M29 46 L41 31" fill="none" stroke={shine} strokeWidth={8} strokeLinecap="round" />
        <ellipse cx={45} cy={15} rx={7} ry={6} {...shape} />
      </>}
      {type === 'queen' && <>
        <ellipse cx={45} cy={71} rx={18} ry={12} fill={stroke} />
        <path d="M28 32 L23 32 L23 19 Q23 15 28 18 L36 22 L45 12 L54 22 L62 18 Q67 15 67 19 L67 32 L62 32 Z" fill={white ? shine : stroke} stroke={white ? stroke : '#414340'} strokeWidth={3.2} strokeLinejoin="round" />
        <path d="M9 32 Q27 28 45 33 Q63 28 81 32 C67 44 62 55 62 69 C62 83 28 83 28 69 C28 55 23 44 9 32 Z" {...shape} />
        <path d="M24 36 Q45 22 66 36 L56 44 L45 36 L34 44 Z" fill={shine} />
        <path d="M40 64 L45 61 L50 64 L50 71 L45 74 L40 71 Z" fill={shine} />
      </>}
      {type === 'king' && <>
        <ellipse cx={45} cy={71} rx={18} ry={12} fill={stroke} />
        <path d="M45 27 C27 19 11 27 10 41 C8 55 23 61 30 73 Q45 87 60 73 C67 61 82 55 80 41 C79 27 63 19 45 27 Z" {...shape} />
        <path d="M32 66 Q37 61 45 68 Q53 61 58 66" fill="none" stroke={shine} strokeWidth={11} strokeLinecap="round" />
        <rect x={30} y={28} width={30} height={15} rx={5} fill={shine} />
        <path d="M41 11 H49 V18 H56 V26 H49 V33 H41 V26 H34 V18 H41 Z" fill={white ? shine : stroke} stroke={stroke} strokeWidth={3.2} strokeLinejoin="round" />
      </>}
    </g>
  );
}
