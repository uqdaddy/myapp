import { Board, Move, Side } from './types';
import { allLegalMoves, applyMove, isInCheck } from './moves';

// ---------------------------------------------------------------------------
// Opening guidance ("정석" book).
//
// A full branching opening book for Janggi is impractical (the wing setups
// create many variations and there is no standard public book). Instead we
// encode the STANDARD DEVELOPMENT PLAN shared by the classic formations
// (귀마 / 원앙마 / 면상 / 양귀마): during the AI's first several moves it follows
// an ordered plan — open a horse's file with a soldier, jump the horse out,
// bring a cannon toward the center, activate a chariot — while keeping the
// general and guards at home. Each step is only played if a legal, non-hanging
// move exists for it; otherwise we fall through to the next step, and finally
// to the search engine.
//
// Expressed as goals over the live board, it adapts to either side and to the
// chosen wing setup automatically.
// ---------------------------------------------------------------------------

type DevType = 'chariot' | 'horse' | 'cannon' | 'soldier';

// Ordered development plan. One entry per AI opening move. The plan alternates
// opening lines (soldier) with actually developing pieces, which mirrors how
// the classic formations get set up.
const PLAN: DevType[] = [
  'soldier', // 1. advance a soldier to open a horse's path
  'horse', // 2. develop a horse
  'cannon', // 3. reposition a cannon toward the center
  'soldier', // 4. advance another soldier
  'horse', // 5. develop the other horse
  'chariot', // 6. activate a chariot
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
  if (attackers.length === 0) return true; // not attacked

  const capturedByUs = move.captured ? VAL[move.captured.type] : 0;
  // Can we recapture on that square after they take?
  const afterFoe = applyMove(after, attackers[0]);
  const canRecapture = allLegalMoves(afterFoe, side).some(
    (m) => m.to.r === move.to.r && m.to.c === move.to.c
  );
  if (canRecapture) return capturedByUs >= movedVal - 1;
  return capturedByUs >= movedVal;
}

// Reward heading toward the center files and moving forward (into play).
function developmentScore(m: Move, side: Side): number {
  const forward = side === 'cho' ? m.from.r - m.to.r : m.to.r - m.from.r; // >0 advancing
  const centerPull = 4 - Math.abs(m.to.c - 4);
  return forward * 2 + centerPull;
}

// Pick the best safe move that develops a piece of the given type.
function bestDevMove(board: Board, side: Side, type: DevType): Move | null {
  const legal = allLegalMoves(board, side).filter(
    (m) => board[m.from.r][m.from.c]?.type === type
  );
  const scored = legal
    .map((m) => ({ m, s: developmentScore(m, side) }))
    .filter((x) => isSafe(board, x.m, side))
    .sort((a, b) => b.s - a.s);
  return scored.length > 0 ? scored[0].m : null;
}

// Opening move for `side` on its `moveNumber`-th move (0-based), or null to let
// the search engine decide.
export function openingMove(board: Board, side: Side, moveNumber: number): Move | null {
  if (moveNumber >= PLAN.length) return null;
  if (isInCheck(board, side)) return null; // let search handle checks

  // Try the planned goal for this move; if unavailable, try later goals so we
  // still develop something useful rather than stalling.
  for (let i = moveNumber; i < PLAN.length; i++) {
    const move = bestDevMove(board, side, PLAN[i]);
    if (move) return move;
  }
  return null;
}
