import assert from 'node:assert/strict';
import { initialState } from '../src/engine/chess/board';
import { allLegalMoves, advanceState, legalMovesFor } from '../src/engine/chess/moves';
import { getStatus } from '../src/engine/chess/game';
import { CState } from '../src/engine/chess/types';
import { pseudoMovesFor, generalsFacing } from '../src/engine/moves';
import { Board } from '../src/engine/types';
import { emptyBoard, idx } from '../src/engine/gomoku/types';
import { hasWon } from '../src/engine/gomoku/rules';
import { chooseGomokuMove } from '../src/engine/gomoku/ai';

let count = 0;
function check(name: string, test: () => void) { test(); count++; console.log(`PASS ${name}`); }
function state(): CState { return { ...initialState(), board: Array.from({length:8},()=>Array(8).fill(null)) }; }
function move(s: CState, r: number, c: number, nr: number, nc: number) {
  const m = allLegalMoves(s,s.toMove).find(m=>m.from.r===r&&m.from.c===c&&m.to.r===nr&&m.to.c===nc);
  assert(m); return advanceState(s,m);
}
check('Chess initial perft depth 2 = 400',()=>{
  const s=initialState(); assert.equal(allLegalMoves(s,'white').length,20);
  assert.equal(allLegalMoves(s,'white').reduce((n,m)=>n+allLegalMoves(advanceState(s,m),'black').length,0),400);
});
check('En passant removes the passed pawn and resets clock',()=>{
  let s=initialState(); for(const q of [[6,4,4,4],[1,0,2,0],[4,4,3,4],[1,3,3,3]])s=move(s,...q as [number,number,number,number]);
  const ep=legalMovesFor(s,{r:3,c:4}).find(m=>m.enPassant); assert(ep?.captured); s=advanceState(s,ep); assert.equal(s.board[3][3],null);assert.equal(s.halfmove,0);
});
check('Castling allowed on clear safe path; rejected through check',()=>{
  const s=state();s.board[7][4]={type:'king',side:'white'};s.board[7][7]={type:'rook',side:'white'};s.board[0][4]={type:'king',side:'black'};
  assert(legalMovesFor(s,{r:7,c:4}).some(m=>m.castle==='king'));s.board[0][5]={type:'rook',side:'black'};
  assert(!legalMovesFor(s,{r:7,c:4}).some(m=>m.castle==='king'));
});
check('Promotion has all four choices',()=>{
  const s=state();s.board[7][4]={type:'king',side:'white'};s.board[0][7]={type:'king',side:'black'};s.board[1][0]={type:'pawn',side:'white'};
  assert.equal(legalMovesFor(s,{r:1,c:0}).filter(m=>m.promotion).length,4);
});
check('En passant cannot expose own king to rook check',()=>{
  const s=state();s.board[3][0]={type:'king',side:'white'};s.board[0][0]={type:'king',side:'black'};s.board[3][4]={type:'pawn',side:'white'};s.board[3][5]={type:'pawn',side:'black'};s.board[3][7]={type:'rook',side:'black'};s.epTarget={r:2,c:5};assert(!legalMovesFor(s,{r:3,c:4}).some(m=>m.enPassant));
});
check('App 50-move threshold and pawn reset',()=>{
  const s=initialState();s.halfmove=100;assert.deepEqual(getStatus(s),{kind:'draw',reason:'fifty'});assert.equal(move(s,6,4,4,4).halfmove,0);
});
check('Fools mate',()=>{
  let s=initialState();for(const q of [[6,5,5,5],[1,4,3,4],[6,6,4,6],[0,3,4,7]])s=move(s,...q as [number,number,number,number]);
  assert.equal(getStatus(s).kind,'checkmate');
});
check('Stalemate',()=>{
  const s=state();s.toMove='black';s.board[0][0]={type:'king',side:'black'};s.board[2][2]={type:'king',side:'white'};s.board[2][1]={type:'queen',side:'white'};assert.equal(getStatus(s).kind,'stalemate');
});
check('Same-color bishops are insufficient, opposite colors are not',()=>{
  const s=state();s.board[7][4]={type:'king',side:'white'};s.board[0][4]={type:'king',side:'black'};s.board[7][2]={type:'bishop',side:'white'};s.board[0][5]={type:'bishop',side:'black'};assert.equal(getStatus(s).kind,'draw');s.board[0][5]=null;s.board[0][2]={type:'bishop',side:'black'};assert.equal(getStatus(s).kind,'playing');
});
const jb=():Board=>Array.from({length:10},()=>Array(9).fill(null));
check('Janggi cannon requires a non-cannon screen; cannot capture cannon',()=>{
 const b=jb();b[5][0]={type:'cannon',side:'cho'};assert.equal(pseudoMovesFor(b,{r:5,c:0}).length,0);b[5][2]={type:'soldier',side:'cho'};assert(pseudoMovesFor(b,{r:5,c:0}).some(m=>m.to.c===3));b[5][4]={type:'cannon',side:'han'};assert(!pseudoMovesFor(b,{r:5,c:0}).some(m=>m.to.c===4));b[5][2]={type:'cannon',side:'cho'};assert.equal(pseudoMovesFor(b,{r:5,c:0}).length,0);
});
check('Janggi horse leg blocks movement',()=>{
 const b=jb();b[5][4]={type:'horse',side:'cho'};assert(pseudoMovesFor(b,{r:5,c:4}).some(m=>m.to.r===3&&m.to.c===3));b[4][4]={type:'soldier',side:'cho'};assert(!pseudoMovesFor(b,{r:5,c:4}).some(m=>m.to.r===3&&m.to.c===3));
});
check('Janggi palace diagonal and facing detection',()=>{
 const b=jb();b[8][4]={type:'general',side:'cho'};b[1][4]={type:'general',side:'han'};assert(generalsFacing(b));assert.equal(pseudoMovesFor(b,{r:8,c:4}).length,8);b[5][4]={type:'soldier',side:'cho'};assert(!generalsFacing(b));
});
check('Janggi elephant is blocked at either intermediate square',()=>{
  const b=jb();b[6][4]={type:'elephant',side:'cho'};const reaches=()=>pseudoMovesFor(b,{r:6,c:4}).some(m=>m.to.r===3&&m.to.c===2);assert(reaches());b[5][4]={type:'soldier',side:'cho'};assert(!reaches());b[5][4]=null;b[4][3]={type:'soldier',side:'cho'};assert(!reaches());
});
check('Freestyle gomoku permits overlines',()=>{const b=emptyBoard();for(let c=2;c<8;c++)b[idx(7,c)]='black';assert(hasWon(b,'black'));});
for(const difficulty of ['easy','normal','hard'] as const){
 check(`Gomoku ${difficulty}: immediate win and block`,()=>{
  for(const color of ['black','white'] as const){const b=emptyBoard();for(let c=4;c<8;c++)b[idx(7,c)]=color;b[idx(7,3)]=color==='black'?'white':'black';const result=chooseGomokuMove(b,'black',difficulty,100);assert.deepEqual(result.move,{r:7,c:8});}
 });
 check(`Gomoku ${difficulty}: timeout preserves board and finite result`,()=>{
  const b=emptyBoard();b[idx(7,7)]='black';b[idx(8,8)]='white';const original=b.slice();const start=performance.now();const result=chooseGomokuMove(b,'black',difficulty,1);assert.deepEqual(b,original);assert(Number.isFinite(result.score));assert(result.move&&b[idx(result.move.r,result.move.c)]===null);console.log('elapsed ms',Math.round(performance.now()-start));
 });
}
console.log(`${count} rule / AI checks passed`);
