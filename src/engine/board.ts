import { Board, Piece, Side, SideSetup, WingSetup, COLS, ROWS } from './types';

// Default formation: horse on the outer square of both wings (마상 / 상마 -> here 마 outer).
export const DEFAULT_SETUP: SideSetup = {
  left: 'horse-outer',
  right: 'horse-outer',
};

// Build a back rank (9 columns, board space) for the given side + formation.
//
// The setup labels are read AS THE PLAYER SEES THEM ON SCREEN, left→right
// within each wing pair. A wing value of 'horse-outer' means the label "마/상":
// the left square of that pair (on screen) is the Horse, the right is the
// Elephant. 'elephant-outer' means "상/마".
//
// Screen ↔ board mapping:
//   - Cho (bottom, not flipped): screen col == board col.
//       left wing pair  = board cols (1,2), screen-left square = col 1
//       right wing pair = board cols (6,7), screen-left square = col 6
//   - Han (top, flipped 180° for display): screen col == 8 - board col.
//     So a Han player's LEFT wing sits on the board's RIGHT pair, and within
//     a pair the higher board col is the screen-left square. We build the
//     board rank so that, once flipped for display, it reads correctly.
function backRank(side: Side, setup: SideSetup): (Piece | null)[] {
  const p = (type: Piece['type']): Piece => ({ type, side });

  // For a wing labelled left→right on screen, return [screenLeft, screenRight].
  const wingPieces = (w: WingSetup): [Piece, Piece] =>
    w === 'horse-outer' ? [p('horse'), p('elephant')] : [p('elephant'), p('horse')];

  const rank: (Piece | null)[] = [
    p('chariot'), // 0
    null, // 1
    null, // 2
    p('guard'), // 3
    null, // 4 (general placed separately)
    p('guard'), // 5
    null, // 6
    null, // 7
    p('chariot'), // 8
  ];

  if (side === 'cho') {
    // Not flipped: screen col == board col. Fill each pair left→right.
    const [lL, lR] = wingPieces(setup.left); // board cols 1,2
    const [rL, rR] = wingPieces(setup.right); // board cols 6,7
    rank[1] = lL;
    rank[2] = lR;
    rank[6] = rL;
    rank[7] = rR;
  } else {
    // Han is displayed flipped, so screen-left is the higher board col.
    // Player's LEFT wing -> board cols (7,6) with screen-left = col 7.
    // Player's RIGHT wing -> board cols (2,1) with screen-left = col 2.
    const [lL, lR] = wingPieces(setup.left);
    const [rL, rR] = wingPieces(setup.right);
    rank[7] = lL; // screen-left of player's left wing
    rank[6] = lR;
    rank[2] = rL; // screen-left of player's right wing
    rank[1] = rR;
  }

  return rank;
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
