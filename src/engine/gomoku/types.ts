// Gomoku (오목) core types. Standard freestyle rules on a 15x15 board.

export const SIZE = 15;

// A stone color. Black (흑) moves first.
export type Stone = 'black' | 'white';

// null = empty intersection. Board[r][c], r,c in 0..14.
export type GBoard = (Stone | null)[];

export interface GPos {
  r: number;
  c: number;
}

export function idx(r: number, c: number): number {
  return r * SIZE + c;
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

export function otherStone(s: Stone): Stone {
  return s === 'black' ? 'white' : 'black';
}

export function emptyBoard(): GBoard {
  return new Array(SIZE * SIZE).fill(null);
}

export function cloneBoard(b: GBoard): GBoard {
  return b.slice();
}
