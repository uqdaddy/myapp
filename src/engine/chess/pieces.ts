import { CPieceType } from './types';

// We render both colors using the SOLID (filled) Unicode chess glyphs, then
// color them via fill + outline stroke. This gives a clean two-tone set where
// white pieces are light with a dark outline and black pieces are dark with a
// light outline — far more legible at small sizes than mixing outline/solid
// glyphs (♔ vs ♚), which render with inconsistent weights across fonts.
export const CHESS_GLYPH: Record<CPieceType, string> = {
  king: '\u265A', // ♚
  queen: '\u265B', // ♛
  rook: '\u265C', // ♜
  bishop: '\u265D', // ♝
  knight: '\u265E', // ♞
  pawn: '\u265F', // ♟
};

// Korean names for the game record.
export const CHESS_PIECE_KO: Record<CPieceType, string> = {
  king: '킹',
  queen: '퀸',
  rook: '룩',
  bishop: '비숍',
  knight: '나이트',
  pawn: '폰',
};
