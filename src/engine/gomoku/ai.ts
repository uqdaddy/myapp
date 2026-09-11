// Gomoku AI: NegaMax + alpha-beta + iterative deepening, restricted to
// candidate cells near existing stones, ordered by a threat heuristic.
// Handles immediate wins/blocks explicitly so it never misses a 5.

import { GBoard, GPos, SIZE, Stone, idx, inBounds, otherStone } from './types';
import { isWinningMove } from './rules';
import { bestThreatAt, evaluateFor, moveThreatScore, SCORE } from './threats';

export type GDifficulty = 'easy' | 'normal' | 'hard';

export const G_DIFFICULTY: Record<
  GDifficulty,
  { depth: number; candidates: number; label: string }
> = {
  // depth = search plies; candidates = max moves examined per node
  easy: { depth: 2, candidates: 8, label: '쉬움' },
  normal: { depth: 4, candidates: 12, label: '보통' },
  hard: { depth: 6, candidates: 10, label: '어려움' },
};

// Candidate moves: empty cells within `radius` of any existing stone. This
// keeps the branching factor small (the whole 15x15 is never searched).
function candidateCells(b: GBoard, radius = 2): GPos[] {
  const seen = new Set<number>();
  const out: GPos[] = [];
  let anyStone = false;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[idx(r, c)] === null) continue;
      anyStone = true;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (!inBounds(rr, cc)) continue;
          const i = idx(rr, cc);
          if (b[i] === null && !seen.has(i)) {
            seen.add(i);
            out.push({ r: rr, c: cc });
          }
        }
      }
    }
  }
  // Empty board: play center.
  if (!anyStone) return [{ r: 7, c: 7 }];
  return out;
}

// Find an immediate winning move for `s`, if any.
function findWinningMove(b: GBoard, cells: GPos[], s: Stone): GPos | null {
  for (const { r, c } of cells) {
    b[idx(r, c)] = s;
    const win = isWinningMove(b, r, c, s);
    b[idx(r, c)] = null;
    if (win) return { r, c };
  }
  return null;
}

// First cell where `s` creates a threat of at least `tier`, or null.
function findThreatMove(b: GBoard, cells: GPos[], s: Stone, tier: number): GPos | null {
  for (const p of cells) {
    if (bestThreatAt(b, p.r, p.c, s) >= tier) return p;
  }
  return null;
}

// Does `opp` currently have a standing threat of at least `tier`? (i.e. can
// they reach it with their NEXT move from the current position).
function oppHasThreat(b: GBoard, cells: GPos[], opp: Stone, tier: number): boolean {
  return findThreatMove(b, cells, opp, tier) !== null;
}

// Candidate BLOCKING cells against `opp`: squares where, if WE (me) play there,
// the opponent can no longer reach `residualTier` on their next move.
//
// The residual tier matters. Blocking a four means: after our move the opponent
// cannot make FIVE (residualTier = FIVE). Blocking an open three means: after
// our move the opponent cannot make an OPEN_FOUR (residualTier = OPEN_FOUR) —
// a leftover simple four is acceptable because we can block that next turn.
function blockingCells(
  b: GBoard,
  cells: GPos[],
  me: Stone,
  opp: Stone,
  residualTier: number
): GPos[] {
  const out: GPos[] = [];
  for (const p of cells) {
    b[idx(p.r, p.c)] = me; // occupy it
    let stillThreat = false;
    const remaining = candidateCells(b);
    for (const q of remaining) {
      if (bestThreatAt(b, q.r, q.c, opp) >= residualTier) {
        stillThreat = true;
        break;
      }
    }
    b[idx(p.r, p.c)] = null;
    if (!stillThreat) out.push(p);
  }
  return out;
}

// Among `cells`, pick the one that maximizes our own combined attack+defense
// value (so a block that also develops our position wins ties).
function pickBest(b: GBoard, cells: GPos[], me: Stone): GPos {
  let best = cells[0];
  let bestScore = -Infinity;
  for (const p of cells) {
    const s = moveThreatScore(b, p.r, p.c, me);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}

// Order candidates by threat score (best first) and cap to `limit`.
function orderCandidates(b: GBoard, cells: GPos[], me: Stone, limit: number): GPos[] {
  const scored = cells.map((p) => ({ p, s: moveThreatScore(b, p.r, p.c, me) }));
  scored.sort((a, z) => z.s - a.s);
  return scored.slice(0, limit).map((x) => x.p);
}

class Timer {
  deadline: number;
  constructor(ms: number) {
    this.deadline = Date.now() + ms;
  }
  up() {
    return Date.now() >= this.deadline;
  }
}
class TimeUp extends Error {}

function negamax(
  b: GBoard,
  toMove: Stone,
  root: Stone,
  depth: number,
  alpha: number,
  beta: number,
  limit: number,
  timer: Timer
): number {
  if (timer.up()) throw new TimeUp();

  const cells = candidateCells(b);
  if (cells.length === 0) return 0; // board full -> draw

  // Immediate win for side to move?
  const winning = findWinningMove(b, cells, toMove);
  if (winning) {
    // Winning now is best; prefer sooner wins via depth bonus.
    const score = SCORE.FIVE + depth;
    return toMove === root ? score : -score;
  }

  if (depth === 0) {
    // Evaluate from the root's perspective, negated appropriately.
    const evalRoot = evaluateFor(b, root);
    return toMove === root ? evalRoot : -evalRoot;
  }

  const ordered = orderCandidates(b, cells, toMove, limit);
  let best = -Infinity;
  for (const { r, c } of ordered) {
    b[idx(r, c)] = toMove;
    const score = -negamax(b, otherStone(toMove), root, depth - 1, -beta, -alpha, limit, timer);
    b[idx(r, c)] = null;
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // prune
  }
  return best;
}

export interface GSearchResult {
  move: GPos | null;
  score: number;
}

// Choose the AI's move. Explicit win/block first, then time-limited iterative
// deepening negamax.
export function chooseGomokuMove(
  b: GBoard,
  me: Stone,
  difficulty: GDifficulty,
  timeMs = 1500
): GSearchResult {
  const cfg = G_DIFFICULTY[difficulty];
  const cells = candidateCells(b);
  if (cells.length === 0) return { move: null, score: 0 };
  if (cells.length === 1) return { move: cells[0], score: 0 };

  // 1) Win immediately if possible.
  const win = findWinningMove(b, cells, me);
  if (win) return { move: win, score: SCORE.FIVE };

  // 2) Block the opponent's immediate win.
  const opp = otherStone(me);
  const oppWin = findWinningMove(b, cells, opp);
  if (oppWin) return { move: oppWin, score: 0 };

  // 2b) If WE can make an open four (a guaranteed win next move), do it.
  const myOpenFour = findThreatMove(b, cells, me, SCORE.OPEN_FOUR);
  if (myOpenFour) return { move: myOpenFour, score: SCORE.OPEN_FOUR };

  // 2c) The opponent has a FOUR threat (one move from five). We must occupy
  //     the completion square so they cannot make five, unless we can make our
  //     own open four/win first (which forces them to answer us instead).
  if (oppHasThreat(b, cells, opp, SCORE.FOUR)) {
    const myOF = findThreatMove(b, cells, me, SCORE.OPEN_FOUR);
    if (myOF) return { move: myOF, score: SCORE.OPEN_FOUR };
    const blocks = blockingCells(b, cells, me, opp, SCORE.FIVE);
    if (blocks.length > 0) return { move: pickBest(b, blocks, me), score: 0 };
  }

  // 2d) The opponent has an OPEN THREE — if ignored it becomes an open four
  //     (a loss). This is exactly the case the user hit: the AI must block the
  //     open three rather than extend its own weaker shape. Blocking one end is
  //     enough (it leaves only a simple, answerable four).
  if (oppHasThreat(b, cells, opp, SCORE.OPEN_THREE)) {
    // Prefer creating our own forcing four (opponent must answer us instead).
    const myFour = findThreatMove(b, cells, me, SCORE.FOUR);
    if (myFour) return { move: myFour, score: SCORE.FOUR };
    const blocks = blockingCells(b, cells, me, opp, SCORE.OPEN_FOUR);
    if (blocks.length > 0) return { move: pickBest(b, blocks, me), score: 0 };
  }

  // 2e) Nobody forcing us: if we can safely make an open three, prefer it.
  const myOpenThree = findThreatMove(b, cells, me, SCORE.OPEN_THREE);
  if (myOpenThree) return { move: myOpenThree, score: SCORE.OPEN_THREE };

  // 3) Iterative deepening search.
  const timer = new Timer(timeMs);
  const ordered = orderCandidates(b, cells, me, cfg.candidates);
  let bestMove: GPos = ordered[0];
  let bestScore = -Infinity;

  try {
    for (let depth = 2; depth <= cfg.depth; depth++) {
      let localBest = -Infinity;
      let localMove = bestMove;
      let alpha = -Infinity;
      const beta = Infinity;
      for (const { r, c } of ordered) {
        b[idx(r, c)] = me;
        const score = -negamax(
          b,
          opp,
          me,
          depth - 1,
          -beta,
          -alpha,
          cfg.candidates,
          timer
        );
        b[idx(r, c)] = null;
        if (score > localBest) {
          localBest = score;
          localMove = { r, c };
        }
        if (score > alpha) alpha = score;
      }
      bestMove = localMove;
      bestScore = localBest;
      if (bestScore >= SCORE.FIVE) break; // found a forced win
      if (timer.up()) break;
    }
  } catch (e) {
    if (!(e instanceof TimeUp)) throw e;
  }

  return { move: bestMove, score: bestScore };
}
