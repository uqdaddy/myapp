import { CBoard, CPiece, CPieceType, CSide } from './types';

// Standard chess piece values. King is not counted.
export const CHESS_POINTS: Record<CPieceType, number> = {
  queen: 9,
  rook: 5,
  bishop: 3,
  knight: 3,
  pawn: 1,
  king: 0,
};

// Full initial complement per side (excluding the king).
const FULL_SET: CPieceType[] = [
  'queen',
  'rook',
  'rook',
  'bishop',
  'bishop',
  'knight',
  'knight',
  'pawn',
  'pawn',
  'pawn',
  'pawn',
  'pawn',
  'pawn',
  'pawn',
  'pawn',
];

function countBySide(board: CBoard, side: CSide): Record<CPieceType, number> {
  const counts: Record<CPieceType, number> = {
    queen: 0,
    rook: 0,
    bishop: 0,
    knight: 0,
    pawn: 0,
    king: 0,
  };
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.side === side) counts[cell.type]++;
    }
  }
  return counts;
}

// Total material value of a side's surviving pieces (promotions counted).
export function materialScore(board: CBoard, side: CSide): number {
  const counts = countBySide(board, side);
  let total = 0;
  (Object.keys(counts) as CPieceType[]).forEach((t) => {
    total += counts[t] * CHESS_POINTS[t];
  });
  return total;
}

// Pieces `side` has captured = opponent pieces missing from the board. This is
// an approximation when promotions occur (a promoted queen makes the pawn count
// look off) but is fine for a captured-piece display.
export function capturedByOpponentOf(board: CBoard, victim: CSide): CPiece[] {
  const alive = countBySide(board, victim);
  const remaining: Record<CPieceType, number> = { ...alive };
  const captured: CPiece[] = [];
  for (const t of FULL_SET) {
    if (remaining[t] > 0) remaining[t]--;
    else captured.push({ type: t, side: victim });
  }
  captured.sort((a, b) => CHESS_POINTS[b.type] - CHESS_POINTS[a.type]);
  return captured;
}
