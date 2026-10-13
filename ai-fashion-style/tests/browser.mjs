// 실제 Chrome(보이는 창)에서 Studio 컴포넌트의 전체 흐름을 검수한다. Gemini 호출은 시험용 모의 응답으로 대체한다.
// 실행: npm run test:browser  (Playwright + 설치된 Chrome 필요)
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";

const artifacts = path.resolve("test-artifacts");
await mkdir(artifacts, { recursive: true });
const tmp = path.join(os.tmpdir(), `ls-test-${Date.now()}`);
await mkdir(tmp, { recursive: true });

// ---- 단색 PNG 생성 ----
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n += 1) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function solidPng(w, h, [r, g, b]) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    const o = y * (w * 3 + 1);
    raw[o] = 0;
    for (let x = 0; x < w; x += 1) { raw[o + 1 + x * 3] = r; raw[o + 2 + x * 3] = g; raw[o + 3 + x * 3] = b; }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const pngB64 = (rgb, w = 240, h = 300) => solidPng(w, h, rgb).toString("base64");

const files = {
  portrait: path.join(tmp, "portrait.png"),
  shirt: path.join(tmp, "blue-shirt.png"),
  badType: path.join(tmp, "notes.txt"),
};
await writeFile(files.portrait, solidPng(800, 1000, [200, 180, 160]));
await writeFile(files.shirt, solidPng(300, 300, [30, 80, 200]));
await writeFile(files.badType, "text");

// ---- 번들·서버 ----
const bundle = await build({
  entryPoints: ["tests/browser-entry.tsx"], bundle: true, write: false, format: "iife", platform: "browser",
  jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent",
});
const css = await readFile("src/app/globals.css", "utf8");
const server = createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url.startsWith("/test.js")) { res.setHeader("Content-Type", "application/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url.startsWith("/test.css")) { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else {
    res.setHeader("Content-Type", "text/html;charset=utf-8");
    res.end('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/test.css"><body><div style="padding:20px;max-width:1600px;margin:0 auto"><div id="root"></div></div><script src="/test.js"></script></body></html>');
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: false }); }
catch { browser = await chromium.launch({ headless: false }); }
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const checks = [];
const ok = (name, extra = {}) => { checks.push({ name, passed: true, ...extra }); console.log("PASS", name); };

// ---- 모의 API ----
const calls = [];
let mode = { recommend: "ok", tryon: "ok" };
const reply = (route, status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
await page.route("**/api/**", async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const p = url.pathname;
  const body = req.method() === "POST" ? JSON.parse(req.postData() || "{}") : {};
  calls.push({ path: p, body });
  if (p === "/api/ai/recommend") {
    if (mode.recommend === "needKey") return reply(route, 400, { error: "키 없음", needKey: true });
    return reply(route, 200, {
      suggestions: [
        { name: "면접 룩", pieces: [{ name: "블루 셔츠", imagePrompt: "blue shirt" }, { name: "슬랙스", imagePrompt: "black slacks" }] },
        { name: "캐주얼 룩", pieces: [{ name: "청재킷", imagePrompt: "denim jacket" }, { name: "스니커즈", imagePrompt: "white sneakers" }] },
      ],
    });
  }
  if (p === "/api/ai/item-image") return reply(route, 200, { image: { data: pngB64([90, 160, 90], 200, 200), mimeType: "image/png" } });
  if (p === "/api/ai/item-name") return reply(route, 200, { name: "블루 스트라이프 셔츠" });
  if (p === "/api/ai/tryon") {
    if (mode.tryon === "safety") return reply(route, 422, { error: "AI의 안전 필터가 이 사진 또는 요청의 처리를 거부했습니다.", code: "safety" });
    const n = calls.filter((c) => c.path === "/api/ai/tryon").length;
    return reply(route, 200, { image: { data: pngB64([40 + n * 40, 120, 220 - n * 30], 240, 300), mimeType: "image/png" } });
  }
  if (p === "/api/ai/beauty-advice") {
    const part = (t) => ({ title: t, description: `${t} 설명`, imagePrompt: `${t} prompt` });
    return reply(route, 200, { advice: { makeup: part("코랄 메이크업"), hairstyle: part("레이어드 단발") } });
  }
  if (p === "/api/ai/beauty-apply") return reply(route, 200, { image: { data: pngB64([220, 120, 160], 240, 300), mimeType: "image/png" } });
  if (p === "/api/fetch-image") return reply(route, 200, { image: { data: pngB64([200, 60, 60], 300, 300), mimeType: "image/png" } });
  return route.fulfill({ status: 404, body: "" });
});

const calls_of = (path_) => calls.filter((c) => c.path === path_);
const imgSrcOf = (loc) => loc.getAttribute("src");

try {
  await page.goto(`${origin}/?user=fixture-a`);
  await page.getByText("인물 사진을 업로드하여 스타일링을 시작하세요.").waitFor();

  // 1) 동의 전 업로드 차단
  assert.equal(await page.locator(".ls-drop").isDisabled(), true);
  ok("동의 전에는 사진 업로드가 비활성");

  // 2) 사진 업로드(큰 사진은 JPEG로 축소)
  await page.getByRole("checkbox").first().check();
  await page.getByTestId("portrait-input").setInputFiles(files.portrait);
  await page.locator(".ls-photo").waitFor();
  assert.match(await imgSrcOf(page.locator(".ls-photo")), /^data:image\/jpeg;base64,/);
  ok("사진 업로드·JPEG 변환");

  // 3) 추천: 의상 2세트 × 2벌, 이미지 생성(동시 2개)
  await page.getByPlaceholder("예: 주말 데이트").fill("면접");
  await page.getByRole("button", { name: "추천 받기" }).click();
  await page.locator(".ls-set").nth(1).waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".ls-set .ls-thumb[src^='data:']").length === 4, null, { timeout: 15000 });
  const rec = calls_of("/api/ai/recommend")[0].body;
  assert.equal(rec.situation, "면접");
  assert.equal(rec.kind, "outfit");
  assert.equal(rec.model, "standard");
  assert.equal(calls_of("/api/ai/item-image").length, 4);
  ok("AI 추천: 2세트·이미지 4장 생성", { request: { situation: rec.situation, kind: rec.kind } });

  // 4) 입어보기(클릭): 종횡비 3:4, 배경 유지
  await page.locator(".ls-set .ls-card").first().getByRole("button", { name: /입어보기/ }).click();
  await page.waitForFunction(() => document.querySelector(".ls-photo")?.getAttribute("src") !== null);
  await page.waitForFunction(() => document.querySelector(".ls-overlay") === null);
  const t1 = calls_of("/api/ai/tryon")[0].body;
  assert.equal(t1.aspectRatio, "3:4");
  assert.equal(t1.background, "keep");
  assert.equal(t1.situation, "면접");
  const afterFirst = await imgSrcOf(page.locator(".ls-photo"));
  ok("가상 피팅: 종횡비·배경·상황 전달", { aspect: t1.aspectRatio });

  // 5) 레이어드: 두 번째 요청의 기준은 첫 결과
  await page.locator(".ls-set .ls-card").nth(1).getByRole("button", { name: /입어보기/ }).click();
  await page.waitForFunction((prev) => document.querySelector(".ls-photo")?.getAttribute("src") !== prev, afterFirst);
  const t2 = calls_of("/api/ai/tryon")[1].body;
  assert.equal(t2.base.data, afterFirst.split(",")[1]);
  ok("레이어드: 직전 결과 위에 누적");

  // 6) 되돌리기·다시 실행·비교
  await page.getByRole("button", { name: "되돌리기" }).click();
  assert.equal(await imgSrcOf(page.locator(".ls-photo")), afterFirst);
  await page.getByRole("button", { name: "다시 실행" }).click();
  await page.getByRole("button", { name: "원본과 비교" }).click();
  await page.locator(".ls-compare").waitFor();
  assert.equal(await page.locator(".ls-compare img").count(), 2);
  await page.getByRole("button", { name: "비교 끄기" }).click();
  ok("되돌리기·다시 실행·원본 비교");

  // 7) 갈아입기: 기준은 항상 원본
  await page.getByRole("button", { name: "갈아입기(교체)" }).click();
  await page.locator(".ls-set .ls-card").nth(2).getByRole("button", { name: /입어보기/ }).click();
  await page.waitForTimeout(600);
  const t3 = calls_of("/api/ai/tryon")[2].body;
  assert.notEqual(t3.base.data, afterFirst.split(",")[1]);
  ok("갈아입기: 원본 기준으로 재생성");

  // 8) 배경 변환 옵션
  await page.getByRole("button", { name: "상황에 맞게 변환" }).click();
  await page.locator(".ls-set .ls-card").nth(3).getByRole("button", { name: /입어보기/ }).click();
  await page.waitForTimeout(700);
  const t4 = calls_of("/api/ai/tryon")[3].body;
  assert.equal(t4.background, "match");
  ok("배경 '상황에 맞게 변환' 옵션 전달");

  // 9) 안전 필터 거부 안내
  mode.tryon = "safety";
  await page.locator(".ls-set .ls-card").nth(0).getByRole("button", { name: /입어보기/ }).click();
  await page.getByRole("alert").waitFor();
  assert.match(await page.getByRole("alert").innerText(), /안전 필터/);
  await page.getByRole("alert").getByRole("button").click();
  mode.tryon = "ok";
  ok("안전 필터 거부 시 친절한 안내");

  // 10) 뷰티
  await page.getByRole("button", { name: "AI 뷰티 스튜디오" }).click();
  await page.getByRole("dialog").waitFor();
  assert.match(await page.getByRole("dialog").innerText(), /코랄 메이크업/);
  await page.waitForFunction(() => document.querySelector(".ls-beauty-img img") !== null, null, { timeout: 10000 });
  await page.getByRole("button", { name: "스타일 적용" }).click();
  await page.getByText("적용되었습니다!").waitFor();
  const ba = calls_of("/api/ai/beauty-apply")[0].body;
  assert.equal(ba.type, "makeup");
  assert.match(ba.description, /코랄 메이크업 설명/);
  await page.getByRole("button", { name: "헤어스타일" }).click();
  assert.match(await page.getByRole("dialog").innerText(), /레이어드 단발/);
  await page.getByRole("dialog").getByRole("button", { name: "닫기" }).click();
  ok("뷰티: 분석·참고 이미지·적용");

  // 11) 저장(PNG)
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "저장하기" }).click()]);
  assert.match(dl.suggestedFilename(), /^ai-fashion-style-\d+\.png$/);
  await page.getByText("최근 룩").waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".ls-look").length >= 1, null, { timeout: 8000 });
  ok("PNG 저장·최근 룩 보관", { file: dl.suggestedFilename() });

  // 12) 옷장: 파일 추가(AI 이름), URL 추가, 새로고침 후 유지, 삭제
  await page.getByTestId("item-input").setInputFiles([files.shirt, files.badType]);
  await page.locator("#user-wardrobe .ls-card").first().waitFor();
  assert.match(await page.locator("#user-wardrobe .ls-card").first().innerText(), /블루 스트라이프 셔츠/);
  await page.getByLabel("웹 이미지 주소로 추가").fill("https://example.com/item.png");
  await page.getByRole("button", { name: "추가", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll("#user-wardrobe .ls-card").length === 2, null, { timeout: 8000 });
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("#user-wardrobe .ls-card").length === 2, null, { timeout: 8000 });
  await page.locator("#user-wardrobe .ls-card").first().getByRole("button", { name: "삭제" }).click();
  await page.waitForFunction(() => document.querySelectorAll("#user-wardrobe .ls-card").length === 1);
  ok("옷장: 이름 자동 생성·URL 추가·새로고침 유지·삭제");

  // 13) 키 없음 안내, 영어 전환
  mode.recommend = "needKey";
  await page.getByRole("checkbox").first().check().catch(() => undefined);
  await page.getByTestId("portrait-input").setInputFiles(files.portrait);
  await page.locator(".ls-photo").waitFor();
  await page.getByPlaceholder("예: 주말 데이트").fill("파티");
  await page.getByRole("button", { name: "추천 받기" }).click();
  await page.getByRole("dialog", { name: /API 키 등록/ }).waitFor();
  await page.getByRole("button", { name: "닫기" }).click();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByText("AI Style Guide").waitFor();
  ok("키 없음 안내 모달·영어 전환");

  // 14) 모바일 폭
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `모바일 가로 넘침 ${overflow}px`);
  await page.screenshot({ path: path.join(artifacts, "ai-fashion-style-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.screenshot({ path: path.join(artifacts, "ai-fashion-style.png"), fullPage: true });
  ok("모바일 390px 가로 넘침 없음", { overflow });

  assert.deepEqual(errors, []);
  ok("페이지 오류 없음");
} catch (e) {
  await page.screenshot({ path: path.join(artifacts, "ai-fashion-style-fail.png"), fullPage: true }).catch(() => undefined);
  console.error("FAIL", e.message);
  checks.push({ name: "FAILED", passed: false, error: e.message, pageErrors: errors });
  process.exitCode = 1;
} finally {
  await writeFile(path.join(artifacts, "browser-results.json"), JSON.stringify(checks, null, 2));
  await browser.close();
  server.close();
}
