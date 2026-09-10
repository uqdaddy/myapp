import { Board, Move, PieceType, Side, inPalace, opponent } from './types';
import { allLegalMoves, applyMove, isInCheck, pseudoMovesFor, findGeneral } from './moves';
import { initialBoard } from './board';
import type { SideSetup, WingSetup } from './types';

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
// Zobrist hashing: a fast, order-independent key for a board position so the
// transposition table can recognise positions reached by different move
// orders. Keys are 32-bit numbers XOR-ed together (good enough for a TT here).
// ---------------------------------------------------------------------------
const PIECE_INDEX: Record<PieceType, number> = {
  general: 0,
  guard: 1,
  elephant: 2,
  horse: 3,
  chariot: 4,
  cannon: 5,
  soldier: 6,
};

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return s >>> 0;
  };
}

// zobrist[side(0/1)][pieceType(0..6)][square(0..89)]
const ZOBRIST: number[][][] = (() => {
  const next = rng(0x9e3779b9);
  const table: number[][][] = [];
  for (let s = 0; s < 2; s++) {
    table[s] = [];
    for (let t = 0; t < 7; t++) {
      table[s][t] = [];
      for (let sq = 0; sq < 90; sq++) table[s][t][sq] = next();
    }
  }
  return table;
})();
const ZOBRIST_SIDE = rng(0x1234abcd)();

function hashBoard(board: Board, sideToMove: Side): number {
  let h = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (!p) continue;
      const s = p.side === 'cho' ? 0 : 1;
      h ^= ZOBRIST[s][PIECE_INDEX[p.type]][r * 9 + c];
    }
  }
  if (sideToMove === 'han') h ^= ZOBRIST_SIDE;
  return h >>> 0;
}

// Starting squares of each side's back-rank pieces, used to reward development
// (moving major pieces off their home squares in the opening).
// row for Han = 0, for Cho = 9.
function homeRow(side: Side): number {
  return side === 'cho' ? 9 : 0;
}
function cannonHomeRow(side: Side): number {
  return side === 'cho' ? 7 : 2;
}

// Per-side positional evaluation (all positive). Combines development,
// mobility, king safety, and defensive shape into a Janggi "sense".
function positionalTerms(board: Board, side: Side): number {
  let s = 0;
  const hr = homeRow(side);
  const chr = cannonHomeRow(side);

  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (!p || p.side !== side) continue;

      switch (p.type) {
        case 'horse':
        case 'elephant':
          // Strongly reward developing horses/elephants off the back rank so
          // the engine prefers useful development over aimless shuffles.
          if (r !== hr) s += 18;
          break;
        case 'chariot':
          // Reward chariots that have become active (left the corner).
          if (r !== hr || (c !== 0 && c !== 8)) s += 10;
          break;
        case 'cannon':
          // Reward cannons that have moved off their home row into play.
          if (r !== chr) s += 14;
          break;
        case 'guard':
          // Guards belong in the palace. Penalize leaving it, and keep them on
          // their home squares in the opening (discourage pointless shuffles).
          if (!inPalace(side, r, c)) s -= 20;
          else if (c !== 3 && c !== 5) s -= 6; // moved off a home guard square
          break;
        case 'general':
          // The general is safest on its palace center/back rank; penalize
          // stepping off the central file or forward without reason.
          if (c !== 4) s -= 14;
          if (r !== hr) s -= 12;
          break;
        default:
          break;
      }
    }
  }
  return s;
}

// Lightweight mobility: count pseudo-legal moves for the side's mobile pieces.
// Chariots and cannons benefit most from open lines, so weight them.
function mobilityTerm(board: Board, side: Side): number {
  let m = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (!p || p.side !== side) continue;
      if (p.type === 'guard' || p.type === 'general') continue;
      const count = pseudoMovesFor(board, { r, c }).length;
      const w = p.type === 'chariot' ? 1.2 : p.type === 'cannon' ? 1.0 : 0.5;
      m += count * w;
    }
  }
  return m;
}

// King safety: reward guards/general clustered in the palace, penalize an
// exposed general (empty squares directly in front of it).
function kingSafety(board: Board, side: Side): number {
  const gen = findGeneral(board, side);
  if (!gen) return -500;
  let s = 0;
  // Count friendly defenders (guards/elephants) inside the palace.
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (!p || p.side !== side) continue;
      if ((p.type === 'guard' || p.type === 'elephant') && inPalace(side, r, c)) s += 6;
    }
  }
  // Penalize the general sitting on an open file (no friendly screen ahead).
  const forward = side === 'cho' ? -1 : 1;
  const fr = gen.r + forward;
  if (fr >= 0 && fr < board.length && !board[fr][gen.c]) s -= 8;
  return s;
}

// ---------------------------------------------------------------------------
// Static evaluation from the perspective of `side` (positive = good for side).
// ---------------------------------------------------------------------------
function sideScore(board: Board, side: Side): number {
  let material = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (!p || p.side !== side) continue;
      material += VALUES[p.type] + pstValue(p.type, p.side, r, c);
    }
  }
  const positional = positionalTerms(board, side);
  const mobility = mobilityTerm(board, side);
  const safety = kingSafety(board, side);
  // Mobility is scaled down so it nudges, not dominates.
  return material + positional + mobility * 0.35 + safety;
}

function evaluate(board: Board, side: Side): number {
  let score = sideScore(board, side) - sideScore(board, opponent(side));
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

function moveKey(m: Move): string {
  return `${m.from.r}${m.from.c}${m.to.r}${m.to.c}`;
}

// ---------------------------------------------------------------------------
// Search state carried through one chooseMove call: transposition table,
// killer moves (per ply), and a history heuristic table for quiet moves.
// ---------------------------------------------------------------------------
type TTFlag = 'exact' | 'lower' | 'upper';
interface TTEntry {
  depth: number;
  score: number;
  flag: TTFlag;
  bestKey?: string;
}

class SearchState {
  tt = new Map<number, TTEntry>();
  killers: [string?, string?][] = [];
  history = new Map<string, number>();
  deadline = Infinity;

  killer(ply: number): [string?, string?] {
    return (this.killers[ply] ||= [undefined, undefined]);
  }
  addKiller(ply: number, key: string) {
    const k = this.killer(ply);
    if (k[0] !== key) {
      k[1] = k[0];
      k[0] = key;
    }
  }
  addHistory(key: string, depth: number) {
    this.history.set(key, (this.history.get(key) ?? 0) + depth * depth);
  }
}

// Move ordering: TT best move, then winning captures (MVV-LVA), then killers,
// then quiet moves ranked by the history heuristic.
function orderMoves(
  board: Board,
  moves: Move[],
  st: SearchState,
  ply: number,
  ttBestKey?: string
): Move[] {
  const killers = st.killer(ply);
  const scored = moves.map((m) => {
    const key = moveKey(m);
    let s = 0;
    if (ttBestKey && key === ttBestKey) s += 1_000_000;
    if (m.captured) {
      const attacker = board[m.from.r][m.from.c];
      s += 100_000 + VALUES[m.captured.type] * 10 - (attacker ? VALUES[attacker.type] : 0);
    } else {
      if (key === killers[0]) s += 9_000;
      else if (key === killers[1]) s += 8_000;
      s += st.history.get(key) ?? 0;
    }
    return { m, s, key };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.m);
}

// Quiescence search: resolve captures at the leaves so the engine never stops
// mid-exchange and mispaints a position.
function quiescence(
  board: Board,
  side: Side,
  alpha: number,
  beta: number,
  qdepth: number,
  st: SearchState
): number {
  if (Date.now() >= st.deadline) throw new TimeUp();
  const standPat = evaluate(board, side);
  if (qdepth === 0) return standPat;
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  const captures = allLegalMoves(board, side).filter((m) => m.captured);
  for (const move of orderMoves(board, captures, st, 0)) {
    const next = applyMove(board, move);
    const score = -quiescence(next, opponent(side), -beta, -alpha, qdepth - 1, st);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// Alpha-beta negamax with transposition table, check extension, killer moves
// and history heuristic.
function negamax(
  board: Board,
  side: Side,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  st: SearchState
): number {
  if (Date.now() >= st.deadline) throw new TimeUp();

  const alphaOrig = alpha;
  const hash = hashBoard(board, side);
  const tt = st.tt.get(hash);
  if (tt && tt.depth >= depth) {
    if (tt.flag === 'exact') return tt.score;
    if (tt.flag === 'lower' && tt.score > alpha) alpha = tt.score;
    else if (tt.flag === 'upper' && tt.score < beta) beta = tt.score;
    if (alpha >= beta) return tt.score;
  }

  // Check extension: search one deeper when in check so tactics aren't missed.
  const inCheck = isInCheck(board, side);
  const d = inCheck ? depth + 1 : depth;

  if (d <= 0) {
    return quiescence(board, side, alpha, beta, 6, st);
  }

  // Null-move pruning: if giving the opponent a free move still leaves us at
  // or above beta, this line is so good we can prune it. Skip when in check or
  // at shallow depth (and only with a finite beta window).
  if (!inCheck && d >= 3 && beta < VALUES.general / 2) {
    const R = 2; // reduction
    const nullScore = -negamax(board, opponent(side), d - 1 - R, -beta, -beta + 1, ply + 1, st);
    if (nullScore >= beta) return beta;
  }

  const moves = allLegalMoves(board, side);
  if (moves.length === 0) {
    return -VALUES.general - depth; // checkmate/stalemate: this side loses
  }

  let best = -Infinity;
  let bestKey: string | undefined;
  const ordered = orderMoves(board, moves, st, ply, tt?.bestKey);
  let first = true;
  for (const move of ordered) {
    const next = applyMove(board, move);
    let score: number;
    if (first) {
      // Principal variation: full-window search for the first (best-ordered) move.
      score = -negamax(next, opponent(side), d - 1, -beta, -alpha, ply + 1, st);
    } else {
      // Others: quick null-window scout; re-search fully only if it looks better.
      score = -negamax(next, opponent(side), d - 1, -alpha - 1, -alpha, ply + 1, st);
      if (score > alpha && score < beta) {
        score = -negamax(next, opponent(side), d - 1, -beta, -alpha, ply + 1, st);
      }
    }
    first = false;
    if (score > best) {
      best = score;
      bestKey = moveKey(move);
    }
    if (best > alpha) alpha = best;
    if (alpha >= beta) {
      if (!move.captured) {
        st.addKiller(ply, moveKey(move));
        st.addHistory(moveKey(move), depth);
      }
      break;
    }
  }

  // Store in the transposition table.
  let flag: TTFlag = 'exact';
  if (best <= alphaOrig) flag = 'upper';
  else if (best >= beta) flag = 'lower';
  st.tt.set(hash, { depth, score: best, flag, bestKey });

  return best;
}

// Thrown to abort a search that has exceeded its time budget.
class TimeUp extends Error {}

export interface SearchOptions {
  maxDepth?: number; // hard cap on iterative deepening
  timeMs?: number; // soft time budget; stop deepening once exceeded
}

// ---------------------------------------------------------------------------
// Root: time-limited iterative deepening. Searches depth 1, 2, 3, ... reusing
// results via the transposition table, and returns the best move from the
// deepest COMPLETED iteration within the time budget.
// ---------------------------------------------------------------------------
export function chooseMove(
  board: Board,
  side: Side,
  difficulty: Difficulty,
  opts: SearchOptions = {}
): Move | null {
  const capDepth = opts.maxDepth ?? depthFor(difficulty);
  const timeMs = opts.timeMs ?? Infinity;

  const rootMoves = allLegalMoves(board, side);
  if (rootMoves.length === 0) return null;

  const st = new SearchState();
  st.deadline = Date.now() + timeMs;

  let bestMove: Move = rootMoves[0];
  let bestNearTop: Move[] = [bestMove];

  for (let depth = 1; depth <= capDepth; depth++) {
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    // Order root moves; search the running best move first.
    const ordered = orderMoves(board, rootMoves, st, 0, moveKey(bestMove));

    const candidates: { move: Move; score: number }[] = [];
    let aborted = false;
    try {
      for (const move of ordered) {
        const next = applyMove(board, move);
        const score = -negamax(next, opponent(side), depth - 1, -beta, -alpha, 1, st);
        candidates.push({ move, score });
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
        if (score > alpha) alpha = score;
      }
    } catch (e) {
      if (e instanceof TimeUp) aborted = true;
      else throw e;
    }

    if (aborted) break; // keep best move from the last fully completed depth

    bestNearTop = candidates.filter((c) => c.score >= bestScore - 1).map((c) => c.move);

    // If we found a forced win, no need to search deeper.
    if (bestScore >= VALUES.general) break;
    if (Date.now() >= st.deadline) break;
  }

  return bestNearTop[Math.floor(Math.random() * bestNearTop.length)];
}


// ---------------------------------------------------------------------------
// AI wing-formation selection. Given the human's side and chosen formation,
// the AI evaluates all four of its own wing setups (마/상 × 마/상 on each wing)
// with a shallow search and picks the one that looks best for itself. This
// makes the AI vary its formation and respond to the player's choice.
// ---------------------------------------------------------------------------
const WING_OPTIONS: WingSetup[] = ['horse-outer', 'elephant-outer'];

export function chooseSetup(
  aiSide: Side,
  humanSide: Side,
  humanSetup: SideSetup
): SideSetup {
  const options: SideSetup[] = [];
  for (const left of WING_OPTIONS) {
    for (const right of WING_OPTIONS) options.push({ left, right });
  }

  let bestScore = -Infinity;
  let best: SideSetup[] = [options[0]];

  for (const aiSetup of options) {
    const choSetup = humanSide === 'cho' ? humanSetup : aiSetup;
    const hanSetup = humanSide === 'han' ? humanSetup : aiSetup;
    const board = initialBoard(choSetup, hanSetup);

    // Shallow search from the position after setup, scored for the AI side.
    const st = new SearchState();
    st.deadline = Date.now() + 300; // small budget; setup eval is not deep
    let score: number;
    try {
      score = negamax(board, aiSide, 2, -Infinity, Infinity, 0, st);
    } catch {
      score = evaluate(board, aiSide);
    }

    if (score > bestScore + 0.5) {
      bestScore = score;
      best = [aiSetup];
    } else if (Math.abs(score - bestScore) <= 0.5) {
      best.push(aiSetup);
    }
  }

  // Random tie-break among near-equal setups for variety.
  return best[Math.floor(Math.random() * best.length)];
}
