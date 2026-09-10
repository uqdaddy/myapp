// Janggi (Korean Chess) core types.

export type Side = 'cho' | 'han'; // 초(green, bottom) vs 한(red, top)

export type PieceType =
  | 'general' // 장/궁
  | 'guard' // 사
  | 'elephant' // 상
  | 'horse' // 마
  | 'chariot' // 차
  | 'cannon' // 포
  | 'soldier'; // 졸/병

export interface Piece {
  type: PieceType;
  side: Side;
}

// Board is 10 rows (0 = top / Han's back rank) x 9 cols (0 = left).
// null means empty square.
export type Board = (Piece | null)[][];

export interface Pos {
  r: number; // row 0..9
  c: number; // col 0..8
}

export interface Move {
  from: Pos;
  to: Pos;
  // piece captured at destination, if any (for undo / eval)
  captured?: Piece | null;
}

export const ROWS = 10;
export const COLS = 9;

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.r === b.r && a.c === b.c;
}

export function opponent(side: Side): Side {
  return side === 'cho' ? 'han' : 'cho';
}

// Palace columns are always 3..5.
// Han palace rows 0..2 (top), Cho palace rows 7..9 (bottom).
export function inPalace(side: Side, r: number, c: number): boolean {
  if (c < 3 || c > 5) return false;
  if (side === 'han') return r >= 0 && r <= 2;
  return r >= 7 && r <= 9;
}

// Any square inside either palace (used for general/guard bounds check
// is side-specific, but palace diagonal geometry is shared).
export function inAnyPalace(r: number, c: number): boolean {
  if (c < 3 || c > 5) return false;
  return (r >= 0 && r <= 2) || (r >= 7 && r <= 9);
}
