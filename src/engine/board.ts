import { Board, Piece, Side, SideSetup, WingSetup, COLS, ROWS } from './types';

// Default formation: horse on the outer square of both wings (마상 / 상마 -> here 마 outer).
export const DEFAULT_SETUP: SideSetup = {
  left: 'horse-outer',
  right: 'horse-outer',
};

// Build a back rank (9 columns) for the given side and formation.
//
// Column layout (board space, cols 0..8):
//   0: chariot
//   1,2: LEFT wing pair  (outer=1, inner=2)
//   3: guard
//   4: general slot (empty on back rank; general sits on palace middle row)
//   5: guard
//   6,7: RIGHT wing pair (inner=6, outer=7)
//   8: chariot
//
// `setup` is expressed in the PLAYER'S OWN perspective (their left / right).
// For Cho (bottom) the player's left maps to board cols 1,2 and right to 6,7.
// For Han (top) the board is mirrored, so the player's left maps to the
// board's right pair (6,7) and vice versa.
function backRank(side: Side, setup: SideSetup): (Piece | null)[] {
  const p = (type: Piece['type']): Piece => ({ type, side });

  // Resolve which wing setup applies to the board's left pair (cols 1,2)
  // and right pair (cols 6,7), accounting for Han's mirrored view.
  const boardLeftWing: WingSetup = side === 'cho' ? setup.left : setup.right;
  const boardRightWing: WingSetup = side === 'cho' ? setup.right : setup.left;

  // Given a wing setup, return [outerPiece, innerPiece].
  const wingPieces = (w: WingSetup): [Piece, Piece] =>
    w === 'horse-outer' ? [p('horse'), p('elephant')] : [p('elephant'), p('horse')];

  const [leftOuter, leftInner] = wingPieces(boardLeftWing); // cols 1,2
  const [rightInner, rightOuter] = (() => {
    const [outer, inner] = wingPieces(boardRightWing);
    return [inner, outer]; // right wing: inner is col 6, outer is col 7
  })();

  return [
    p('chariot'), // 0
    leftOuter, // 1
    leftInner, // 2
    p('guard'), // 3
    null, // 4 (general placed separately)
    p('guard'), // 5
    rightInner, // 6
    rightOuter, // 7
    p('chariot'), // 8
  ];
}

export function initialBoard(
  choSetup: SideSetup = DEFAULT_SETUP,
  hanSetup: SideSetup = DEFAULT_SETUP
): Board {
  const board: Board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );

  // Han (top)
  board[0] = backRank('han', hanSetup);
  board[1][4] = { type: 'general', side: 'han' };
  board[2][1] = { type: 'cannon', side: 'han' };
  board[2][7] = { type: 'cannon', side: 'han' };
  for (const c of [0, 2, 4, 6, 8]) board[3][c] = { type: 'soldier', side: 'han' };

  // Cho (bottom)
  board[9] = backRank('cho', choSetup);
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
