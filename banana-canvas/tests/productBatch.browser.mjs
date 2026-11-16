// 시험 전용 격리 서버(ECOM-20261116-07): 실제 ProductBatchBoard + 실제 src/app/globals.css를 127.0.0.1에만 올린다.
// - 로그인·운영 DB·Storage·유료 API 없음(이 화면은 브라우저 안 캔버스 합성만 하고 서버 호출이 없다).
// - CSP로 같은 출처 외 요청을 막는다(외부 네트워크 차단). 앱 전체 build·배포 없음 — esbuild로 이 진입점만 번들.
// - 시험 사진(PNG)과 25MB 경계 파일(정확히 25MB / 25MB+1)을 test-artifacts/pb-fixtures/에 만든다.
// 실행: node tests/productBatch.browser.mjs [--minutes 30]  → 출력된 주소를 지정 브라우저(Claude Code=ego lite)로 열어 검수.
import { build } from "esbuild";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { deflateSync, crc32 } from "node:zlib";
import path from "node:path";

const MAX = 25 * 1024 * 1024; // src/lib/productPhotoHandoff.ts PRODUCT_PHOTO_MAX_BYTES
const fixtures = path.resolve("test-artifacts/pb-fixtures");
await mkdir(fixtures, { recursive: true });

function png(w, h, [r, g, b], padTo = 0) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.alloc(1 + w * 3); for (let x = 0; x < w; x++) row.set([r, g, b], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: h }, (_, y) => { const rr = Buffer.from(row); if (y % 40 < 20) rr.fill(255, 1, 1 + Math.floor(w / 4) * 3); return rr; }));
  const head = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw))]);
  const end = chunk("IEND", Buffer.alloc(0));
  if (!padTo) return Buffer.concat([head, end]);
  // 경계 파일: 디코딩 가능한 PNG 앞부분 + 보조 청크(tEXt)로 정확한 바이트 수를 맞춘다
  const fill = padTo - head.length - end.length - 12;
  if (fill < 0) throw new Error("padTo too small");
  return Buffer.concat([head, chunk("tEXt", Buffer.alloc(fill, 0x41)), end]);
}

const files = {
  "A001_main.png": png(800, 800, [220, 60, 60]),
  "A001_sub1.png": png(400, 400, [40, 120, 220]),
  "A002_main.png": png(800, 600, [40, 160, 90]),
  "A002_sub1.png": png(400, 400, [240, 190, 30]),
  "B25_main.png": png(64, 64, [120, 60, 200], MAX),
  "B26_main.png": png(64, 64, [120, 60, 200], MAX + 1),
  "C25_common_sub.png": png(64, 64, [30, 30, 30], MAX),
  "C26_common_sub.png": png(64, 64, [30, 30, 30], MAX + 1),
  // ECOM-10: 같은 이름 회귀 — 직접 추가용 파랑 Z_badge, 공용 서브용 빨강 same/Z_badge, 교체용 초록 Y_badge
  "Z_badge.png": png(200, 200, [0, 0, 255]),
  "Y_badge.png": png(200, 200, [0, 200, 0]),
  "same/Z_badge.png": png(200, 200, [255, 0, 0]),
};
await mkdir(path.join(fixtures, "same"), { recursive: true });
for (const [n, b] of Object.entries(files)) await writeFile(path.join(fixtures, n), b);
console.log("fixtures", fixtures, Object.fromEntries(Object.entries(files).map(([n, b]) => [n, b.length])));

const bundle = await build({
  entryPoints: ["tests/productBatch.browser-entry.tsx"], bundle: true, write: false, format: "iife", platform: "browser",
  jsx: "automatic", logLevel: "silent", alias: { "@": path.resolve("src") },
  define: { "process.env.NODE_ENV": '"production"' },
});
const css = await readFile("src/app/globals.css", "utf8");
// 실제 화면(/batch)과 같은 바깥 틀: 작업 공간 본문 안 너비 제한 없이 화면 폭을 따름
const PAGE = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PB isolated</title><link rel="stylesheet" href="/test.css"></head><body><main style="padding:16px"><div id="root"></div></main><script src="/test.js"></script></body></html>';
const CSP = "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' blob: data:; font-src 'self' data:; worker-src 'self' blob:";
const blocked = [];
const server = createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", CSP);
  if (req.url.startsWith("/test.js")) { res.setHeader("Content-Type", "application/javascript"); return res.end(bundle.outputFiles[0].text); }
  if (req.url.startsWith("/test.css")) { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  if (req.url === "/" || req.url.startsWith("/?")) { res.setHeader("Content-Type", "text/html;charset=utf-8"); return res.end(PAGE); }
  blocked.push(req.url); res.statusCode = 404; res.end("not found");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
console.log(`ORIGIN http://127.0.0.1:${server.address().port}/`);
const idx = process.argv.indexOf("--minutes");
const minutes = idx > 0 ? Number(process.argv[idx + 1]) : 30;
setTimeout(() => { console.log("unexpected paths", blocked); server.close(); process.exit(0); }, minutes * 60_000);
