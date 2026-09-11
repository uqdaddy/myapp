import { CPieceType } from './types';

// Chess pieces are drawn as SVG vector shapes (see ChessPiece.tsx), not glyphs,
// so both colors share one silhouette and look 3D. This module now only holds
// the Korean piece names used in the game record.

// Korean names for the game record.
export const CHESS_PIECE_KO: Record<CPieceType, string> = {
  king: '킹',
  queen: '퀸',
  rook: '룩',
  bishop: '비숍',
  knight: '나이트',
  pawn: '폰',
};
