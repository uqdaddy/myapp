// Chess move generation + legality. The Fairy-Stockfish engine chooses moves,
// but this module independently validates legality (mirroring the Janggi
// approach) so the UI only ever applies verified-legal moves and can show legal
// targets, check, checkmate/stalemate.

import {
  CBoard,
  CMove,
  CPiece,
  CPos,
  CSide,
  CState,
  cInBounds,
  cOpponent,
  C_COLS,
  C_ROWS,
} from './types';
import { cloneBoard, forwardDir, pawnStartRow, promotionRow } from './board';

function canLand(board: CBoard, side: CSide, r: number, c: number): boolean {
  if (!cInBounds(r, c)) return false;
  const t = board[r][c];
  return !t || t.side !== side;
}

const ROOK_DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const BISHOP_DIRS: [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
const KNIGHT_STEPS: [number, number][] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

function sliderMoves(
  board: CBoard,
  from: CPos,
  piece: CPiece,
  dirs: [number, number][]
): CMove[] {
  const moves: CMove[] = [];
  for (const [dr, dc] of dirs) {
    let r = from.r + dr;
    let c = from.c + dc;
    while (cInBounds(r, c)) {
      const t = board[r][c];
      if (!t) {
        moves.push({ from, to: { r, c }, captured: null });
      } else {
        if (t.side !== piece.side) moves.push({ from, to: { r, c }, captured: t });
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return moves;
}

function stepMoves(
  board: CBoard,
  from: CPos,
  piece: CPiece,
  steps: [number, number][]
): CMove[] {
  const moves: CMove[] = [];
  for (const [dr, dc] of steps) {
    const r = from.r + dr;
    const c = from.c + dc;
    if (canLand(board, piece.side, r, c)) {
      moves.push({ from, to: { r, c }, captured: board[r][c] });
    }
  }
  return moves;
}

// Pawn pseudo-moves: forward one, forward two from start, diagonal captures,
// en-passant, and promotion expansion. `epTarget` is the current en-passant
// target square (or null).
function pawnMoves(board: CBoard, from: CPos, piece: CPiece, epTarget: CPos | null): CMove[] {
  const moves: CMove[] = [];
  const dir = forwardDir(piece.side);
  const startRow = pawnStartRow(piece.side);
  const promoRow = promotionRow(piece.side);
  const { r, c } = from;

  const pushPromoAware = (m: CMove) => {
    if (m.to.r === promoRow) {
      // Expand into the four promotion choices.
      for (const promo of ['queen', 'rook', 'bishop', 'knight'] as const) {
        moves.push({ ...m, promotion: promo });
      }
    } else {
      moves.push(m);
    }
  };

  // Forward one
  const r1 = r + dir;
  if (cInBounds(r1, c) && !board[r1][c]) {
    pushPromoAware({ from, to: { r: r1, c }, captured: null });
    // Forward two from starting row (both squares empty)
    const r2 = r + 2 * dir;
    if (r === startRow && cInBounds(r2, c) && !board[r2][c]) {
      moves.push({ from, to: { r: r2, c }, captured: null });
    }
  }

  // Diagonal captures (incl. en-passant)
  for (const dc of [-1, 1]) {
    const nr = r + dir;
    const nc = c + dc;
    if (!cInBounds(nr, nc)) continue;
    const t = board[nr][nc];
    if (t && t.side !== piece.side) {
      pushPromoAware({ from, to: { r: nr, c: nc }, captured: t });
    } else if (epTarget && epTarget.r === nr && epTarget.c === nc) {
      // En-passant: capture the pawn that just double-stepped (same row as us).
      const capSq: CPos = { r, c: nc };
      moves.push({
        from,
        to: { r: nr, c: nc },
        captured: board[capSq.r][capSq.c],
        enPassant: true,
        epCapturedSquare: capSq,
      });
    }
  }

  return moves;
}

// King pseudo-moves (one step any direction). Castling is added separately in
// legalMoves because it needs check-safety of the transit squares.
function kingStepMoves(board: CBoard, from: CPos, piece: CPiece): CMove[] {
  const steps: [number, number][] = [...ROOK_DIRS, ...BISHOP_DIRS];
  return stepMoves(board, from, piece, steps);
}

// All pseudo-legal moves (ignoring own-king safety) for the piece at `from`.
export function pseudoMovesFor(board: CBoard, from: CPos, epTarget: CPos | null): CMove[] {
  const piece = board[from.r][from.c];
  if (!piece) return [];
  switch (piece.type) {
    case 'rook':
      return sliderMoves(board, from, piece, ROOK_DIRS);
    case 'bishop':
      return sliderMoves(board, from, piece, BISHOP_DIRS);
    case 'queen':
      return sliderMoves(board, from, piece, [...ROOK_DIRS, ...BISHOP_DIRS]);
    case 'knight':
      return stepMoves(board, from, piece, KNIGHT_STEPS);
    case 'king':
      return kingStepMoves(board, from, piece);
    case 'pawn':
      return pawnMoves(board, from, piece, epTarget);
    default:
      return [];
  }
}

export function findKing(board: CBoard, side: CSide): CPos | null {
  for (let r = 0; r < C_ROWS; r++) {
    for (let c = 0; c < C_COLS; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.side === side) return { r, c };
    }
  }
  return null;
}

// Is `side`'s king attacked? We check whether any opponent piece pseudo-attacks
// the king square. For attack detection en-passant is irrelevant, so pass null.
export function isSquareAttacked(board: CBoard, target: CPos, bySide: CSide): boolean {
  for (let r = 0; r < C_ROWS; r++) {
    for (let c = 0; c < C_COLS; c++) {
      const p = board[r][c];
      if (!p || p.side !== bySide) continue;
      // Pawns attack only diagonally — pseudoMovesFor already encodes that via
      // captures, but a pawn's diagonal is only a move if an enemy is there.
      // For attack purposes, treat the pawn's two diagonal squares as attacked.
      if (p.type === 'pawn') {
        const dir = forwardDir(p.side);
        if (r + dir === target.r && (c - 1 === target.c || c + 1 === target.c)) return true;
        continue;
      }
      const ms = pseudoMovesFor(board, { r, c }, null);
      if (ms.some((m) => m.to.r === target.r && m.to.c === target.c)) return true;
    }
  }
  return false;
}

export function isInCheck(board: CBoard, side: CSide): boolean {
  const k = findKing(board, side);
  if (!k) return true; // king gone = lost
  return isSquareAttacked(board, k, cOpponent(side));
}

// Apply a move, returning a NEW board. Handles captures, castling (rook move),
// en-passant (remove the passed pawn), and promotion.
export function applyMove(board: CBoard, move: CMove): CBoard {
  const next = cloneBoard(board);
  const piece = next[move.from.r][move.from.c];
  if (!piece) return next;

  // En-passant: remove the captured pawn from its own square.
  if (move.enPassant && move.epCapturedSquare) {
    next[move.epCapturedSquare.r][move.epCapturedSquare.c] = null;
  }

  // Move the piece.
  next[move.to.r][move.to.c] = { ...piece, moved: true };
  next[move.from.r][move.from.c] = null;

  // Promotion.
  if (move.promotion) {
    next[move.to.r][move.to.c] = {
      type: move.promotion,
      side: piece.side,
      moved: true,
    };
  }

  // Castling: relocate the rook.
  if (move.castle) {
    const row = move.from.r;
    if (move.castle === 'king') {
      const rook = next[row][7];
      next[row][5] = rook ? { ...rook, moved: true } : null;
      next[row][7] = null;
    } else {
      const rook = next[row][0];
      next[row][3] = rook ? { ...rook, moved: true } : null;
      next[row][0] = null;
    }
  }

  return next;
}

// The en-passant target created by a move (the skipped square), or null.
export function epTargetAfter(board: CBoard, move: CMove): CPos | null {
  const piece = board[move.from.r][move.from.c];
  if (piece && piece.type === 'pawn' && Math.abs(move.to.r - move.from.r) === 2) {
    return { r: (move.from.r + move.to.r) / 2, c: move.from.c };
  }
  return null;
}

// Castling moves for the side to move, with full legality (not in check, king
// doesn't pass through / land on an attacked square, squares between empty,
// king and rook unmoved).
function castlingMoves(board: CBoard, side: CSide): CMove[] {
  const moves: CMove[] = [];
  const row = side === 'white' ? 7 : 0;
  const king = board[row][4];
  if (!king || king.type !== 'king' || king.side !== side || king.moved) return moves;
  const foe = cOpponent(side);
  if (isSquareAttacked(board, { r: row, c: 4 }, foe)) return moves; // in check

  // King-side: squares f,g empty; rook h unmoved; king transit e,f,g safe.
  const hRook = board[row][7];
  if (hRook && hRook.type === 'rook' && hRook.side === side && !hRook.moved) {
    if (!board[row][5] && !board[row][6]) {
      if (
        !isSquareAttacked(board, { r: row, c: 5 }, foe) &&
        !isSquareAttacked(board, { r: row, c: 6 }, foe)
      ) {
        moves.push({ from: { r: row, c: 4 }, to: { r: row, c: 6 }, castle: 'king', captured: null });
      }
    }
  }
  // Queen-side: squares b,c,d empty; rook a unmoved; king transit e,d,c safe.
  const aRook = board[row][0];
  if (aRook && aRook.type === 'rook' && aRook.side === side && !aRook.moved) {
    if (!board[row][1] && !board[row][2] && !board[row][3]) {
      if (
        !isSquareAttacked(board, { r: row, c: 3 }, foe) &&
        !isSquareAttacked(board, { r: row, c: 2 }, foe)
      ) {
        moves.push({ from: { r: row, c: 4 }, to: { r: row, c: 2 }, castle: 'queen', captured: null });
      }
    }
  }
  return moves;
}

// Fully-legal moves for the piece at `from` in the given state.
export function legalMovesFor(state: CState, from: CPos): CMove[] {
  const { board, epTarget } = state;
  const piece = board[from.r][from.c];
  if (!piece) return [];
  let pseudo = pseudoMovesFor(board, from, epTarget);
  // Add castling if this is the king.
  if (piece.type === 'king') {
    pseudo = pseudo.concat(castlingMoves(board, piece.side));
  }
  return pseudo.filter((m) => {
    const after = applyMove(board, m);
    return !isInCheck(after, piece.side);
  });
}

// All fully-legal moves for the side to move.
export function allLegalMoves(state: CState, side: CSide): CMove[] {
  const moves: CMove[] = [];
  for (let r = 0; r < C_ROWS; r++) {
    for (let c = 0; c < C_COLS; c++) {
      const p = state.board[r][c];
      if (p && p.side === side) moves.push(...legalMovesFor(state, { r, c }));
    }
  }
  return moves;
}

// Advance the full state by applying a legal move (updates ep target, clocks).
export function advanceState(state: CState, move: CMove): CState {
  const piece = state.board[move.from.r][move.from.c];
  const isPawn = piece?.type === 'pawn';
  const isCapture = !!move.captured;
  return {
    board: applyMove(state.board, move),
    toMove: cOpponent(state.toMove),
    epTarget: epTargetAfter(state.board, move),
    halfmove: isPawn || isCapture ? 0 : state.halfmove + 1,
    fullmove: state.toMove === 'black' ? state.fullmove + 1 : state.fullmove,
  };
}
