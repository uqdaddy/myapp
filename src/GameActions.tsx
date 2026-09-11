interface Props {
  onExit?: () => void;
  onNewGame: () => void;
}

export function GameActions({ onExit, onNewGame }: Props) {
  return (
    <div className="game-actions">
      <button className="btn" onClick={onExit}>게임선택</button>
      <button className="btn primary" onClick={onNewGame}>새게임</button>
    </div>
  );
}
