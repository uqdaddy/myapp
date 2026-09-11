// Gomoku rules: placing stones and detecting a win (five or more in a row).
// Standard freestyle: no forbidden moves, overlines count as a win.

import { GBoard, GPos, SIZE, Stone, idx, inBounds } from './types';

// The four line directions (dr, dc): horizontal, vertical, two diagonals.
export const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

// Count consecutive same-color stones extending from (r,c) in +dir and -dir
// (not counting (r,c) itself twice). Used for win detection at a placed stone.
function lineLength(b: GBoard, r: number, c: number, dr: number, dc: number, s: Stone): number {
  let count = 1;
  // forward
  let rr = r + dr;
  let cc = c + dc;
  while (inBounds(rr, cc) && b[idx(rr, cc)] === s) {
    count++;
    rr += dr;
    cc += dc;
  }
  // backward
  rr = r - dr;
  cc = c - dc;
  while (inBounds(rr, cc) && b[idx(rr, cc)] === s) {
    count++;
    rr -= dr;
    cc -= dc;
  }
  return count;
}

// Does placing (or having) stone `s` at (r,c) complete five-or-more in a row?
export function isWinningMove(b: GBoard, r: number, c: number, s: Stone): boolean {
  for (const [dr, dc] of DIRS) {
    if (lineLength(b, r, c, dr, dc, s) >= 5) return true;
  }
  return false;
}

// Scan the whole board for any existing five-in-a-row of `s` (used for status).
export function hasWon(b: GBoard, s: Stone): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[idx(r, c)] === s && isWinningMove(b, r, c, s)) return true;
    }
  }
  return false;
}

export function isEmpty(b: GBoard, r: number, c: number): boolean {
  return inBounds(r, c) && b[idx(r, c)] === null;
}

export function isFull(b: GBoard): boolean {
  return b.every((v) => v !== null);
}

// Legal moves = all empty intersections.
export function emptyCells(b: GBoard): GPos[] {
  const out: GPos[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[idx(r, c)] === null) out.push({ r, c });
    }
  }
  return out;
}
