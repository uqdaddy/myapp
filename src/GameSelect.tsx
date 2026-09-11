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

// Shared <defs> replicating the exact look of the real boards (Board.tsx and
// GomokuBoard.tsx): procedural wood grain, vignette, ivory/glossy stones with
// bevels and specular sheen. IDs are prefixed `gsp-` to avoid clashing.
function PreviewDefs() {
  return (
    <defs>
      {/* --- board wood --- */}
      <linearGradient id="gsp-wood" x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#f0c78c" />
        <stop offset="40%" stopColor="#e3b06d" />
        <stop offset="100%" stopColor="#cc9450" />
      </linearGradient>
      <linearGradient id="gsp-border" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8a5a2c" />
        <stop offset="50%" stopColor="#6e451f" />
        <stop offset="100%" stopColor="#4a2d12" />
      </linearGradient>
      <radialGradient id="gsp-vignette" cx="50%" cy="45%" r="72%">
        <stop offset="55%" stopColor="rgba(0,0,0,0)" />
        <stop offset="100%" stopColor="rgba(55,32,8,0.34)" />
      </radialGradient>
      <filter id="gsp-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.03 0.14"
          numOctaves={4}
          seed={7}
          stitchTiles="stitch"
          result="noise"
        />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0.42
                  0 0 0 0 0.27
                  0 0 0 0 0.10
                  0 0 0 0.7 0"
        />
      </filter>

      {/* --- janggi ivory stone --- */}
      <radialGradient id="gsp-stoneFace" cx="35%" cy="28%" r="82%">
        <stop offset="0%" stopColor="#fffdf5" />
        <stop offset="28%" stopColor="#f9eecf" />
        <stop offset="68%" stopColor="#e6d0a1" />
        <stop offset="100%" stopColor="#bd9d68" />
      </radialGradient>
      <linearGradient id="gsp-stoneRim" x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0%" stopColor="#efd9a8" />
        <stop offset="45%" stopColor="#b8965b" />
        <stop offset="100%" stopColor="#71531f" />
      </linearGradient>

      {/* --- gomoku stones --- */}
      <radialGradient id="gsp-black" cx="36%" cy="30%" r="80%">
        <stop offset="0%" stopColor="#8f8f8f" />
        <stop offset="28%" stopColor="#3a3a3a" />
        <stop offset="70%" stopColor="#141414" />
        <stop offset="100%" stopColor="#000" />
      </radialGradient>
      <radialGradient id="gsp-white" cx="36%" cy="30%" r="82%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="55%" stopColor="#f3f0ea" />
        <stop offset="100%" stopColor="#cfcac2" />
      </radialGradient>

      <filter id="gsp-shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1.4" stdDeviation="1.1" floodColor="#000" floodOpacity="0.5" />
      </filter>
    </defs>
  );
}

// Common board frame + surface (wood grain + vignette) shared by both previews.
function boardFrame() {
  return (
    <>
      {/* outer wooden border */}
      <rect x="0" y="0" width="120" height="120" rx="12" fill="url(#gsp-border)" />
      {/* inner bevel */}
      <rect x="5" y="5" width="110" height="110" rx="8" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.2" />
      <rect x="6.2" y="6.2" width="107.6" height="107.6" rx="7" fill="none" stroke="rgba(255,225,170,0.25)" strokeWidth="0.8" />
      {/* playing surface: base wood + procedural grain + vignette */}
      <rect x="7" y="7" width="106" height="106" rx="4" fill="url(#gsp-wood)" />
      <rect x="7" y="7" width="106" height="106" rx="4" filter="url(#gsp-grain)" opacity={0.5} />
      <rect x="7" y="7" width="106" height="106" rx="4" fill="url(#gsp-vignette)" />
    </>
  );
}

// Janggi preview: real board texture + a Han chariot (車, red) and a Cho horse
// (馬, green) sitting on grid intersections.
function JanggiPreview() {
  const lo = GRID[0];
  const hi = GRID[GRID.length - 1];
  const pieces = [
    { cx: GRID[2], cy: GRID[1], label: '車', cls: 'gs-p-han' }, // 한나라 차 (red)
    { cx: GRID[1], cy: GRID[2], label: '馬', cls: 'gs-p-cho' }, // 초나라 마 (green)
  ];
  const R = 12;
  const faceR = R - 1.6;
  return (
    <svg className="gs-prev" viewBox="0 0 120 120" role="img" aria-label="장기">
      <PreviewDefs />
      {boardFrame()}
      {/* grid: horizontal + vertical lines at the SAME coordinates */}
      {GRID.map((p) => (
        <g key={p}>
          <line x1={lo} y1={p} x2={hi} y2={p} stroke="#4a2f14" strokeWidth="1" opacity="0.85" />
          <line x1={p} y1={lo} x2={p} y2={hi} stroke="#4a2f14" strokeWidth="1" opacity="0.85" />
        </g>
      ))}
      {/* octagonal pieces centered on intersections */}
      {pieces.map((s) => (
        <g key={s.label} filter="url(#gsp-shadow)">
          {/* wooden rim */}
          <polygon points={octagon(s.cx, s.cy, R)} fill="url(#gsp-stoneRim)" />
          {/* dark seam */}
          <polygon points={octagon(s.cx, s.cy, faceR + 0.7)} fill="none" stroke="rgba(70,45,15,0.45)" strokeWidth="0.6" />
          {/* ivory face */}
          <polygon points={octagon(s.cx, s.cy, faceR)} fill="url(#gsp-stoneFace)" stroke="rgba(120,85,40,0.5)" strokeWidth="0.5" />
          {/* specular sheen */}
          <ellipse cx={s.cx - R * 0.28} cy={s.cy - R * 0.34} rx={R * 0.5} ry={R * 0.32} fill="rgba(255,255,255,0.45)" />
          {/* engraved inner ring in side color */}
          <polygon
            points={octagon(s.cx, s.cy, R - 3.6)}
            fill="none"
            stroke={s.cls === 'gs-p-han' ? 'rgba(158,21,21,0.75)' : 'rgba(7,90,48,0.75)'}
            strokeWidth="1"
          />
          {/* emboss + colored glyph */}
          <text x={s.cx + 0.5} y={s.cy + 1} className="gs-glyph gs-p-emboss" textAnchor="middle" dominantBaseline="central">
            {s.label}
          </text>
          <text x={s.cx} y={s.cy + 0.5} className={`gs-glyph ${s.cls}`} textAnchor="middle" dominantBaseline="central">
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Gomoku preview: real board texture + glossy black/white stones on grid
// intersections (diameter < grid gap, so they never overlap).
function GomokuPreview() {
  const lo = GRID[0];
  const hi = GRID[GRID.length - 1];
  const R = 10.5;
  const stones: { cx: number; cy: number; color: 'black' | 'white' }[] = [
    { cx: GRID[1], cy: GRID[2], color: 'black' },
    { cx: GRID[2], cy: GRID[2], color: 'white' },
    { cx: GRID[2], cy: GRID[1], color: 'black' },
  ];
  return (
    <svg className="gs-prev" viewBox="0 0 120 120" role="img" aria-label="오목">
      <PreviewDefs />
      {boardFrame()}
      {GRID.map((p) => (
        <g key={p}>
          <line x1={lo} y1={p} x2={hi} y2={p} stroke="#3d2610" strokeWidth="1" opacity="0.85" />
          <line x1={p} y1={lo} x2={p} y2={hi} stroke="#3d2610" strokeWidth="1" opacity="0.85" />
        </g>
      ))}
      {stones.map((s, i) => (
        <g key={i} filter="url(#gsp-shadow)">
          <circle
            cx={s.cx}
            cy={s.cy}
            r={R}
            fill={s.color === 'black' ? 'url(#gsp-black)' : 'url(#gsp-white)'}
            stroke={s.color === 'white' ? 'rgba(150,145,135,0.6)' : 'rgba(0,0,0,0.5)'}
            strokeWidth={0.5}
          />
          {/* broad soft sheen */}
          <ellipse
            cx={s.cx - R * 0.26}
            cy={s.cy - R * 0.3}
            rx={R * 0.56}
            ry={R * 0.44}
            fill={s.color === 'black' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.4)'}
          />
          {/* tight specular highlight */}
          <ellipse
            cx={s.cx - R * 0.3}
            cy={s.cy - R * 0.36}
            rx={R * 0.3}
            ry={R * 0.2}
            fill={s.color === 'black' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.95)'}
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
