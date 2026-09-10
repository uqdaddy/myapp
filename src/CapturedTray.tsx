import { Piece, Side } from './engine/types';
import { PIECE_LABEL } from './pieces';

interface Props {
  // The side that OWNS this tray (the capturer). It displays the opponent
  // pieces this side has captured.
  owner: Side;
  captured: Piece[]; // opponent pieces captured by `owner`
  score: number; // owner's current material score
  label: string; // e.g. "나 (초)" or "AI (한)"
}

export function CapturedTray({ owner, captured, score, label }: Props) {
  return (
    <div className={`tray tray-${owner}`}>
      <div className="tray-head">
        <span className={`tray-name name-${owner}`}>{label}</span>
        <span className="tray-score">{score.toFixed(1)}점</span>
      </div>
      <div className="tray-pieces">
        {captured.length === 0 ? (
          <span className="tray-empty">잡은 말 없음</span>
        ) : (
          captured.map((p, i) => (
            <span key={i} className={`cap-piece cap-${p.side}`}>
              {PIECE_LABEL[p.side][p.type]}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
