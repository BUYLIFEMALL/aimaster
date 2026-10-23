// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image·경량 1K는 gemini-3.1-flash-lite-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
// 실제 Chrome(보이는 창)에서 Studio·ProjectList 흐름을 검수한다. 서버 API는 시험용 모의 응답으로 대체한다.
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";

const artifacts = path.resolve("test-artifacts");
await mkdir(artifacts, { recursive: true });
const jpg = await readFile("test-artifacts/gen-a.jpg");

const bundle = await build({
  entryPoints: ["tests/browser-entry.tsx"], bundle: true, write: false, format: "iife", platform: "browser",
  jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent",
  alias: { "@": path.resolve("src") },
});
const css = await readFile("src/app/globals.css", "utf8");
const PAGE = '<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/test.css"><body><div style="padding:20px;max-width:1100px;margin:0 auto"><div id="root"></div></div><script src="/test.js"></script></body></html>';
const server = createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url.startsWith("/test.js")) { res.setHeader("Content-Type", "application/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url.startsWith("/test.css")) { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else if (req.url.startsWith("/img/")) { res.setHeader("Content-Type", "image/jpeg"); res.end(jpg); }
  else { res.setHeader("Content-Type", "text/html;charset=utf-8"); res.end(PAGE); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const strategy = {
  summary: "A안은 숫자 중심, B안은 호기심 중심으로 기획",
  imagePrompt: "A shocked Korean woman holding a plate of pasta, hyper-realistic",
  imagePromptKo: "파스타 접시를 든 놀란 한국 여성",
  a: { label: "직관형", main: "재료 3개 5분 완성", sub: "실패 없는 원팬 레시피", styleHint: "노랑+검정" },
  b: { label: "호기심형", main: "아직도 이렇게 끓여요?", sub: "셰프는 안 하는 실수", styleHint: "흰색+빨강" },
};

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: false }); } catch { browser = await chromium.launch({ headless: false }); }
const context = await browser.newContext({ viewport: { width: 1300, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const calls = [];
let needKey = true;
const sets = { a: { versions: [], cur: -1 }, b: { versions: [], cur: -1 } };
let vn = 0;
const addVersion = (opt, instruction) => {
  vn += 1;
  const v = { path: `u/p/${opt}-${vn}.jpg`, v: sets[opt].versions.length + 1, at: new Date().toISOString(), model: "gemini-3-pro-image", ...(instruction ? { instruction } : {}) };
  sets[opt] = { versions: [...sets[opt].versions, v].slice(-5), cur: Math.min(sets[opt].versions.length, 4) };
  const urls = {};
  for (const x of sets[opt].versions) urls[x.path] = `${origin}/img/${x.path.replace(/\//g, "_")}`;
  return { option: opt, set: sets[opt], urls };
};
await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  const method = route.request().method();
  const raw = route.request().postData();
  const body = raw ? JSON.parse(raw) : {};
  calls.push({ path: url.pathname, method, body });
  const j = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (url.pathname === "/api/strategy") {
    if (needKey) return j({ error: "Gemini API 키가 등록되지 않았습니다.", needKey: true }, 400);
    return j({ strategy, docTruncated: false });
  }
  if (url.pathname === "/api/generate") return j(addVersion(body.option));
  if (url.pathname === "/api/edit") return j(addVersion(body.option, body.instruction));
  if (url.pathname.startsWith("/api/projects/") && method === "PATCH") { sets[body.option] = { ...sets[body.option], cur: body.cur }; return j({ option: body.option, set: sets[body.option] }); }
  if (url.pathname.startsWith("/api/projects/") && method === "PUT") return j({ project: { id: "x", name: body.name, updated_at: new Date().toISOString() } });
  if (url.pathname === "/api/projects" && method === "GET") return j({ projects: [
    { id: "p1", name: "파스타 썸네일", stage: "image", updated_at: "2026-10-14T01:00:00Z", cover: `${origin}/img/c.jpg` },
    { id: "p2", name: "빈 프로젝트", stage: "input", updated_at: "2026-10-13T01:00:00Z", cover: null },
  ] });
  if (url.pathname.startsWith("/api/projects/") && method === "DELETE") return j({ ok: true });
  return j({ error: "unexpected" }, 500);
});

const results = [];
const pass = (n) => { results.push(n); console.log("PASS", n); };
try {
  await page.goto(origin);
  await page.getByText("주제 · 피사체").waitFor();
  pass("초기 화면: 주제·피사체 단계 표시");

  await page.getByRole("button", { name: "전략 생성" }).click();
  await page.getByRole("alert").getByText("영상 주제를 입력해 주세요.").waitFor();
  pass("주제 필수 검증");

  await page.getByPlaceholder("예: 집에서 만드는 초간단 알리오올리오 파스타 레시피").fill("집에서 만드는 초간단 알리오올리오 파스타 레시피");
  await page.getByRole("button", { name: "동물" }).click();
  await page.getByRole("button", { name: "전략 생성" }).click();
  await page.getByRole("alert").getByText("동물 종류를 입력해 주세요.").waitFor();
  pass("동물/사물 종류 필수 검증");
  await page.getByRole("button", { name: "사람", exact: true }).click();

  await page.getByRole("button", { name: "전략 생성" }).click();
  await page.getByRole("alert").getByText(/API키등록/).first().waitFor();
  pass("키 미등록 시 등록 안내(needKey)");
  needKey = false;

  await page.getByRole("radio", { name: /시니어/ }).click();
  await page.getByRole("button", { name: "전략 생성" }).click();
  await page.getByText("전략 분석 요약").waitFor();
  const sc = calls.filter((c) => c.path === "/api/strategy").pop();
  assert.equal(sc.body.inputs.audience, "seniors");
  assert.equal(sc.body.inputs.subject.ethnicity, "한국인 (Korean)");
  pass("전략 생성·타겟 전달(시니어, 한국인 기본)");

  assert.equal(await page.locator(".tm-opt").count(), 2);
  await page.locator(".tm-opt").first().getByLabel("메인 문구").fill("이건 정말 너무너무 길고 길고 긴 문구 입니다 진짜로");
  await page.getByText(/3~5단어로 줄이면/).waitFor();
  await page.locator(".tm-opt").first().getByLabel("메인 문구").fill("재료 3개 5분 완성");
  pass("메인 문구 길이 경고");

  await page.getByLabel("해상도").selectOption("1K");
  await page.getByRole("button", { name: "썸네일 2종 생성하기" }).click();
  await page.locator('.tm-result[data-opt="a"] img').waitFor();
  await page.locator('.tm-result[data-opt="b"] img').waitFor();
  const gens = calls.filter((c) => c.path === "/api/generate");
  assert.deepEqual(gens.map((g) => g.body.option).sort(), ["a", "b"]);
  assert.equal(gens[0].body.inputs.style.size, "1K");
  assert.equal(gens[0].body.strategy.a.main, "재료 3개 5분 완성");
  pass("A/B 2종 병렬 생성(옵션별 별도 요청)");

  const editA = page.locator('.tm-result[data-opt="a"]');
  await editA.getByPlaceholder(/텍스트를 노란색으로/).fill("텍스트를 노란색으로 바꿔줘");
  await editA.getByRole("button", { name: "수정", exact: true }).click();
  await editA.getByRole("button", { name: "v2" }).waitFor();
  assert.equal(calls.filter((c) => c.path === "/api/edit").pop().body.instruction, "텍스트를 노란색으로 바꿔줘");
  pass("수정 요청 → 새 버전(v2) 추가");

  await editA.getByRole("button", { name: "v1" }).click();
  await page.waitForFunction(() => document.querySelector('.tm-result[data-opt="a"] button[aria-pressed="true"]')?.textContent === "v1");
  assert.equal(calls.filter((c) => c.method === "PATCH").pop().body.cur, 0);
  pass("버전 되돌리기(v1)");

  const [dl] = await Promise.all([page.waitForEvent("download"), editA.getByRole("button", { name: /다운로드/ }).click()]);
  assert.equal(dl.suggestedFilename(), "thumbnail_option_A.jpg");
  pass("JPG 다운로드 파일명");

  await page.getByLabel(/이미지에 문구를 직접 넣기/).uncheck();
  await page.locator('.tm-result[data-opt="b"]').getByRole("button", { name: "다시 생성" }).click();
  await page.waitForFunction(() => document.querySelectorAll('.tm-result[data-opt="b"] .tm-versions button').length === 2);
  assert.equal(calls.filter((c) => c.path === "/api/generate").pop().body.inputs.style.withText, false);
  pass("문구 없이 배경만 생성 옵션 전달·B안 다시 생성");

  await page.waitForFunction(() => document.querySelector(".tm-save")?.textContent === "저장됨", null, { timeout: 8000 });
  const put = calls.filter((c) => c.method === "PUT").pop();
  assert.ok(put.body.strategy.a.main === "재료 3개 5분 완성" && put.body.inputs.audience === "seniors");
  pass("자동 저장(입력·전략)");

  await page.screenshot({ path: path.join(artifacts, "studio.png"), fullPage: true });
  assert.equal(errors.length, 0, errors.join("\n"));
  pass("페이지 오류 없음");

  await page.goto(`${origin}/?view=list`);
  await page.getByText("파스타 썸네일").waitFor();
  assert.equal(await page.locator(".project-card").count(), 2);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "빈 프로젝트 삭제" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".project-card").length === 1);
  pass("프로젝트 목록·삭제");
  console.log(`\n${results.length}개 검사 통과`);
} catch (e) {
  await page.screenshot({ path: path.join(artifacts, "studio-fail.png"), fullPage: true }).catch(() => {});
  console.error("FAIL", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
