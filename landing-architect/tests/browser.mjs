// 실제 Chrome(보이는 창)에서 Workspace 컴포넌트의 전체 흐름을 검수한다. 서버 API는 시험용 모의 응답으로 대체한다.
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";

const artifacts = path.resolve("test-artifacts");
await mkdir(artifacts, { recursive: true });

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
  else { res.setHeader("Content-Type", "text/html;charset=utf-8"); res.end(PAGE); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const plan = {
  projectInfo: { topic: "필라테스 스튜디오", target: "30대 직장인", goal: "체험 신청", language: "ko", layoutType: "landing", structureStrategy: "s", designIntent: "d" },
  structure: { mainPage: { title: "메인", sections: [{ id: "hero", title: "히어로", description: "소개" }] }, subPages: [1, 2, 3, 4].map((n) => ({ id: `s${n}`, title: `서브${n}`, path: `/s${n}`, purpose: "p", contentSpecs: "c" })) },
  contentStrategy: { headline: "퇴근 후 1시간, 달라지는 몸", subHeadline: "소수 정원 체험 수업", cta: "체험 신청", keyMessages: ["a"] },
  designSystem: { primaryColor: "#7c3aed", secondaryColor: "#0ea5e9", backgroundColor: "#ffffff", typography: "Pretendard", mood: "차분" },
  developmentGuide: { stack: "Vite", folderStructure: ["src/"], deployment: "Vercel" },
  imageAssets: [{ name: "hero", keyword: "pilates", description: "d" }],
};
const html = '<!DOCTYPE html><html><head><title>t</title></head><body><h1 id="h">필라테스 프로토타입</h1><img src="https://loremflickr.com/1600/900/pilates" alt="x"></body></html>';

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: false }); } catch { browser = await chromium.launch({ headless: false }); }
const context = await browser.newContext({ viewport: { width: 1300, height: 950 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const calls = [];
let needKey = true;
await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  const raw = route.request().postData();
  const body = raw ? JSON.parse(raw) : {};
  calls.push({ path: url.pathname, method: route.request().method(), body });
  const j = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (url.pathname.startsWith("/api/projects/")) return j({ project: { id: "x", name: body.name, updated_at: new Date().toISOString() } });
  if (needKey && url.pathname.startsWith("/api/ai/")) return j({ error: "Gemini API 키가 등록되지 않았습니다.", needKey: true }, 400);
  if (url.pathname === "/api/ai/suggest") return j({ target: "퇴근 후 운동을 원하는 30대 직장인", goal: "체험 수업 월 30건" });
  if (url.pathname === "/api/ai/plan" && body.section) return j({ section: body.section, value: { ...plan.designSystem, primaryColor: "#ef4444" } });
  if (url.pathname === "/api/ai/plan") return j({ plan });
  if (url.pathname === "/api/ai/code") return j({ html });
  if (url.pathname === "/api/images/resolve") return j({ urls: { pilates: "https://images.example/p.jpg" }, failed: [] });
  return j({ error: "unexpected" }, 500);
});

const results = [];
const pass = (n) => { results.push(n); console.log("PASS", n); };
try {
  await page.goto(origin);
  await page.getByText("프로젝트 정의").waitFor();
  pass("초기 화면: 입력 단계 표시");

  await page.getByPlaceholder("예: 동네 필라테스").fill("필라테스 스튜디오");
  await page.getByRole("button", { name: /타겟\/목표 자동 완성/ }).click();
  await page.getByRole("alert").getByText(/API키등록/).first().waitFor();
  pass("키 미등록 시 등록 안내(needKey)");
  needKey = false;

  await page.getByRole("button", { name: /타겟\/목표 자동 완성/ }).click();
  await page.waitForFunction(() => [...document.querySelectorAll("textarea")].some((t) => t.value.includes("30대 직장인")));
  pass("타겟·목표 자동 완성 반영");

  await page.locator("textarea").nth(1).fill("");
  await page.getByRole("button", { name: /기획안 생성 시작/ }).click();
  await page.getByText("주제·타겟·목표를 모두 입력해 주세요.").waitFor();
  pass("필수 입력 검증");
  await page.locator("textarea").nth(1).fill("체험 수업 월 30건");

  await page.getByRole("button", { name: /기획안 생성 시작/ }).click();
  await page.locator(".lp-summary b").getByText("퇴근 후 1시간, 달라지는 몸").waitFor();
  pass("기획안 생성·요약 표시");
  assert.equal(calls.find((c) => c.path === "/api/ai/plan" && !c.body.section).body.inputs.topic, "필라테스 스튜디오");

  await page.locator("summary", { hasText: "디자인 시스템" }).click();
  const ta = page.getByLabel("디자인 시스템 JSON");
  await ta.fill("깨진 JSON");
  await page.getByRole("button", { name: "수정 적용" }).first().click();
  await page.getByText("JSON 형식이 올바르지 않습니다").waitFor();
  pass("잘못된 JSON 편집은 거부");
  await ta.fill(JSON.stringify({ ...plan.designSystem, primaryColor: "#10b981" }));
  await page.getByRole("button", { name: "수정 적용" }).first().click();
  await page.waitForFunction(() => document.querySelector(".lp-swatch i")?.style.background.includes("16, 185, 129"));
  pass("섹션 JSON 수정 적용(색상 반영)");

  await page.getByRole("button", { name: /이 섹션 다시 만들기/ }).first().click();
  await page.waitForFunction(() => document.querySelector(".lp-swatch i")?.style.background.includes("239, 68, 68"));
  pass("섹션 다시 만들기");

  await page.getByRole("button", { name: /프로토타입 만들기/ }).click();
  await page.frameLocator("iframe[title='프로토타입 미리보기']").locator("#h").waitFor();
  pass("프로토타입 미리보기 렌더");
  await page.getByRole("button", { name: /모바일/ }).click();
  const w = await page.locator("iframe").evaluate((e) => Math.round(e.getBoundingClientRect().width));
  assert.equal(w, 390);
  pass("모바일 폭 전환(390px)");

  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /HTML 다운로드/ }).click()]);
  assert.equal(dl.suggestedFilename(), "landing-page.html");
  pass("HTML 다운로드 파일명");

  await page.waitForFunction(() => document.querySelector(".lp-save")?.textContent === "저장됨", null, { timeout: 8000 });
  const put = calls.filter((c) => c.method === "PUT").pop();
  assert.ok(put.body.doc.html.includes("필라테스 프로토타입") && put.body.doc.plan);
  pass("자동 저장(기획안·HTML 포함)");

  await page.screenshot({ path: path.join(artifacts, "workspace.png"), fullPage: true });
  assert.equal(errors.length, 0, errors.join("\n"));
  pass("페이지 오류 없음");

  await page.locator("select").nth(1).selectOption("pexels");
  await page.getByRole("button", { name: /프로토타입 다시 만들기/ }).click();
  await page.waitForFunction(() => document.querySelector("iframe")?.srcdoc.includes("images.example/p.jpg"));
  assert.ok(!(await page.locator("iframe").getAttribute("srcdoc")).includes("loremflickr"));
  pass("외부 이미지 소스 선택 시 이미지 치환");
  console.log(`\n${results.length}개 검사 통과`);
} catch (e) {
  await page.screenshot({ path: path.join(artifacts, "workspace-fail.png"), fullPage: true }).catch(() => {});
  console.error("FAIL", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
