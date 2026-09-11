// Threat detection & positional evaluation for Gomoku.
//
// Approach (inspired by strong open-source engines): scan every line through
// each stone in the four directions, classify the shape (five, open/closed
// four, broken four, open three, ...) and assign a score. Evaluation for a
// side = its own pattern value minus a weighted opponent pattern value.

import { GBoard, SIZE, Stone, idx, inBounds, otherStone } from './types';
import { DIRS } from './rules';

// Pattern scores (single stone contributions are aggregated; big numbers for
// decisive shapes so the search prioritizes them).
export const SCORE = {
  FIVE: 10_000_000,
  OPEN_FOUR: 500_000, // _XXXX_  -> unstoppable next move
  FOUR: 50_000, // XXXX with one open end (forces a block)
  OPEN_THREE: 20_000, // _XXX_   -> becomes open four
  THREE: 2_000, // closed three
  OPEN_TWO: 500,
  TWO: 100,
};

// Read a window of `len` cells starting at (r,c) stepping by (dr,dc).
// Returns null if the window runs off the board. Encodes each cell as
// 'x' (our stone), 'o' (opponent), '.' (empty).
function readWindow(
  b: GBoard,
  r: number,
  c: number,
  dr: number,
  dc: number,
  len: number,
  me: Stone
): string | null {
  let s = '';
  for (let i = 0; i < len; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    if (!inBounds(rr, cc)) return null;
    const v = b[idx(rr, cc)];
    s += v === null ? '.' : v === me ? 'x' : 'o';
  }
  return s;
}

// Classify a 6-cell window for `me` and return its score contribution.
// Using 6-cell windows lets us see open ends around a 4/3.
function window6Score(w: string): number {
  // Five in a row (any 5 consecutive x within 6)
  if (w.includes('xxxxx')) return SCORE.FIVE;
  // Open four: .xxxx.
  if (w === '.xxxx.') return SCORE.OPEN_FOUR;
  // Fours (one side blocked or edge) — broken fours included
  if (
    w.includes('xxxx.') ||
    w.includes('.xxxx') ||
    w.includes('xxx.x') ||
    w.includes('xx.xx') ||
    w.includes('x.xxx')
  ) {
    // But if it's the open four we already scored it; here it's a forcing four.
    return SCORE.FOUR;
  }
  // Open three: three that can extend into an open four next move.
  // .xxx. (with room), gapped .x.xx. / .xx.x.
  if (w.includes('.xxx.') || w === '.x.xx.' || w === '.xx.x.') {
    return SCORE.OPEN_THREE;
  }
  // Closed three: xxx with one open end
  if (w.includes('xxx.') || w.includes('.xxx') || w.includes('xx.x') || w.includes('x.xx')) {
    return SCORE.THREE;
  }
  // Open two
  if (w === '.xx...' || w === '..xx..' || w === '...xx.' || w.includes('.xx.')) {
    return SCORE.OPEN_TWO;
  }
  if (w.includes('xx')) return SCORE.TWO;
  return 0;
}

// Evaluate the whole board for `me` (positive = good for me).
// We slide a 6-cell window along every line and sum the best pattern per window.
export function evaluateFor(b: GBoard, me: Stone): number {
  const opp = otherStone(me);
  let mine = 0;
  let theirs = 0;

  const WIN = 6;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      for (const [dr, dc] of DIRS) {
        const wMine = readWindow(b, r, c, dr, dc, WIN, me);
        if (wMine) mine += window6Score(wMine);
        const wOpp = readWindow(b, r, c, dr, dc, WIN, opp);
        if (wOpp) theirs += window6Score(wOpp);
      }
    }
  }
  // Defense weight slightly >1 so the AI reliably blocks losing threats, but
  // not so high that it never attacks.
  return mine - theirs * 1.1;
}

// The immediate tactical value of placing `me` at (r,c): how much it improves
// our position plus how much of the opponent's threat it removes. Used for
// move ordering and quick threat checks.
export function moveThreatScore(b: GBoard, r: number, c: number, me: Stone): number {
  const opp = otherStone(me);
  let attack = 0;
  let defend = 0;
  for (const [dr, dc] of DIRS) {
    // consider windows of 6 that pass through (r,c): start offsets -5..0
    for (let off = -5; off <= 0; off++) {
      const sr = r + dr * off;
      const sc = c + dc * off;
      // attack: pretend we place our stone here
      const wa = readWindowWithPlacement(b, sr, sc, dr, dc, 6, me, r, c, me);
      if (wa) attack += window6Score(wa);
      // defend: pretend opponent places here (value of denying them)
      const wd = readWindowWithPlacement(b, sr, sc, dr, dc, 6, opp, r, c, opp);
      if (wd) defend += window6Score(wd);
    }
  }
  return attack + defend * 1.05;
}

// Like readWindow but treats cell (pr,pc) as if it holds `placed`.
function readWindowWithPlacement(
  b: GBoard,
  r: number,
  c: number,
  dr: number,
  dc: number,
  len: number,
  me: Stone,
  pr: number,
  pc: number,
  placed: Stone
): string | null {
  let s = '';
  for (let i = 0; i < len; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    if (!inBounds(rr, cc)) return null;
    let v: Stone | null;
    if (rr === pr && cc === pc) v = placed;
    else v = b[idx(rr, cc)];
    s += v === null ? '.' : v === me ? 'x' : 'o';
  }
  return s;
}
