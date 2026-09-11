// Landing screen: choose which game to play (Janggi or Gomoku).
export type GameKind = 'janggi' | 'gomoku';

interface Props {
  onSelect: (game: GameKind) => void;
}

// A single shared 4x4 grid for both previews so lines and stones line up.
// Intersections sit at these coordinates (gap = 25) inside a 120x120 canvas.
const GRID = [20, 45, 70, 95];

function octagon(cx: number, cy: number, r: number): string {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i - Math.PI / 8 - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

// Small SVG preview of a Janggi board with two pieces sitting exactly on grid
// intersections (pieces are placed on line crossings in Janggi).
function JanggiPreview() {
  const lo = GRID[0];
  const hi = GRID[GRID.length - 1];
  // Pieces on intersections two cells apart so they never overlap.
  const pieces = [
    { cx: GRID[1], cy: GRID[2], label: '楚', cls: 'gs-p-cho' },
    { cx: GRID[2], cy: GRID[1], label: '漢', cls: 'gs-p-han' },
  ];
  const R = 11;
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
      {/* grid: horizontal + vertical lines at the SAME coordinates */}
      {GRID.map((p) => (
        <g key={p}>
          <line x1={lo} y1={p} x2={hi} y2={p} stroke="#5a3a18" strokeWidth="1" opacity="0.55" />
          <line x1={p} y1={lo} x2={p} y2={hi} stroke="#5a3a18" strokeWidth="1" opacity="0.55" />
        </g>
      ))}
      {/* octagonal pieces centered on intersections */}
      {pieces.map((s) => (
        <g key={s.label}>
          <polygon points={octagon(s.cx, s.cy, R)} fill="url(#gsjFace)" stroke="#9a7538" strokeWidth="1" />
          <text x={s.cx} y={s.cy + 0.5} className={`gs-glyph ${s.cls}`} textAnchor="middle" dominantBaseline="central">
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Small SVG preview of a Gomoku board with non-overlapping black/white stones
// sitting on grid intersections (diameter < grid gap, so they never touch).
function GomokuPreview() {
  const lo = GRID[0];
  const hi = GRID[GRID.length - 1];
  const R = 10.5; // diameter 21 < gap 25 -> clear space between adjacent stones
  const stones: { cx: number; cy: number; color: 'black' | 'white' }[] = [
    { cx: GRID[1], cy: GRID[2], color: 'black' },
    { cx: GRID[2], cy: GRID[2], color: 'white' },
    { cx: GRID[2], cy: GRID[1], color: 'black' },
  ];
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
      {GRID.map((p) => (
        <g key={p}>
          <line x1={lo} y1={p} x2={hi} y2={p} stroke="#3d2610" strokeWidth="1" opacity="0.6" />
          <line x1={p} y1={lo} x2={p} y2={hi} stroke="#3d2610" strokeWidth="1" opacity="0.6" />
        </g>
      ))}
      {stones.map((s, i) => (
        <g key={i}>
          <circle
            cx={s.cx}
            cy={s.cy}
            r={R}
            fill={s.color === 'black' ? 'url(#gsgBlack)' : 'url(#gsgWhite)'}
            stroke={s.color === 'white' ? '#b9b3a8' : 'none'}
            strokeWidth={s.color === 'white' ? 0.5 : 0}
          />
          <ellipse
            cx={s.cx - R * 0.32}
            cy={s.cy - R * 0.36}
            rx={R * 0.3}
            ry={R * 0.2}
            fill={s.color === 'black' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.9)'}
          />
        </g>
      ))}
    </svg>
  );
}

export function GameSelect({ onSelect }: Props) {
  return (
    <div className="gameselect">
      <div className="gs-header">
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
