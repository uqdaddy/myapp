import { ChessPiece } from './ChessPiece';
import { CBoard, CPiece, CPieceType, CSide } from './engine/chess/types';

const VALUE: Record<CPieceType, number> = { king: 0, queen: 9, rook: 5, bishop: 3, knight: 3, pawn: 1 };
const NAME: Record<CPieceType, string> = { king: '킹', queen: '퀸', rook: '룩', bishop: '비숍', knight: '나이트', pawn: '폰' };

export function ChessCapturedTray({ owner, captured, board, label }: {
  owner: CSide;
  captured: CPiece[];
  board: CBoard;
  label: string;
}) {
  const pieces = captured.filter(p => p.side !== owner);
  const score = board.flat().reduce((sum, p) => sum + (p?.side === owner ? VALUE[p.type] : 0), 0);
  return (
    <div className={`tray chess-tray tray-${owner}`} aria-label={`${label} 잡은 기물`}>
      <div className="tray-head">
        <span className="tray-name">{label}</span>
        <span className="tray-score" title="남은 기물 점수: 퀸 9, 룩 5, 비숍·나이트 3, 폰 1">{score.toFixed(1)}점</span>
      </div>
      <div className="tray-pieces">
        {pieces.length === 0 ? <span className="tray-empty">잡은 말 없음</span> : pieces.map((p, i) => (
          <svg key={i} width="28" height="28" viewBox="0 0 90 90" role="img" aria-label={`${p.side === 'white' ? '백' : '흑'} ${NAME[p.type]}`}>
            <ChessPiece type={p.type} side={p.side} size={90} x={0} y={0} idPrefix={`captured-${owner}-${i}`} />
          </svg>
        ))}
      </div>
    </div>
  );
}
