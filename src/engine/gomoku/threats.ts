// Threat detection & positional evaluation for Gomoku.
//
// The board is scanned line by line (each of the 4 directions, each line
// visited once). Along every line we look at each stone-run of `me` together
// with how many empty cells sit immediately on each side, and classify it:
//   open four  (_XXXX_)      -> essentially a win
//   four       (XXXX with 1 open end, or a split like XX_XX / X_XXX)
//   open three (_XXX_ that can become an open four)
//   three      (blocked / closed three)
//   open two / two
//
// Each shape is counted ONCE (no overlapping-window double counting), which is
// what makes the evaluation trustworthy: an opponent open three now clearly
// outweighs the AI turning its own open two into an open three.

import { GBoard, SIZE, Stone, idx, inBounds, otherStone } from './types';
import { DIRS } from './rules';

// Pattern scores. Big gaps between tiers so a higher threat always dominates
// any number of lower ones.
export const SCORE = {
  FIVE: 10_000_000,
  OPEN_FOUR: 500_000, // _XXXX_  -> unstoppable
  FOUR: 40_000, // one open end -> forces a block
  OPEN_THREE: 15_000, // _XXX_ -> becomes an open four if not blocked
  THREE: 1_000, // closed three
  OPEN_TWO: 400,
  TWO: 80,
};

// A single line of the board as an array of cells for `me`: 1 = my stone,
// -1 = opponent, 0 = empty. Lines shorter than 5 can be skipped.
function lineCells(b: GBoard, r0: number, c0: number, dr: number, dc: number, me: Stone): number[] {
  const opp = otherStone(me);
  const out: number[] = [];
  let r = r0;
  let c = c0;
  while (inBounds(r, c)) {
    const v = b[idx(r, c)];
    out.push(v === null ? 0 : v === me ? 1 : v === opp ? -1 : 0);
    r += dr;
    c += dc;
  }
  return out;
}

// Convert a numeric line (1/0/-1) into a string: '1' my stone, '0' empty,
// '2' opponent-or-wall (a hard block). Wall cells are added at both ends so
// patterns never run off the board silently.
function lineToStr(line: number[]): string {
  let s = '2'; // leading wall
  for (const v of line) s += v === 1 ? '1' : v === 0 ? '0' : '2';
  s += '2'; // trailing wall
  return s;
}

// Ordered pattern table (strongest first). Each pattern is matched against the
// walled line string; the FIRST (strongest) matching tier for the whole line
// determines that line's score. This avoids double counting: a line yields the
// value of its single best shape rather than the sum of overlapping windows.
//
// '1' = my stone, '0' = empty. We test the strongest shapes first and return
// immediately, so e.g. an open four is never also counted as a plain four.
const PATTERNS: { res: string[]; score: number }[] = [
  { res: ['11111'], score: SCORE.FIVE },
  { res: ['011110'], score: SCORE.OPEN_FOUR },
  // Simple/broken fours: one move away from five, at least one open side.
  {
    res: ['011112', '211110', '11011', '10111', '11101', '0111010', '0101110'],
    score: SCORE.FOUR,
  },
  // Open threes: can become an open four next move.
  { res: ['011100', '001110', '010110', '011010'], score: SCORE.OPEN_THREE },
  // Closed threes.
  { res: ['211100', '001112', '11100', '00111', '210111', '111012'], score: SCORE.THREE },
  // Open twos.
  { res: ['001100', '011000', '000110', '010100', '001010'], score: SCORE.OPEN_TWO },
  // Plain twos.
  { res: ['11000', '00011', '01100'], score: SCORE.TWO },
];

// Score one line as the value of its single strongest pattern (counted once).
function scoreLine(line: number[]): number {
  const s = lineToStr(line);
  for (const { res, score } of PATTERNS) {
    for (const p of res) {
      if (s.includes(p)) return score;
    }
  }
  return 0;
}

// Enumerate the starting cells of every distinct line for a direction so each
// line is scanned exactly once.
function lineStarts(dr: number, dc: number): [number, number][] {
  const starts: [number, number][] = [];
  if (dr === 0 && dc === 1) {
    for (let r = 0; r < SIZE; r++) starts.push([r, 0]);
  } else if (dr === 1 && dc === 0) {
    for (let c = 0; c < SIZE; c++) starts.push([0, c]);
  } else if (dr === 1 && dc === 1) {
    for (let c = 0; c < SIZE; c++) starts.push([0, c]);
    for (let r = 1; r < SIZE; r++) starts.push([r, 0]);
  } else if (dr === 1 && dc === -1) {
    for (let c = 0; c < SIZE; c++) starts.push([0, c]);
    for (let r = 1; r < SIZE; r++) starts.push([r, SIZE - 1]);
  }
  return starts;
}

// Evaluate the whole board for `me` (positive = good for me).
export function evaluateFor(b: GBoard, me: Stone): number {
  const opp = otherStone(me);
  let mine = 0;
  let theirs = 0;
  for (const [dr, dc] of DIRS) {
    for (const [r0, c0] of lineStarts(dr, dc)) {
      const lm = lineCells(b, r0, c0, dr, dc, me);
      if (lm.length >= 5) mine += scoreLine(lm);
      const lo = lineCells(b, r0, c0, dr, dc, opp);
      if (lo.length >= 5) theirs += scoreLine(lo);
    }
  }
  // Defense weighted slightly above attack so the AI reliably blocks.
  return mine - theirs * 1.15;
}

// Classify the single strongest threat `me` would create by playing (r,c).
// Returns one of the SCORE tiers (or 0). Used for forcing-move logic and
// move ordering. This looks only at lines through (r,c), so it's cheap.
export function bestThreatAt(b: GBoard, r: number, c: number, me: Stone): number {
  let best = 0;
  b[idx(r, c)] = me;
  for (const [dr, dc] of DIRS) {
    // Build the local line spanning far enough to see open ends (r,c +/- 5).
    const cells: number[] = [];
    for (let k = -5; k <= 5; k++) {
      const rr = r + dr * k;
      const cc = c + dc * k;
      if (!inBounds(rr, cc)) {
        cells.push(-1); // off-board acts like a block
        continue;
      }
      const v = b[idx(rr, cc)];
      cells.push(v === null ? 0 : v === me ? 1 : -1);
    }
    const s = scoreLine(cells);
    if (s > best) best = s;
  }
  b[idx(r, c)] = null;
  return best;
}

// The tactical value of playing (r,c): our best threat created + the value of
// denying the opponent's best threat at the same square. Used for ordering.
export function moveThreatScore(b: GBoard, r: number, c: number, me: Stone): number {
  const opp = otherStone(me);
  const attack = bestThreatAt(b, r, c, me);
  const defend = bestThreatAt(b, r, c, opp);
  return attack + defend * 1.1;
}
