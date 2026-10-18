// 실제 Chrome(보이는 창)에서 인물사진 스튜디오의 핵심 버튼 흐름을 검수한다(v1.25~).
// 서버 API(/api/generate·/api/headcheck)는 시험용 모의 응답으로 대체 — 실제 AI 호출·비용 없음.
// 실행: npm run test:browser  (test-artifacts/out-business-pro.png 필요 — AI 가상 인물 사진)
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";

const png = await readFile("test-artifacts/out-business-pro.png");
const bundle = await build({
  entryPoints: ["tests/browser-entry.tsx"], bundle: true, write: false, format: "iife", platform: "browser",
  jsx: "automatic", logLevel: "silent", alias: { "@": path.resolve("src") },
  define: { "process.env.NODE_ENV": '"production"' },
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

await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  const raw = route.request().postData();
  const body = raw ? JSON.parse(raw) : {};
  calls.push({ path: url.pathname, body });
  const j = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (url.pathname === "/api/generate") return j({ image: { data: png.toString("base64"), mimeType: "image/png" }, model: "gemini-nano-banana-2.1" });
  // 정수리 10% · 턱 45% · 얼굴 중심 50% (머리 비율 검사 모의 결과)
  if (url.pathname === "/api/headcheck") return j({ found: true, crownY: 0.1, chinY: 0.45, centerX: 0.5 });
  return j({ error: "unexpected" }, 500);
});

const results = [];
const pass = (n) => { results.push(n); console.log("PASS", n); };
const saveRow = () => page.locator(".st-save");
const download = async (click) => {
  const [d] = await Promise.all([page.waitForEvent("download"), click()]);
  const file = await d.path();
  return { name: d.suggestedFilename(), data: await readFile(file) };
};

try {
  await page.goto(origin);
  await page.getByText("클릭하거나 사진을 끌어다 놓으세요").waitFor();
  assert.ok(await page.locator(".purpose.on", { hasText: "증명사진" }).count(), "기본 목적은 증명사진(순백 정리 켜짐)");
  pass("초기 화면: 증명사진 목적 기본 선택");

  await page.locator("input[type=file]").first().setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: png });
  await page.locator(".dropzone.has img").waitFor();
  await page.locator(".st-own input[type=checkbox]").first().check();
  await page.getByRole("button", { name: "인물 사진 만들기" }).click();
  await page.locator(".st-stage img").waitFor();
  const gen = calls.find((c) => c.path === "/api/generate").body;
  assert.equal(gen.options.idFraming, true, "증명사진 목적은 idFraming=true로 보낸다");
  assert.equal(gen.options.symmetry, true);
  pass("생성(모의): 결과 표시 · 증명사진 구도 플래그 전송");

  // 순백 정리가 끝날 때까지(라벨에 % 표시) 기다린다
  await page.getByText(/배경 순백 정리 \(배경 \d+% 정리\)/).waitFor();
  await page.getByText("머리 위치를 아직 모릅니다").waitFor();
  assert.equal(await saveRow().locator("button.primary", { hasText: "머리 비율 검사" }).count(), 1);
  assert.equal(await saveRow().locator("button.primary", { hasText: "얼굴 위치 직접 지정 (무료)" }).count(), 1);
  assert.ok(!(await saveRow().getByRole("button", { name: /^규격 저장/ }).innerText()).includes("추천 영역"));
  pass("측정 전: 안내 한 줄 + 강조 버튼 2개, [규격 저장]에 추천 표시 없음");

  // v1.25 회귀 검사: 같은 사진에서 바로가기를 눌러도 패널이 열리고 순백 정리가 유지된다
  await saveRow().getByRole("button", { name: "얼굴 위치 직접 지정 (무료)" }).click();
  const src = page.locator(".ca-src");
  await src.waitFor({ timeout: 8000 });
  await page.getByText(/배경 순백 정리 \(배경 \d+% 정리\)/).waitFor();
  const box = await src.boundingBox();
  await src.click({ position: { x: box.width * 0.5, y: box.height * 0.1 } });
  await src.click({ position: { x: box.width * 0.5, y: box.height * 0.45 } });
  await page.getByText(/얼굴 위치를 지정했습니다\(머리 약 \d+% → \d+%\)/).waitFor();
  pass("직접 지정: 같은 사진에서 패널 열림(v1.25 회귀) · 두 점 → 머리 % 안내");

  await page.getByRole("button", { name: "닫기", exact: true }).first().click();
  const sizedBtn = saveRow().getByRole("button", { name: /^규격 저장/ });
  assert.ok((await sizedBtn.innerText()).includes("추천 영역"));
  const sized = await download(() => sizedBtn.click());
  assert.match(sized.name, /^증명사진-passport-추천-413x531-\d{4}-\d{2}-\d{2}\.jpg$/);
  assert.ok(sized.data.length > 5000 && sized.data[0] === 0xff && sized.data[1] === 0xd8, "JPEG 파일");
  await page.getByText(/추천 영역으로 저장했습니다\(머리 약/).waitFor();
  pass(`규격 저장 · 추천 영역: ${sized.name} (${Math.round(sized.data.length / 1024)}KB)`);

  await saveRow().getByRole("button", { name: "머리 비율 검사 (AI 1회)" }).click();
  await page.getByText(/머리 높이 약 \d+% \(기준/).waitFor();
  assert.ok(calls.some((c) => c.path === "/api/headcheck"));
  pass("머리 비율 검사(모의 응답) → 결과 안내");

  await saveRow().getByRole("button", { name: /프로필 세트 미리보기/ }).click();
  const dlg = page.getByRole("dialog", { name: "프로필 세트 미리보기" });
  await dlg.waitFor();
  assert.equal(await dlg.locator("figure").count(), 3);
  await dlg.getByRole("button", { name: "흰색", exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="프로필 세트 미리보기"] .chip.on')].some((c) => c.textContent === "흰색"));
  const zip = await download(() => dlg.getByRole("button", { name: /ZIP으로 저장/ }).click());
  assert.match(zip.name, /^프로필-세트-\d{4}-\d{2}-\d{2}\.zip$/);
  const text = zip.data.toString("latin1");
  for (const n of ["프로필-square-1080x1080.jpg", "프로필-portrait-1080x1350.jpg", "프로필-circle-1080x1080.png"]) {
    assert.ok(text.includes(Buffer.from(n).toString("latin1")), `ZIP 안에 ${n}`);
  }
  await dlg.waitFor({ state: "detached" });
  pass(`프로필 세트: 미리보기 3장 → 원형 흰색 → ZIP(${Math.round(zip.data.length / 1024)}KB, 3개 파일)`);

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
