// 엔진 아이콘(256×256 PNG) — 사이트 왼쪽 위 로고와 같은 느낌: 분홍→청록 둥근 사각형 + 흰 이음표 + 초록 재생 단추.
// 외부 그림·도구 없이 PNG를 직접 쓴다. 실행: node scripts/make-icon.mjs → build/icon.png (electron-builder가 ico로 바꿈)
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const S = 256;
const px = Buffer.alloc(S * S * 4);
/** 겹쳐 칠하기(a: 0~1) */
const put = (x, y, [r, g, b], a = 1) => {
  if (x < 0 || y < 0 || x >= S || y >= S || a <= 0) return;
  const i = (y * S + x) * 4;
  const da = px[i + 3] / 255;
  const oa = a + da * (1 - a);
  for (const [k, v] of [[0, r], [1, g], [2, b]]) px[i + k] = Math.round((v * a + px[i + k] * da * (1 - a)) / oa);
  px[i + 3] = Math.round(oa * 255);
};
/** 거리 함수 d(x,y)<0 안쪽 — 가장자리 1px 부드럽게 */
const fill = (sdf, color, box = [0, 0, S - 1, S - 1]) => {
  for (let y = box[1]; y <= box[3]; y++)
    for (let x = box[0]; x <= box[2]; x++) {
      const d = sdf(x + 0.5, y + 0.5);
      if (d < 0.5) put(x, y, typeof color === "function" ? color(x, y) : color, Math.min(1, 0.5 - d));
    }
};
const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const roundRect = (x0, y0, x1, y1, r) => (x, y) => {
  const dx = Math.max(x0 + r - x, 0, x - (x1 - r));
  const dy = Math.max(y0 + r - y, 0, y - (y1 - r));
  return Math.hypot(dx, dy) - r;
};
const circle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
const ellipse = (cx, cy, rx, ry, rot) => (x, y) => {
  const c = Math.cos(rot), s = Math.sin(rot);
  const u = ((x - cx) * c + (y - cy) * s) / rx, v = (-(x - cx) * s + (y - cy) * c) / ry;
  return (Math.hypot(u, v) - 1) * Math.min(rx, ry);
};
/** 두 점을 잇는 굵은 선(평행사변형 띠) */
const band = (ax, ay, bx, by, h) => (x, y) => {
  if (x < ax || x > bx) return Math.max(ax - x, x - bx);
  const t = (x - ax) / (bx - ax);
  const top = ay + (by - ay) * t;
  return Math.max(top - y, y - (top + h));
};
const box = (x0, y0, x1, y1) => (x, y) => Math.max(x0 - x, x - x1, y0 - y, y - y1);

// 1) 바탕: 왼쪽 위 분홍 → 오른쪽 아래 청록
// 두 색을 바로 섞으면 가운데가 회색으로 탁해져 가운데에 보라를 넣는다
const PINK = [244, 114, 182], VIOLET = [139, 92, 246], TEAL = [20, 184, 166];
const grad = (t) => (t < 0.5 ? lerp(PINK, VIOLET, t * 2) : lerp(VIOLET, TEAL, (t - 0.5) * 2));
fill(roundRect(8, 8, 248, 248, 58), (x, y) => grad(Math.min(1, ((x + y) / (2 * S)) * 1.1)));
// 2) 흰 이음표(♫): 기울어진 머리 두 개 + 기둥 두 개 + 굵은 띠
const WHITE = [255, 255, 255];
fill(band(92, 62, 186, 44, 26), WHITE);
fill(box(92, 62, 104, 170), WHITE);
fill(box(174, 44, 186, 152), WHITE);
fill(ellipse(78, 172, 29, 21, -0.35), WHITE);
fill(ellipse(160, 154, 29, 21, -0.35), WHITE);
// 3) 오른쪽 아래 초록 재생 단추
const GREEN = [16, 185, 129], DARK = [6, 40, 36];
fill(circle(200, 200, 40), DARK);
fill(circle(200, 200, 33), GREEN);
fill((x, y) => Math.max(188 - x, ((x - 188) * 0.5 + Math.abs(y - 200)) - 15), WHITE);

// PNG 쓰기
const crc = (buf) => {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "build", "icon.png");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`아이콘 저장: ${out} (${png.length} 바이트)`);
