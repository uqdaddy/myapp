// Generates the app icons (PNG) by rendering an SVG of an octagonal Janggi
// stone with the general character "楚" and rasterizing it with headless Chrome.
// This replaces the old plain-red-disc icon so the app is recognizable as Janggi.
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Octagon points centered in a viewBox of `s`, radius `rad`, flat top/bottom.
function octagon(cx, cy, rad) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 8 - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function svg(size) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const outer = octagon(cx, cy, s * 0.46);
  const rim = octagon(cx, cy, s * 0.4);
  const face = octagon(cx, cy, s * 0.37);
  const ring = octagon(cx, cy, s * 0.31);
  const fontSize = s * 0.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="face" cx="38%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#fff7e6"/>
      <stop offset="55%" stop-color="#f2ddb0"/>
      <stop offset="100%" stop-color="#d9bd83"/>
    </radialGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e6c98f"/>
      <stop offset="100%" stop-color="#8a6a3a"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${s * 0.22}" fill="#7a4f24"/>
  <polygon points="${outer}" fill="#5c3a18"/>
  <polygon points="${rim}" fill="url(#rim)"/>
  <polygon points="${face}" fill="url(#face)" stroke="#6b4a22" stroke-width="${s * 0.006}"/>
  <polygon points="${ring}" fill="none" stroke="#0a6d3a" stroke-width="${s * 0.02}"/>
  <text x="${cx}" y="${cy + fontSize * 0.03}" text-anchor="middle" dominant-baseline="central"
        font-family="'Nanum Myeongjo','Apple SD Gothic Neo',serif" font-weight="900"
        font-size="${fontSize}" fill="#075a30">楚</text>
</svg>`;
}

async function main() {
  mkdirSync('public', { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}</style></head><body>${svg(size)}</body></html>`;
    await page.setContent(html, { waitUntil: 'networkidle' });
    const el = await page.$('svg');
    const buf = await el.screenshot({ omitBackground: true });
    writeFileSync(`public/icon-${size}.png`, buf);
    console.log(`wrote public/icon-${size}.png (${buf.length} bytes)`);
    await page.close();
  }
  await browser.close();
}

main();
