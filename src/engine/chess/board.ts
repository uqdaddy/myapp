import { CBoard, CPiece, CSide, CState, C_COLS, C_ROWS } from './types';

// Standard starting position. Row 0 = rank 8 (black back rank),
// row 7 = rank 1 (white back rank).
const BACK_RANK: CPiece['type'][] = [
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'bishop',
  'knight',
  'rook',
];

export function initialBoard(): CBoard {
  const board: CBoard = Array.from({ length: C_ROWS }, () =>
    Array.from({ length: C_COLS }, () => null as CPiece | null)
  );

  // Black back rank (row 0) + pawns (row 1)
  for (let c = 0; c < C_COLS; c++) {
    board[0][c] = { type: BACK_RANK[c], side: 'black' };
    board[1][c] = { type: 'pawn', side: 'black' };
  }
  // White back rank (row 7) + pawns (row 6)
  for (let c = 0; c < C_COLS; c++) {
    board[7][c] = { type: BACK_RANK[c], side: 'white' };
    board[6][c] = { type: 'pawn', side: 'white' };
  }
  return board;
}

export function initialState(): CState {
  return {
    board: initialBoard(),
    toMove: 'white',
    epTarget: null,
    halfmove: 0,
    fullmove: 1,
  };
}

export function cloneBoard(board: CBoard): CBoard {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function pieceAt(board: CBoard, r: number, c: number): CPiece | null {
  if (r < 0 || r >= C_ROWS || c < 0 || c >= C_COLS) return null;
  return board[r][c];
}

// White plays from the bottom (rows 7..6 forward = decreasing row index).
// Black plays from the top (rows 0..1 forward = increasing row index).
export function forwardDir(side: CSide): number {
  return side === 'white' ? -1 : 1;
}

// The starting pawn row for a side (double-step allowed from here).
export function pawnStartRow(side: CSide): number {
  return side === 'white' ? 6 : 1;
}

// The promotion row (last rank) for a side.
export function promotionRow(side: CSide): number {
  return side === 'white' ? 0 : 7;
}
