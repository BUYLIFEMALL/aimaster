// 떡상 시장 탐색 화면 검수 서버 — 실제 컴포넌트를 합성 데이터로 띄운다(외부 호출 0). 실행 후 출력된 주소를 ego lite에서 연다. 종료: Ctrl+C
// 먼저 `npm run build`로 .next/static CSS가 있어야 한다.
import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: ["tests/finder-fixture-entry.tsx"], bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "test-only-navigation", setup(b) { b.onResolve({ filter: /^next\/link$/ }, () => ({ path: path.resolve("tests/fixture-adapters.tsx") })); } }],
});
const cssFiles = (await fs.readdir(".next/static", { recursive: true })).filter((f) => f.endsWith(".css"));
const css = (await Promise.all(cssFiles.map((f) => fs.readFile(path.join(".next/static", f), "utf8")))).join("\n");
const server = createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url === "/app.js") { res.setHeader("Content-Type", "application/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url === "/app.css") { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else { res.setHeader("Content-Type", "text/html;charset=utf-8"); res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body class="bg-yt-bg"><div id="root"></div><script src="/app.js"></script></body></html>'); }
});
const port = Number(process.env.PORT || 4791);
server.listen(port, "127.0.0.1", () => console.log(`fixture http://127.0.0.1:${port}`));
