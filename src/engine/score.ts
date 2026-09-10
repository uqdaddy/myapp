import { Board, Piece, PieceType, Side } from './types';

// Traditional Janggi piece point values used for scoring.
// The General (궁/장) is not counted toward the score.
export const PIECE_POINTS: Record<PieceType, number> = {
  chariot: 13,
  cannon: 7,
  horse: 5,
  elephant: 3,
  guard: 3,
  soldier: 2,
  general: 0,
};

// Han (후공, second to move) receives a 1.5 point "덤" handicap compensation.
export const HAN_BONUS = 1.5;

// Full initial complement of pieces per side (excluding the general which
// scores 0). Used to work out which pieces have been captured.
const FULL_SET: PieceType[] = [
  'chariot',
  'chariot',
  'cannon',
  'cannon',
  'horse',
  'horse',
  'elephant',
  'elephant',
  'guard',
  'guard',
  'soldier',
  'soldier',
  'soldier',
  'soldier',
  'soldier',
];

// Count each piece type currently on the board for a side.
function countBySide(board: Board, side: Side): Record<PieceType, number> {
  const counts: Record<PieceType, number> = {
    chariot: 0,
    cannon: 0,
    horse: 0,
    elephant: 0,
    guard: 0,
    soldier: 0,
    general: 0,
  };
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.side === side) counts[cell.type]++;
    }
  }
  return counts;
}

// Material score for a side = sum of point values of its surviving pieces,
// plus the Han bonus for the Han side.
export function materialScore(board: Board, side: Side): number {
  const counts = countBySide(board, side);
  let total = 0;
  (Object.keys(counts) as PieceType[]).forEach((t) => {
    total += counts[t] * PIECE_POINTS[t];
  });
  if (side === 'han') total += HAN_BONUS;
  return total;
}

// The pieces `side` has captured = the opponent pieces missing from the board.
// Returned sorted by descending value for a tidy display.
export function capturedByOpponentOf(board: Board, victim: Side): Piece[] {
  const alive = countBySide(board, victim);
  const remaining: Record<PieceType, number> = { ...alive };
  const captured: Piece[] = [];
  for (const t of FULL_SET) {
    if (remaining[t] > 0) {
      remaining[t]--;
    } else {
      // this piece of `victim` is gone -> captured by the opponent
      captured.push({ type: t, side: victim });
    }
  }
  captured.sort((a, b) => PIECE_POINTS[b.type] - PIECE_POINTS[a.type]);
  return captured;
}
