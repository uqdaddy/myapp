import { Board, Move, Side } from './types';
import { allLegalMoves, applyMove, isInCheck } from './moves';

// ---------------------------------------------------------------------------
// Opening guidance ("정석" book).
//
// There is no standard public opening book for Janggi, and a full branching
// book is impractical. Instead we encode the STANDARD OPENING PRIORITIES that
// strong human players follow, in order of how commonly they are played:
//
//   1. Develop a HORSE so a cannon can later sit in front of the king.
//   2. Develop a HORSE so an elephant can come out toward the king.
//   3. Advance a WING soldier (never the central one) to open a chariot's file.
//   4. Reposition a CANNON toward the center (often onto the king's file).
//   5. Activate a CHARIOT along the opened file.
//
// The center soldier is explicitly never pushed as a developing move — that is
// the weak move we want to avoid. Each step is only played if a safe, legal
// move exists; otherwise we fall through to the next step and finally to the
// search engine. Expressed as goals over the live board, it adapts to either
// side and to the chosen wing setup automatically.
// ---------------------------------------------------------------------------

type Goal =
  | { kind: 'horse' }
  | { kind: 'wingSoldier' } // edge-side soldiers only, to free a chariot
  | { kind: 'cannon' }
  | { kind: 'chariot' };

// Ordered opening plan (one goal per AI opening move), reflecting the common
// order strong players use.
const PLAN: Goal[] = [
  { kind: 'horse' }, // 1
  { kind: 'horse' }, // 2 (develop the other horse)
  { kind: 'wingSoldier' }, // 3 open a file for a chariot
  { kind: 'cannon' }, // 4 bring a cannon toward center
  { kind: 'chariot' }, // 5 activate the chariot
  { kind: 'wingSoldier' }, // 6 open the other wing
];

export const OPENING_PLIES = PLAN.length;

const VAL: Record<string, number> = {
  general: 1000,
  chariot: 13,
  cannon: 7,
  horse: 5,
  elephant: 3,
  guard: 3,
  soldier: 2,
};

// The central file is column 4. Soldiers there must never be pushed as an
// opening developing move.
const CENTER_COL = 4;

// 1-ply safety: the move must not leave our general in check, and must not
// hang the moved piece for less than we gained.
function isSafe(board: Board, move: Move, side: Side): boolean {
  const after = applyMove(board, move);
  if (isInCheck(after, side)) return false;

  const movedType = board[move.from.r][move.from.c]?.type;
  if (!movedType) return false;
  const movedVal = VAL[movedType];

  const foe = side === 'cho' ? 'han' : 'cho';
  const attackers = allLegalMoves(after, foe).filter(
    (m) => m.to.r === move.to.r && m.to.c === move.to.c
  );
  if (attackers.length === 0) return true;

  const capturedByUs = move.captured ? VAL[move.captured.type] : 0;
  const afterFoe = applyMove(after, attackers[0]);
  const canRecapture = allLegalMoves(afterFoe, side).some(
    (m) => m.to.r === move.to.r && m.to.c === move.to.c
  );
  if (canRecapture) return capturedByUs >= movedVal - 1;
  return capturedByUs >= movedVal;
}

// Score a candidate for a goal: prefer forward, sensible development.
function score(m: Move, side: Side, goal: Goal): number {
  const forward = side === 'cho' ? m.from.r - m.to.r : m.to.r - m.from.r;
  const centerPull = 4 - Math.abs(m.to.c - 4);
  switch (goal.kind) {
    case 'horse':
      // Horses developing toward the center files are best.
      return forward * 3 + centerPull * 2;
    case 'wingSoldier':
      // Prefer soldiers nearer the edges (they open chariot files); the more
      // off-center, the better.
      return Math.abs(m.from.c - 4) * 3 + forward;
    case 'cannon':
      // Cannons want central files (ideally the king's file) and to advance.
      return centerPull * 3 + forward;
    case 'chariot':
      return forward * 2 + centerPull;
  }
}

// Return the moves that match a goal's piece/eligibility rules.
function candidatesFor(board: Board, side: Side, goal: Goal): Move[] {
  const legal = allLegalMoves(board, side);
  return legal.filter((m) => {
    const t = board[m.from.r][m.from.c]?.type;
    if (goal.kind === 'horse') return t === 'horse';
    if (goal.kind === 'cannon') return t === 'cannon';
    if (goal.kind === 'chariot') return t === 'chariot';
    // wingSoldier: soldiers that are NOT on the central file.
    return t === 'soldier' && m.from.c !== CENTER_COL;
  });
}

function bestForGoal(board: Board, side: Side, goal: Goal): Move | null {
  const scored = candidatesFor(board, side, goal)
    .map((m) => ({ m, s: score(m, side, goal) }))
    .filter((x) => isSafe(board, x.m, side))
    .sort((a, b) => b.s - a.s);
  return scored.length > 0 ? scored[0].m : null;
}

// Opening move for `side` on its `moveNumber`-th move (0-based), or null to let
// the search engine decide.
export function openingMove(board: Board, side: Side, moveNumber: number): Move | null {
  if (moveNumber >= PLAN.length) return null;
  if (isInCheck(board, side)) return null; // let search handle checks

  // Try the planned goal for this move; if unavailable, try the remaining goals
  // so we still develop something useful rather than stalling.
  for (let i = moveNumber; i < PLAN.length; i++) {
    const move = bestForGoal(board, side, PLAN[i]);
    if (move) return move;
  }
  return null;
}
