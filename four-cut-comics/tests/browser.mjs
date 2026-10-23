// 실제 Chrome(보이는 창)에서 4컷 만화 스튜디오의 핵심 흐름을 검수한다(2026-10-19 추가).
// 서버 API(/api/script·character·panel·balloon)는 시험용 모의 응답 — 실제 AI 호출·비용 없음.
// 시험 그림은 이 스크립트가 직접 만든 단색 PNG라 외부 파일이 필요 없다.
// 실행: npm run test:browser
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import assert from "node:assert/strict";
import path from "node:path";

/** 단색 PNG(w×h, RGB) — 시험용 그림 */
function solidPng(w, h, [r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.alloc(1 + w * 3); for (let x = 0; x < w; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b; }
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const sheetPng = solidPng(512, 512, [255, 214, 160]).toString("base64");
const panelPng = solidPng(768, 768, [180, 210, 255]).toString("base64");

const bundle = await build({
  entryPoints: ["tests/browser-entry.tsx"], bundle: true, write: false, format: "iife", platform: "browser",
  jsx: "automatic", logLevel: "silent", alias: { "@": path.resolve("src") },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_SUPABASE_URL": '"https://mock.supabase.test"',
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '"anon-test-key"',
    "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": '""',
  },
});
const css = await readFile("src/app/globals.css", "utf8");
const PAGE = '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/test.css"><body><div style="padding:16px;max-width:1300px;margin:0 auto"><div id="root"></div></div><script src="/test.js"></script></body></html>';
const server = createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url.startsWith("/test.js")) { res.setHeader("Content-Type", "application/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url.startsWith("/test.css")) { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else { res.setHeader("Content-Type", "text/html;charset=utf-8"); res.end(PAGE); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: false }); } catch { browser = await chromium.launch({ headless: false }); }
const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const calls = [];
const SCRIPT = {
  characters: [{ name: "민지", description: "20대 직장인, 단발머리, 노란 니트" }, { name: "준호", description: "20대 직장인, 안경, 파란 셔츠" }],
  panels: [
    { panel: 1, character: "민지", description: "알람이 울리는 침실", dialogue: "벌써 아침이야?" },
    { panel: 2, character: "준호", description: "지하철 안", dialogue: "오늘도 지각 각이다" },
    { panel: 3, character: "민지", description: "회사 로비를 달리는 장면", dialogue: "3분 남았어!" },
    { panel: 4, character: "준호", description: "자리에 앉아 안도하는 두 사람", dialogue: "" },
  ],
};

await page.route("https://mock.supabase.test/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  const raw = route.request().postData();
  const body = raw ? JSON.parse(raw) : {};
  calls.push({ path: url.pathname, body });
  const j = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (url.pathname === "/api/script") return j({ script: SCRIPT });
  if (url.pathname === "/api/character") return j({ image: { data: sheetPng, mimeType: "image/png" } });
  if (url.pathname === "/api/panel") return j({ image: { data: panelPng, mimeType: "image/png" } });
  if (url.pathname === "/api/balloon") return j({ balloon: { x: 300, y: 60, w: 400, h: 180, tail: { x: 500, y: 400 }, shape: "round", rotation: 0, color: "#1f2430" }, fallback: false });
  return j({ error: "unexpected" }, 500);
});

const results = [];
const pass = (n) => { results.push(n); console.log("PASS", n); };
const download = async (click) => {
  const [d] = await Promise.all([page.waitForEvent("download"), click()]);
  return { name: d.suggestedFilename(), data: await readFile(await d.path()) };
};

try {
  await page.goto(origin);
  const topic = page.locator("textarea").first();
  await topic.waitFor();
  await page.getByRole("button", { name: "대본 생성하기" }).click();
  await page.getByText("주제를 입력해 주세요.").waitFor();
  pass("빈 주제 → 입력 안내");

  await topic.fill("월요일 아침 알람을 다섯 번 끈 직장인");
  await page.getByRole("button", { name: "대본 생성하기" }).click();
  await page.getByRole("button", { name: "캐릭터 생성하고 계속하기" }).waitFor();
  const sc = calls.find((c) => c.path === "/api/script").body;
  assert.equal(sc.kind, "script");
  assert.equal(sc.panelCount, 4);
  pass("대본 생성(모의) → 2단계 대본 화면 · 컷 수 4 전송");

  await page.getByRole("button", { name: "캐릭터 생성하고 계속하기" }).click();
  await page.waitForFunction(() => document.querySelectorAll('img[src^="data:image/png"]').length >= 2);
  assert.equal(calls.filter((c) => c.path === "/api/character").length, 2);
  pass("캐릭터 시트 2장(모의) 생성");

  await page.getByRole("button", { name: "만화 생성하러 가기" }).click();
  const allBtn = page.getByRole("button", { name: "모든 이미지 한번에 생성" });
  await allBtn.waitFor({ timeout: 8000 });
  await allBtn.click();
  await page.getByRole("button", { name: "모든 컷 완성" }).waitFor({ timeout: 15000 });
  const panels = calls.filter((c) => c.path === "/api/panel");
  assert.equal(panels.length, 4);
  assert.ok(panels.every((p) => Array.isArray(p.body.sheets) && p.body.sheets.length === 2), "컷마다 캐릭터 시트 2장을 참고로 보냄");
  pass("컷 4장(모의) 생성 · 캐릭터 시트 참고 이미지 전송");

  // 대사 있는 3컷에만 AI 말풍선 배치 요청(4컷은 대사 없음)
  await page.waitForTimeout(1200);
  const balloonCalls = calls.filter((c) => c.path === "/api/balloon");
  assert.equal(balloonCalls.length, 3, `말풍선 요청 ${balloonCalls.length}회`);
  pass("대사 있는 컷만 AI 말풍선 배치(3회)");

  const grid = await download(() => page.getByRole("button", { name: /^바둑판/ }).click());
  assert.match(grid.name, /\.(png|jpg)$/);
  assert.ok(grid.data.length > 2000);
  const webtoon = await download(() => page.getByRole("button", { name: "웹툰형 세로" }).click());
  assert.ok(webtoon.data.length > 2000);
  pass(`저장: 바둑판 ${grid.name}(${Math.round(grid.data.length / 1024)}KB) · 웹툰형 ${webtoon.name}(${Math.round(webtoon.data.length / 1024)}KB)`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `휴대폰 폭 가로 넘침 ${overflow}px`);
  pass("휴대폰 폭(390px): 가로 넘침 없음");

  assert.deepEqual(errors, [], `화면 오류: ${errors.join(" / ")}`);
  pass("화면 스크립트 오류 없음");
  console.log(`\n브라우저 검수 ${results.length}개 통과`);
} catch (e) {
  await page.screenshot({ path: "test-artifacts/browser-fail.png", fullPage: true }).catch(() => {});
  console.error("FAIL", e.message, errors.length ? `\n화면 오류: ${errors.join(" / ")}` : "");
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
