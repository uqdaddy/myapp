// Landing screen: choose which game to play (Janggi or Gomoku).
export type GameKind = 'janggi' | 'gomoku';

interface Props {
  onSelect: (game: GameKind) => void;
}

export function GameSelect({ onSelect }: Props) {
  return (
    <div className="gameselect">
      <h1 className="gs-title">보드게임</h1>
      <p className="gs-sub">AI와 대전할 게임을 골라주세요</p>

      <div className="gs-grid">
        <button className="gs-card" onClick={() => onSelect('janggi')}>
          <span className="gs-icon janggi">楚</span>
          <span className="gs-name">장기</span>
          <span className="gs-desc">한국 장기 · Fairy-Stockfish</span>
        </button>

        <button className="gs-card" onClick={() => onSelect('gomoku')}>
          <span className="gs-icon gomoku">
            <span className="gs-stone black" />
            <span className="gs-stone white" />
          </span>
          <span className="gs-name">오목</span>
          <span className="gs-desc">15×15 · 자유형</span>
        </button>
      </div>
    </div>
  );
}
