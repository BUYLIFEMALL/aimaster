// Isolated UI fixture. This server never authenticates a real member or calls paid APIs.
// It does not add a bypass or preview route to the production application.
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import path from "node:path";
await mkdir("test-artifacts", { recursive: true });
const jpeg = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#cfc5c2" } }).composite([{ input: Buffer.from('<svg width="640" height="480"><rect x="60" y="60" width="220" height="300" rx="20" fill="#e9ded5"/><circle cx="390" cy="190" r="90" fill="#ad8995"/><rect x="310" y="290" width="230" height="100" rx="15" fill="#896375"/></svg>') }]).jpeg().toBuffer();
await writeFile("test-artifacts/sample.jpg", jpeg);
const bundle = await build({ entryPoints: ["tests/browser-entry.tsx"], bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", alias: { "@": path.resolve("src") }, define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent" });
const css = await readFile("src/app/globals.css", "utf8");
const page = '<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI 포토 리메이크 자동화 · 모의 화면 검수</title><link rel="stylesheet" href="/test.css"><body><div id="root"></div><script src="/test.js"></script></body></html>';
const log = [];
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url === "/test.js") { res.setHeader("Content-Type", "application/javascript"); return res.end(bundle.outputFiles[0].text); }
  if (req.url === "/test.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  if (req.url === "/sample.jpg") { res.setHeader("Content-Type", "image/jpeg"); return res.end(jpeg); }
  if (req.url === "/fixture-log") { res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify(log)); }
  if (req.url?.startsWith("/api/")) {
    const chunks = []; for await (const c of req) chunks.push(c); const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    log.push({ path: req.url, mode: body.mode, consent: body.consent, objectCount: body.objects?.length, prompt: body.prompt, options: body.options, background: body.background });
    res.setHeader("Content-Type", "application/json");
    if (body.prompt === "키없음") { res.statusCode = 400; return res.end(JSON.stringify({ needKey: true, error: "본인 Gemini API 키를 등록해 주세요." })); }
    if (req.url === "/api/suggest") return res.end(JSON.stringify({ prompt: "첫 번째 사물을 오른손에 들고 원래 배경과 얼굴을 유지해 주세요." }));
    const factor = body.mode === "restore" ? body.options.upscale : 1; const output = await sharp(jpeg).resize(640 * factor, 480 * factor).jpeg().toBuffer();
    return res.end(JSON.stringify({ data: output.toString("base64"), mimeType: "image/jpeg", width: 640 * factor, height: 480 * factor, model: body.model, mode: body.mode, createdAt: Date.now(), limited: false }));
  }
  res.setHeader("Content-Type", "text/html;charset=utf-8"); res.end(page);
});
server.listen(3044, "127.0.0.1", () => console.log("모의 화면 검수: http://127.0.0.1:3044/studio (실제 회원 인증·AI 호출 아님)"));
