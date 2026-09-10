import { Board, Move, PieceType, Side, opponent } from './types';
import { allLegalMoves, applyMove, isInCheck } from './moves';

// ---------------------------------------------------------------------------
// Material values, tuned to reflect real Janggi piece strength.
// (Chariot strongest, then Cannon, Horse, Elephant/Guard, Soldier.)
// ---------------------------------------------------------------------------
const VALUES: Record<PieceType, number> = {
  general: 1_000_000,
  chariot: 130,
  cannon: 80,
  horse: 52,
  elephant: 34,
  guard: 32,
  soldier: 18,
};

// ---------------------------------------------------------------------------
// Piece-square tables. Values are from Han's perspective looking at the board
// as stored (row 0 = Han's back rank, row 9 = Cho's back rank). For Cho we
// mirror the row. Encourages sensible development, central control, and
// advancing soldiers toward the enemy palace.
// Each table is 10 rows x 9 cols.
// ---------------------------------------------------------------------------
const ZERO_ROW = [0, 0, 0, 0, 0, 0, 0, 0, 0];

const PST_SOLDIER: number[][] = [
  ZERO_ROW,
  ZERO_ROW,
  ZERO_ROW,
  ZERO_ROW,
  [2, 3, 4, 5, 6, 5, 4, 3, 2], // just crossed the river
  [4, 6, 8, 10, 12, 10, 8, 6, 4],
  [6, 8, 10, 13, 15, 13, 10, 8, 6],
  [8, 10, 12, 15, 18, 15, 12, 10, 8],
  [8, 10, 12, 16, 20, 16, 12, 10, 8], // deep in enemy palace area
  [6, 8, 10, 14, 18, 14, 10, 8, 6],
];

// Horses like the middle files and being active off the back rank.
const PST_HORSE: number[][] = [
  [-6, -2, 0, 2, 2, 2, 0, -2, -6],
  [-2, 2, 6, 8, 8, 8, 6, 2, -2],
  [0, 6, 10, 12, 12, 12, 10, 6, 0],
  [2, 8, 12, 14, 14, 14, 12, 8, 2],
  [2, 8, 12, 14, 14, 14, 12, 8, 2],
  [2, 8, 12, 14, 14, 14, 12, 8, 2],
  [2, 8, 12, 14, 14, 14, 12, 8, 2],
  [0, 6, 10, 12, 12, 12, 10, 6, 0],
  [-2, 2, 6, 8, 8, 8, 6, 2, -2],
  [-6, -2, 0, 2, 2, 2, 0, -2, -6],
];

// Chariots value open files and central control.
const PST_CHARIOT: number[][] = [
  [4, 4, 4, 6, 6, 6, 4, 4, 4],
  [6, 6, 6, 8, 8, 8, 6, 6, 6],
  [6, 6, 8, 10, 10, 10, 8, 6, 6],
  [6, 8, 10, 12, 12, 12, 10, 8, 6],
  [6, 8, 10, 12, 12, 12, 10, 8, 6],
  [6, 8, 10, 12, 12, 12, 10, 8, 6],
  [6, 8, 10, 12, 12, 12, 10, 8, 6],
  [6, 6, 8, 10, 10, 10, 8, 6, 6],
  [6, 6, 6, 8, 8, 8, 6, 6, 6],
  [4, 4, 4, 6, 6, 6, 4, 4, 4],
];

// Cannons like central files and staying behind a screen.
const PST_CANNON: number[][] = [
  [2, 2, 4, 4, 4, 4, 4, 2, 2],
  [2, 4, 6, 6, 6, 6, 6, 4, 2],
  [4, 6, 8, 8, 8, 8, 8, 6, 4],
  [4, 6, 8, 10, 10, 10, 8, 6, 4],
  [4, 6, 8, 10, 10, 10, 8, 6, 4],
  [4, 6, 8, 10, 10, 10, 8, 6, 4],
  [4, 6, 8, 10, 10, 10, 8, 6, 4],
  [4, 6, 8, 8, 8, 8, 8, 6, 4],
  [2, 4, 6, 6, 6, 6, 6, 4, 2],
  [2, 2, 4, 4, 4, 4, 4, 2, 2],
];

function pstValue(type: PieceType, side: Side, r: number, c: number): number {
  // Tables are indexed from Han's viewpoint (row 0 top). Mirror rows for Cho.
  const row = side === 'han' ? r : 9 - r;
  switch (type) {
    case 'soldier':
      return PST_SOLDIER[row][c];
    case 'horse':
      return PST_HORSE[row][c];
    case 'chariot':
      return PST_CHARIOT[row][c];
    case 'cannon':
      return PST_CANNON[row][c];
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Static evaluation from the perspective of `side` (positive = good for side).
// ---------------------------------------------------------------------------
function evaluate(board: Board, side: Side): number {
  let score = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = VALUES[p.type] + pstValue(p.type, p.side, r, c);
      score += p.side === side ? val : -val;
    }
  }
  // Being in check is bad; giving check is mildly good.
  if (isInCheck(board, side)) score -= 30;
  if (isInCheck(board, opponent(side))) score += 20;
  return score;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

function depthFor(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 2;
    case 'normal':
      return 3;
    case 'hard':
      return 4;
  }
}

// Order moves: winning captures first (MVV-LVA style), then the rest.
// Better ordering => more alpha-beta cutoffs => deeper effective search.
function orderMoves(board: Board, moves: Move[]): Move[] {
  return [...moves].sort((a, b) => scoreMove(board, b) - scoreMove(board, a));
}

function scoreMove(board: Board, m: Move): number {
  if (!m.captured) return 0;
  const victim = VALUES[m.captured.type];
  const attacker = board[m.from.r][m.from.c];
  const attackerVal = attacker ? VALUES[attacker.type] : 0;
  // Most Valuable Victim - Least Valuable Attacker.
  return victim * 10 - attackerVal;
}

// ---------------------------------------------------------------------------
// Quiescence search: at the leaves, keep resolving captures so the engine
// doesn't stop mid-exchange and think it just won material for free. This is
// the single biggest fix for "AI gives pieces away" behaviour.
// ---------------------------------------------------------------------------
function quiescence(
  board: Board,
  side: Side,
  alpha: number,
  beta: number,
  qdepth: number
): number {
  const standPat = evaluate(board, side);
  if (qdepth === 0) return standPat;
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  const captures = allLegalMoves(board, side).filter((m) => m.captured);
  for (const move of orderMoves(board, captures)) {
    const next = applyMove(board, move);
    const score = -quiescence(next, opponent(side), -beta, -alpha, qdepth - 1);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// ---------------------------------------------------------------------------
// Root move selection with time-limited iterative deepening. Searches as deep
// as the time budget allows, so play is strong but never freezes for long.
// ---------------------------------------------------------------------------
// Thrown to abort a search that has exceeded its time budget.
class TimeUp extends Error {}

export interface SearchOptions {
  maxDepth?: number; // hard cap on iterative deepening
  timeMs?: number; // soft time budget; stop deepening once exceeded
}

export function chooseMove(
  board: Board,
  side: Side,
  difficulty: Difficulty,
  opts: SearchOptions = {}
): Move | null {
  const capDepth = opts.maxDepth ?? depthFor(difficulty);
  const timeMs = opts.timeMs ?? Infinity;
  const deadline = Date.now() + timeMs;

  const rootMoves = allLegalMoves(board, side);
  if (rootMoves.length === 0) return null;

  let bestMove: Move = rootMoves[0];
  let bestNearTop: Move[] = [bestMove];

  // Iterative deepening: search depth 1, 2, ... using the previous depth's
  // best move to order the root, and stop when the time budget is spent. The
  // deepest COMPLETED iteration provides the move we actually play.
  for (let depth = 1; depth <= capDepth; depth++) {
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    const ordered = orderMoves(board, rootMoves);
    const idx = ordered.indexOf(bestMove);
    if (idx > 0) {
      ordered.splice(idx, 1);
      ordered.unshift(bestMove);
    }

    const candidates: { move: Move; score: number }[] = [];
    let aborted = false;
    try {
      for (const move of ordered) {
        const next = applyMove(board, move);
        const score = -negamaxTimed(
          next,
          opponent(side),
          depth - 1,
          -beta,
          -alpha,
          deadline
        );
        candidates.push({ move, score });
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
        if (score > alpha) alpha = score;
      }
    } catch (e) {
      if (e instanceof TimeUp) {
        aborted = true;
      } else {
        throw e;
      }
    }

    if (aborted) break; // keep the best move from the last completed depth

    bestNearTop = candidates
      .filter((c) => c.score >= bestScore - 1)
      .map((c) => c.move);

    if (Date.now() >= deadline) break;
  }

  // Small random tie-break among near-best moves for natural variety.
  return bestNearTop[Math.floor(Math.random() * bestNearTop.length)];
}

// Time-aware negamax used at the root's iterative deepening.
function negamaxTimed(
  board: Board,
  side: Side,
  depth: number,
  alpha: number,
  beta: number,
  deadline: number
): number {
  if (Date.now() >= deadline) throw new TimeUp();
  if (depth === 0) {
    return quiescence(board, side, alpha, beta, 4);
  }
  const moves = allLegalMoves(board, side);
  if (moves.length === 0) {
    return -VALUES.general - depth;
  }
  let best = -Infinity;
  for (const move of orderMoves(board, moves)) {
    const next = applyMove(board, move);
    const score = -negamaxTimed(next, opponent(side), depth - 1, -beta, -alpha, deadline);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
