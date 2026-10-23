// 보정 도구(v1.26): 시험 사진들을 실제 Chrome(보이는 창)에서 브라우저 안 얼굴 인식으로 돌려
// 이마 위(점 10)·턱(점 152)·볼 끝 위치를 출력한다. 정수리 추정 계수(FACE_CROWN_ALPHA)를 정할 때 쓴다. AI 호출 없음.
// 실행: node tests/face-calibrate.mjs test-artifacts/a.png test-artifacts/b.png ...
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const files = process.argv.slice(2);
if (!files.length) { console.error("사진 경로를 넣어 주세요."); process.exit(1); }
const entry = `import { rawLandmarksLocal } from "./src/lib/portrait/faceLocal"; window.__raw = rawLandmarksLocal;`;
const bundle = await build({ stdin: { contents: entry, resolveDir: path.resolve("."), loader: "ts" }, bundle: true, write: false, format: "iife", platform: "browser", logLevel: "silent", alias: { "@": path.resolve("src") } });
const types = { ".js": "application/javascript", ".wasm": "application/wasm", ".task": "application/octet-stream", ".png": "image/png", ".jpg": "image/jpeg" };
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  try {
    if (u === "/bundle.js") { res.setHeader("Content-Type", types[".js"]); return res.end(bundle.outputFiles[0].text); }
    if (u.startsWith("/mediapipe/")) { res.setHeader("Content-Type", types[path.extname(u)] ?? "application/octet-stream"); return res.end(await readFile(path.join("public", u))); }
    if (u.startsWith("/img/")) { res.setHeader("Content-Type", types[path.extname(u)] ?? "image/png"); return res.end(await readFile(u.slice(5))); }
    res.setHeader("Content-Type", "text/html;charset=utf-8"); res.end('<!doctype html><meta charset="utf-8"><body>보정 중<script src="/bundle.js"></script></body>');
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: false }); } catch { browser = await chromium.launch({ headless: false }); }
const page = await browser.newPage();
await page.goto(origin);
for (const f of files) {
  const r = await page.evaluate((src) => window.__raw(src), `/img/${f}`);
  console.log(JSON.stringify({ file: f, ...r }));
}
await browser.close();
server.close();
