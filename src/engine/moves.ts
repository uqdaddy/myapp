import {
  Board,
  Move,
  Piece,
  Pos,
  Side,
  inBounds,
  inPalace,
  opponent,
} from './types';
import { cloneBoard, pieceAt } from './board';

// Palace diagonal connections. A square is diagonally connected to another
// only along the drawn palace diagonals (corners + center of each palace).
// For general/guard 1-step diagonal, and for the palace-diagonal soldier/cannon
// moves, we check membership in these adjacency sets.
const PALACE_DIAGONALS: Record<string, string[]> = {};
function key(r: number, c: number) {
  return `${r},${c}`;
}
function addDiag(a: [number, number], b: [number, number]) {
  (PALACE_DIAGONALS[key(a[0], a[1])] ||= []).push(key(b[0], b[1]));
  (PALACE_DIAGONALS[key(b[0], b[1])] ||= []).push(key(a[0], a[1]));
}
// Han palace (rows 0..2) and Cho palace (rows 7..9), cols 3..5.
for (const base of [0, 7]) {
  const center: [number, number] = [base + 1, 4];
  // four corners connect to center
  addDiag([base, 3], center);
  addDiag([base, 5], center);
  addDiag([base + 2, 3], center);
  addDiag([base + 2, 5], center);
}

function canLand(board: Board, side: Side, r: number, c: number): boolean {
  if (!inBounds(r, c)) return false;
  const target = board[r][c];
  return !target || target.side !== side;
}

// ---- Per-piece pseudo-legal move generators ----

function generalGuardMoves(board: Board, from: Pos, piece: Piece): Move[] {
  const moves: Move[] = [];
  const { r, c } = from;
  const side = piece.side;
  // orthogonal palace steps
  const steps: [number, number][] = [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ];
  for (const [nr, nc] of steps) {
    if (inPalace(side, nr, nc) && canLand(board, side, nr, nc)) {
      moves.push({ from, to: { r: nr, c: nc }, captured: board[nr][nc] });
    }
  }
  // diagonal palace steps (only along drawn diagonals)
  const diagList = PALACE_DIAGONALS[key(r, c)] || [];
  for (const k of diagList) {
    const [nr, nc] = k.split(',').map(Number);
    if (inPalace(side, nr, nc) && canLand(board, side, nr, nc)) {
      moves.push({ from, to: { r: nr, c: nc }, captured: board[nr][nc] });
    }
  }
  return moves;
}

function chariotMoves(board: Board, from: Pos, piece: Piece): Move[] {
  const moves: Move[] = [];
  const dirs: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of dirs) {
    let nr = from.r + dr;
    let nc = from.c + dc;
    while (inBounds(nr, nc)) {
      const target = board[nr][nc];
      if (!target) {
        moves.push({ from, to: { r: nr, c: nc }, captured: null });
      } else {
        if (target.side !== piece.side) {
          moves.push({ from, to: { r: nr, c: nc }, captured: target });
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  // Chariot may also slide along palace diagonals.
  const diagList = PALACE_DIAGONALS[key(from.r, from.c)] || [];
  for (const k of diagList) {
    const [mr, mc] = k.split(',').map(Number);
    const dr = mr - from.r;
    const dc = mc - from.c;
    let nr = mr;
    let nc = mc;
    // continue in the same diagonal direction within a palace
    // (max 2 steps possible corner->center->corner)
    while (true) {
      const target = pieceAt(board, nr, nc);
      if (!target) {
        moves.push({ from, to: { r: nr, c: nc }, captured: null });
      } else {
        if (target.side !== piece.side) {
          moves.push({ from, to: { r: nr, c: nc }, captured: target });
        }
        break;
      }
      const next = PALACE_DIAGONALS[key(nr, nc)] || [];
      const cont = next.find((kk) => {
        const [xr, xc] = kk.split(',').map(Number);
        return xr - nr === dr && xc - nc === dc;
      });
      if (!cont) break;
      const [xr, xc] = cont.split(',').map(Number);
      nr = xr;
      nc = xc;
    }
  }
  return moves;
}

function cannonMoves(board: Board, from: Pos, piece: Piece): Move[] {
  const moves: Move[] = [];
  const dirs: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of dirs) {
    let nr = from.r + dr;
    let nc = from.c + dc;
    // find the screen (must jump exactly one piece)
    let screen: Piece | null = null;
    while (inBounds(nr, nc)) {
      const cur = board[nr][nc];
      if (!screen) {
        if (cur) {
          if (cur.type === 'cannon') break; // cannot use a cannon as screen
          screen = cur;
        }
      } else {
        if (!cur) {
          moves.push({ from, to: { r: nr, c: nc }, captured: null });
        } else {
          if (cur.type !== 'cannon' && cur.side !== piece.side) {
            moves.push({ from, to: { r: nr, c: nc }, captured: cur });
          }
          break; // cannot pass a second piece / cannot capture cannon
        }
      }
      nr += dr;
      nc += dc;
    }
  }
  // Palace diagonal cannon jump: corner -> center(screen) -> opposite corner.
  const diagList = PALACE_DIAGONALS[key(from.r, from.c)] || [];
  for (const k of diagList) {
    const [mr, mc] = k.split(',').map(Number);
    const screenPiece = pieceAt(board, mr, mc);
    if (!screenPiece || screenPiece.type === 'cannon') continue;
    const dr = mr - from.r;
    const dc = mc - from.c;
    const tr = mr + dr;
    const tc = mc + dc;
    // target must also be a palace-diagonal continuation
    const cont = (PALACE_DIAGONALS[key(mr, mc)] || []).some((kk) => {
      const [xr, xc] = kk.split(',').map(Number);
      return xr === tr && xc === tc;
    });
    if (!cont) continue;
    const target = pieceAt(board, tr, tc);
    if (!target) {
      moves.push({ from, to: { r: tr, c: tc }, captured: null });
    } else if (target.type !== 'cannon' && target.side !== piece.side) {
      moves.push({ from, to: { r: tr, c: tc }, captured: target });
    }
  }
  return moves;
}

function horseMoves(board: Board, from: Pos, piece: Piece): Move[] {
  const moves: Move[] = [];
  // one orthogonal step (leg), then one diagonal step outward.
  const legs: { leg: [number, number]; diags: [number, number][] }[] = [
    { leg: [-1, 0], diags: [[-1, -1], [-1, 1]] },
    { leg: [1, 0], diags: [[1, -1], [1, 1]] },
    { leg: [0, -1], diags: [[-1, -1], [1, -1]] },
    { leg: [0, 1], diags: [[-1, 1], [1, 1]] },
  ];
  for (const { leg, diags } of legs) {
    const lr = from.r + leg[0];
    const lc = from.c + leg[1];
    if (!inBounds(lr, lc) || board[lr][lc]) continue; // blocked leg
    for (const d of diags) {
      const nr = lr + d[0];
      const nc = lc + d[1];
      if (canLand(board, piece.side, nr, nc)) {
        moves.push({ from, to: { r: nr, c: nc }, captured: board[nr]?.[nc] ?? null });
      }
    }
  }
  return moves;
}

function elephantMoves(board: Board, from: Pos, piece: Piece): Move[] {
  const moves: Move[] = [];
  // one orthogonal step, then two diagonal steps outward; both intermediate
  // squares must be empty.
  const legs: { leg: [number, number]; diags: [number, number][] }[] = [
    { leg: [-1, 0], diags: [[-1, -1], [-1, 1]] },
    { leg: [1, 0], diags: [[1, -1], [1, 1]] },
    { leg: [0, -1], diags: [[-1, -1], [1, -1]] },
    { leg: [0, 1], diags: [[-1, 1], [1, 1]] },
  ];
  for (const { leg, diags } of legs) {
    const lr = from.r + leg[0];
    const lc = from.c + leg[1];
    if (!inBounds(lr, lc) || board[lr][lc]) continue; // blocked at first step
    for (const d of diags) {
      const mr = lr + d[0];
      const mc = lc + d[1];
      if (!inBounds(mr, mc) || board[mr][mc]) continue; // blocked at second step
      const nr = mr + d[0];
      const nc = mc + d[1];
      if (canLand(board, piece.side, nr, nc)) {
        moves.push({ from, to: { r: nr, c: nc }, captured: board[nr]?.[nc] ?? null });
      }
    }
  }
  return moves;
}

function soldierMoves(board: Board, from: Pos, piece: Piece): Move[] {
  const moves: Move[] = [];
  const { r, c } = from;
  const side = piece.side;
  // Cho moves up (decreasing row), Han moves down (increasing row).
  const forward = side === 'cho' ? -1 : 1;
  const candidates: [number, number][] = [
    [r + forward, c], // forward
    [r, c - 1], // left
    [r, c + 1], // right
  ];
  for (const [nr, nc] of candidates) {
    if (canLand(board, side, nr, nc)) {
      moves.push({ from, to: { r: nr, c: nc }, captured: board[nr]?.[nc] ?? null });
    }
  }
  // Palace diagonal forward moves.
  const diagList = PALACE_DIAGONALS[key(r, c)] || [];
  for (const k of diagList) {
    const [nr, nc] = k.split(',').map(Number);
    // only allow diagonal moves that go forward (or sideways-forward within palace)
    const goesForward = forward === -1 ? nr <= r : nr >= r;
    if (goesForward && canLand(board, side, nr, nc)) {
      moves.push({ from, to: { r: nr, c: nc }, captured: board[nr][nc] });
    }
  }
  return moves;
}

export function pseudoMovesFor(board: Board, from: Pos): Move[] {
  const piece = board[from.r][from.c];
  if (!piece) return [];
  switch (piece.type) {
    case 'general':
    case 'guard':
      return generalGuardMoves(board, from, piece);
    case 'chariot':
      return chariotMoves(board, from, piece);
    case 'cannon':
      return cannonMoves(board, from, piece);
    case 'horse':
      return horseMoves(board, from, piece);
    case 'elephant':
      return elephantMoves(board, from, piece);
    case 'soldier':
      return soldierMoves(board, from, piece);
  }
}

// Locate a side's general.
export function findGeneral(board: Board, side: Side): Pos | null {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (p && p.type === 'general' && p.side === side) return { r, c };
    }
  }
  return null;
}

// Is `side`'s general currently attacked by the opponent?
export function isInCheck(board: Board, side: Side): boolean {
  const gen = findGeneral(board, side);
  if (!gen) return true; // general captured = lost
  const foe = opponent(side);
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (!p || p.side !== foe) continue;
      const ms = pseudoMovesFor(board, { r, c });
      if (ms.some((m) => m.to.r === gen.r && m.to.c === gen.c)) return true;
    }
  }
  return false;
}

// The two generals may not face each other on the same file with nothing
// between them (bikjang). Treat a position where the mover creates a clear
// facing as illegal.
export function generalsFacing(board: Board): boolean {
  const g1 = findGeneral(board, 'cho');
  const g2 = findGeneral(board, 'han');
  if (!g1 || !g2 || g1.c !== g2.c) return false;
  const c = g1.c;
  const lo = Math.min(g1.r, g2.r) + 1;
  const hi = Math.max(g1.r, g2.r);
  for (let r = lo; r < hi; r++) {
    if (board[r][c]) return false;
  }
  return true;
}

export function applyMove(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  const piece = next[move.from.r][move.from.c];
  next[move.to.r][move.to.c] = piece;
  next[move.from.r][move.from.c] = null;
  return next;
}

// Legal moves = pseudo moves that do not leave own general in check
// and do not create a bikjang facing.
export function legalMovesFor(board: Board, from: Pos): Move[] {
  const piece = board[from.r][from.c];
  if (!piece) return [];
  return pseudoMovesFor(board, from).filter((m) => {
    const after = applyMove(board, m);
    if (isInCheck(after, piece.side)) return false;
    if (generalsFacing(after)) return false;
    return true;
  });
}

export function allLegalMoves(board: Board, side: Side): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (p && p.side === side) {
        moves.push(...legalMovesFor(board, { r, c }));
      }
    }
  }
  return moves;
}
