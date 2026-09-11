// Landing screen: choose which game to play (Janggi or Gomoku).
export type GameKind = 'janggi' | 'gomoku';

interface Props {
  onSelect: (game: GameKind) => void;
}

// Small SVG preview of a Janggi board corner with a couple of stones — gives
// the card a real "feel" of the game instead of a single glyph.
function JanggiPreview() {
  return (
    <svg className="gs-prev" viewBox="0 0 120 120" role="img" aria-label="장기">
      <defs>
        <linearGradient id="gsjWood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0c78c" />
          <stop offset="100%" stopColor="#cc9450" />
        </linearGradient>
        <radialGradient id="gsjFace" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fffbf0" />
          <stop offset="60%" stopColor="#f0dcae" />
          <stop offset="100%" stopColor="#cba873" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="116" height="116" rx="12" fill="url(#gsjWood)" stroke="#7a4e22" strokeWidth="3" />
      {/* grid */}
      {[26, 47, 68, 89].map((p) => (
        <g key={p}>
          <line x1="26" y1={p} x2="94" y2={p} stroke="#5a3a18" strokeWidth="1" opacity="0.55" />
          <line x1={p + 5} y1="26" x2={p + 5} y2="94" stroke="#5a3a18" strokeWidth="1" opacity="0.55" />
        </g>
      ))}
      {/* two octagonal pieces */}
      {[
        { x: 42, y: 44, label: '楚', cls: 'gs-p-cho' },
        { x: 76, y: 74, label: '漢', cls: 'gs-p-han' },
      ].map((s) => {
        const r = 15;
        const pts = Array.from({ length: 8 }, (_, i) => {
          const a = (Math.PI / 4) * i - Math.PI / 8 - Math.PI / 2;
          return `${(s.x + r * Math.cos(a)).toFixed(1)},${(s.y + r * Math.sin(a)).toFixed(1)}`;
        }).join(' ');
        return (
          <g key={s.label}>
            <polygon points={pts} fill="url(#gsjFace)" stroke="#9a7538" strokeWidth="1" />
            <text x={s.x} y={s.y + 1} className={`gs-glyph ${s.cls}`} textAnchor="middle" dominantBaseline="central">
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Small SVG preview of a Gomoku board corner with black/white stones.
function GomokuPreview() {
  return (
    <svg className="gs-prev" viewBox="0 0 120 120" role="img" aria-label="오목">
      <defs>
        <linearGradient id="gsgWood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f2cf8c" />
          <stop offset="100%" stopColor="#d3a057" />
        </linearGradient>
        <radialGradient id="gsgBlack" cx="36%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#8f8f8f" />
          <stop offset="40%" stopColor="#2c2c2c" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <radialGradient id="gsgWhite" cx="36%" cy="30%" r="82%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f0ede6" />
          <stop offset="100%" stopColor="#cbc6bd" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="116" height="116" rx="12" fill="url(#gsgWood)" stroke="#7a4e22" strokeWidth="3" />
      {[24, 44, 64, 84].map((p) => (
        <g key={p}>
          <line x1="24" y1={p} x2="96" y2={p} stroke="#3d2610" strokeWidth="1" opacity="0.6" />
          <line x1={p} y1="24" x2={p} y2="96" stroke="#3d2610" strokeWidth="1" opacity="0.6" />
        </g>
      ))}
      {/* three stones forming a little run */}
      <circle cx="44" cy="64" r="10.5" fill="url(#gsgBlack)" />
      <circle cx="64" cy="64" r="10.5" fill="url(#gsgWhite)" stroke="#b9b3a8" strokeWidth="0.5" />
      <circle cx="64" cy="44" r="10.5" fill="url(#gsgBlack)" />
      {/* specular highlights */}
      <ellipse cx="40" cy="60" rx="3.4" ry="2.2" fill="rgba(255,255,255,0.55)" />
      <ellipse cx="60" cy="60" rx="3.4" ry="2.2" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="60" cy="40" rx="3.4" ry="2.2" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

export function GameSelect({ onSelect }: Props) {
  return (
    <div className="gameselect">
      <div className="gs-header">
        <div className="gs-logo">棋</div>
        <h1 className="gs-title">보드게임</h1>
        <p className="gs-sub">AI와 대전할 게임을 골라주세요</p>
      </div>

      <div className="gs-grid">
        <button className="gs-card" onClick={() => onSelect('janggi')}>
          <span className="gs-prev-wrap">
            <JanggiPreview />
          </span>
          <span className="gs-name">장기</span>
          <span className="gs-tag">한국식 장기 · AI 대국</span>
        </button>

        <button className="gs-card" onClick={() => onSelect('gomoku')}>
          <span className="gs-prev-wrap">
            <GomokuPreview />
          </span>
          <span className="gs-name">오목</span>
          <span className="gs-tag">15×15 자유형 · AI 대국</span>
        </button>
      </div>
    </div>
  );
}
