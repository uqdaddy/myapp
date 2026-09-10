import { Board, Piece, Side, COLS, ROWS } from './types';

// Standard Janggi starting position.
// Row 0 = Han (top / red), Row 9 = Cho (bottom / green).
// This uses the common "elephant next to guard" (마상상마 -> 상마마상 variants exist);
// we use the most common default: 차마상사 . 사상마차 with elephants inside horses.
// Layout per back rank (cols 0..8):
//   chariot, horse, elephant, guard, (general center), guard, elephant, horse, chariot
// General sits on the middle row of its palace (row 1 for Han, row 8 for Cho).

function backRank(side: Side): (Piece | null)[] {
  const p = (type: Piece['type']): Piece => ({ type, side });
  return [
    p('chariot'),
    p('horse'),
    p('elephant'),
    p('guard'),
    null, // general goes on palace middle row, not the edge
    p('guard'),
    p('elephant'),
    p('horse'),
    p('chariot'),
  ];
}

export function initialBoard(): Board {
  const board: Board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );

  // Han (top)
  board[0] = backRank('han');
  board[1][4] = { type: 'general', side: 'han' };
  // Han cannons on row 2, cols 1 and 7
  board[2][1] = { type: 'cannon', side: 'han' };
  board[2][7] = { type: 'cannon', side: 'han' };
  // Han soldiers on row 3, cols 0,2,4,6,8
  for (const c of [0, 2, 4, 6, 8]) board[3][c] = { type: 'soldier', side: 'han' };

  // Cho (bottom)
  board[9] = backRank('cho');
  board[8][4] = { type: 'general', side: 'cho' };
  board[7][1] = { type: 'cannon', side: 'cho' };
  board[7][7] = { type: 'cannon', side: 'cho' };
  for (const c of [0, 2, 4, 6, 8]) board[6][c] = { type: 'soldier', side: 'cho' };

  return board;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function pieceAt(board: Board, r: number, c: number): Piece | null {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
  return board[r][c];
}
