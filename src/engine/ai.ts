import { Board, Move, PieceType, Side, opponent } from './types';
import { allLegalMoves, applyMove, isInCheck } from './moves';

// Material values (roughly tuned for Janggi).
const VALUES: Record<PieceType, number> = {
  general: 100000,
  chariot: 130,
  cannon: 70,
  horse: 50,
  elephant: 30,
  guard: 30,
  soldier: 20,
};

// Small positional bonus: encourage advancing soldiers and central control.
function positionBonus(type: PieceType, side: Side, r: number): number {
  if (type === 'soldier') {
    // reward soldiers that have advanced toward the enemy palace
    return side === 'cho' ? (9 - r) * 2 : r * 2;
  }
  return 0;
}

// Evaluate board from the perspective of `side` (positive = good for side).
function evaluate(board: Board, side: Side): number {
  let score = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = VALUES[p.type] + positionBonus(p.type, p.side, r);
      score += p.side === side ? val : -val;
    }
  }
  return score;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

function depthFor(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 1;
    case 'normal':
      return 3;
    case 'hard':
      return 4;
  }
}

// Order moves so captures come first -> better alpha-beta pruning.
function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const av = a.captured ? VALUES[a.captured.type] : 0;
    const bv = b.captured ? VALUES[b.captured.type] : 0;
    return bv - av;
  });
}

function negamax(
  board: Board,
  side: Side,
  depth: number,
  alpha: number,
  beta: number
): number {
  if (depth === 0) {
    return evaluate(board, side);
  }
  const moves = allLegalMoves(board, side);
  if (moves.length === 0) {
    // side to move has no moves -> loses
    return -VALUES.general;
  }
  let best = -Infinity;
  for (const move of orderMoves(moves)) {
    const next = applyMove(board, move);
    const score = -negamax(next, opponent(side), depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // prune
  }
  return best;
}

// Pick the best move for `side`. Returns null if no legal move.
export function chooseMove(
  board: Board,
  side: Side,
  difficulty: Difficulty
): Move | null {
  const depth = depthFor(difficulty);
  const moves = allLegalMoves(board, side);
  if (moves.length === 0) return null;

  // Easy: mostly greedy with randomness for variety.
  if (difficulty === 'easy') {
    const scored = moves.map((m) => {
      const next = applyMove(board, m);
      let s = evaluate(next, side);
      if (isInCheck(next, opponent(side))) s += 15; // slight nudge to give check
      return { m, s };
    });
    scored.sort((a, b) => b.s - a.s);
    // pick randomly among the top few to avoid being too predictable
    const topK = scored.slice(0, Math.min(3, scored.length));
    return topK[Math.floor(Math.random() * topK.length)].m;
  }

  let bestScore = -Infinity;
  let bestMoves: Move[] = [];
  let alpha = -Infinity;
  const beta = Infinity;
  const ordered = orderMoves(moves);
  for (const move of ordered) {
    const next = applyMove(board, move);
    const score = -negamax(next, opponent(side), depth - 1, -beta, -alpha);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      // collect ties so we can pick randomly among equally good moves,
      // which keeps openings varied instead of always the same move.
      bestMoves.push(move);
    }
    if (score > alpha) alpha = score;
  }
  if (bestMoves.length === 0) return null;
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}
