// Generates simple PNG app icons with no external dependencies.
// Draws a wood-colored rounded square with a red "楚"-style disc motif.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(size, draw) {
  const bytesPerPixel = 4;
  const rowLen = size * bytesPerPixel;
  const raw = Buffer.alloc((rowLen + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowLen + 1)] = 0; // filter type 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size);
      const off = y * (rowLen + 1) + 1 + x * bytesPerPixel;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function draw(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = Math.hypot(x - cx, y - cy);
  const radius = size * 0.5;
  // rounded-ish: fill whole square with wood, inner red disc
  const wood = [200, 150, 90, 255];
  const disc = [176, 32, 32, 255];
  const ring = [247, 237, 214, 255];
  const discR = size * 0.34;
  const ringR = size * 0.38;
  if (r < discR) return disc;
  if (r < ringR) return ring;
  return wood;
}

mkdirSync('public', { recursive: true });
for (const size of [192, 512]) {
  const png = makePng(size, draw);
  writeFileSync(`public/icon-${size}.png`, png);
  console.log(`wrote public/icon-${size}.png (${png.length} bytes)`);
}
