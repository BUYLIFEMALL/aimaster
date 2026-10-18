// 실제 Chrome(보이는 창)에서 성격 진단의 핵심 흐름(검사 진행 → 제출 → 결과)을 검수한다(2026-10-19 추가).
// 서버 API(/api/submit·/api/analyze)는 시험용 모의 응답 — 실제 저장·AI 호출 없음. next/navigation은 tests/stub-navigation.ts로 대체.
// 실행: npm run test:browser
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";

const bundle = await build({
  entryPoints: ["tests/browser-entry.tsx"], bundle: true, write: false, format: "iife", platform: "browser",
  jsx: "automatic", logLevel: "silent",
  alias: { "@": path.resolve("src"), "next/navigation": path.resolve("tests/stub-navigation.ts") },
  define: { "process.env.NODE_ENV": '"production"' },
});
const css = await readFile("src/app/globals.css", "utf8");
const PAGE = '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/test.css"><body><div style="padding:16px;max-width:1100px;margin:0 auto"><div id="root"></div></div><script src="/test.js"></script></body></html>';
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
const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, acceptDownloads: true });
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
  if (url.pathname === "/api/submit") {
    const sensitive = await page.evaluate((id) => window.__tests.find((t) => t.id === id)?.sensitive, body.testId);
    if (sensitive && body.save !== true) {
      const result = await page.evaluate(([id, a]) => window.__score(id, a), [body.testId, body.answers]);
      return j({ result, saved: false });
    }
    return j({ id: "r-new", saved: true });
  }
  if (url.pathname === "/api/analyze") return j({ analysis: {
    summary: "시험 요약", strengths: ["강점 1"], cautions: ["주의 1"], advice: [{ title: "조언", detail: "내용" }],
    fit: ["어울리는 일"], relationships: "관계 설명", closing: "마무리",
  } });
  return j({ error: "unexpected" }, 500);
});

const results = [];
const pass = (n) => { results.push(n); console.log("PASS", n); };
const pushed = () => page.evaluate(() => window.__pushed ?? []);

/** 키보드로 모든 문항에 같은 값(v)으로 답한다(문항마다 자동으로 다음으로 넘어감) */
async function answerAll(total, v) {
  for (let i = 0; i < total; i++) {
    await page.keyboard.press(String(v));
    await page.waitForTimeout(190);
  }
}

try {
  // ① 일반 검사: 진행 → 이전 → 제출 → 결과 페이지로 이동
  await page.goto(`${origin}/?view=runner&test=bigfive`);
  await page.locator(".runner").waitFor();
  const tests = await page.evaluate(() => window.__tests);
  const big = tests.find((t) => t.id === "bigfive");
  assert.ok(big && big.total > 5 && !big.sensitive);
  await page.getByText(`1 / ${big.total}`).waitFor();
  assert.ok(await page.getByRole("button", { name: /다음/ }).isDisabled(), "답하기 전 [다음] 잠김");
  await page.keyboard.press("4");
  await page.getByText(`2 / ${big.total}`).waitFor();
  await page.keyboard.press("ArrowLeft");
  await page.getByText(`1 / ${big.total}`).waitFor();
  assert.equal(await page.locator(".scale-btn.on b").innerText(), "4", "돌아가도 고른 답 유지");
  pass("검사 진행: 답하면 다음 문항 · ←로 이전 문항(답 유지) · 답 전 [다음] 잠김");

  await answerAll(big.total, 3);
  await page.getByRole("button", { name: "결과 보기" }).click();
  await page.waitForFunction(() => (window.__pushed ?? []).length > 0);
  const sub = calls.filter((c) => c.path === "/api/submit").pop().body;
  assert.equal(sub.testId, "bigfive");
  assert.equal(sub.answers.length, big.total);
  assert.ok(sub.answers.every((a) => a === 3));
  assert.deepEqual(await pushed(), ["/result/r-new"]);
  pass(`제출: 답 ${big.total}개 전송 → 결과 페이지(/result/r-new)로 이동`);

  // ② 마음 상태 점검(민감): 안내 표시 → 저장하지 않고 결과만 → [내 기록에 저장]
  const wb = tests.find((t) => t.sensitive);
  assert.ok(wb, "민감 검사 존재");
  await page.goto(`${origin}/?view=runner&test=${wb.id}`);
  await page.locator(".care-notice").waitFor();
  await answerAll(wb.total, 2);
  await page.getByRole("button", { name: "결과 보기" }).click();
  await page.getByRole("button", { name: /내 기록/ }).waitFor();
  assert.deepEqual(await pushed(), [], "민감 검사는 바로 저장·이동하지 않음");
  assert.equal(await page.getByRole("button", { name: /결과 이미지 저장/ }).count(), 0, "민감 검사는 결과 이미지 저장 없음");
  await page.getByRole("button", { name: /내 기록/ }).click();
  await page.waitForFunction(() => (window.__pushed ?? []).length > 0);
  assert.equal(calls.filter((c) => c.path === "/api/submit").pop().body.save, true);
  pass("민감 검사: 위기 안내 표시 · 저장 없이 결과만 → [내 기록에 저장] 누르면 save=true로 저장");

  // ③ 결과 화면: 보고서 · AI 심층 분석(모의) · 결과 이미지 저장
  await page.goto(`${origin}/?view=result&test=bigfive`);
  await page.getByRole("heading", { name: "점수 (0~100)" }).waitFor();
  await page.getByRole("button", { name: /AI/ }).first().click();
  await page.getByText("시험 요약").waitFor();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /결과 이미지 저장/ }).click()]);
  const img = await readFile(await dl.path());
  assert.ok(img.length > 5000 && img[0] === 0x89, "PNG 결과 이미지");
  pass(`결과 화면: 점수 보고서 · AI 심층 분석(모의) 표시 · 결과 이미지 ${dl.suggestedFilename()}(${Math.round(img.length / 1024)}KB)`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `휴대폰 폭 가로 넘침 ${overflow}px`);
  pass("휴대폰 폭(390px) 결과 화면: 가로 넘침 없음");

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
