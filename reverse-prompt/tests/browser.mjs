// 실제 Chrome(보이는 창)에서 Analyzer·HistoryList 흐름을 검수한다. 서버 API와 Storage는 시험용 모의 응답으로 대체한다.
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";

const artifacts = path.resolve("test-artifacts");
await mkdir(artifacts, { recursive: true });
const MOCK_SB = "https://mock.supabase.test";

const bundle = await build({
  entryPoints: ["tests/browser-entry.tsx"], bundle: true, write: false, format: "iife", platform: "browser",
  jsx: "automatic", logLevel: "silent", alias: { "@": path.resolve("src") },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(MOCK_SB),
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '"anon-test-key"',
    // 2026-10-16 새·기존 변수 호환 뒤 클라이언트가 이 이름을 먼저 읽음 — 정의가 없으면 브라우저에서 process 미정의 오류
    "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": '""',
  },
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

const imageResult = {
  visual_analysis: { subject_details: "붉은 코트의 여성", environment: "비 오는 서울 거리", lighting_style: "네온 역광", color_grade: ["teal", "magenta"], composition_guide: "삼분할", artistic_style: "시네마틱" },
  midjourney_data: { prompt: "a woman in a red coat, rainy Seoul street", negative_prompt: "blurry", parameters: { aspect_ratio: "16:9", stylize: 250, chaos: 10, weird: 0, version: "7", tile: false }, full_command: "a woman in a red coat, rainy Seoul street --ar 16:9 --stylize 250 --chaos 10 --weird 0 --v 7 --no blurry" },
};
const audioResult = {
  musical_structure: { genre_main: "엠비언트", sub_genre: "드론", key_scale: "C minor", bpm: 60, time_signature: "4/4" },
  instrumentation: { lead: ["pad"], rhythm: [], bass: "sub", drums: "없음" },
  vocal_layer: { presence: "없음", gender: "-", style: "-" }, emotional_profile: { mood: "어두움", energy_level: "낮음" },
  audio_prompt: "dark ambient drone, 60 BPM",
};

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: false }); } catch { browser = await chromium.launch({ headless: false }); }
const context = await browser.newContext({ viewport: { width: 1300, height: 1000 }, acceptDownloads: true });
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin }).catch(() => {});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const calls = [];
let needKey = true;
let expireOnce = false;
let seq = 0;
await page.route(`${MOCK_SB}/**`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "ok" }) }));
await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  const method = route.request().method();
  const raw = route.request().postData();
  const body = raw ? JSON.parse(raw) : {};
  calls.push({ path: url.pathname, method, body, search: url.search });
  const j = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (url.pathname === "/api/upload" && method === "POST") return j({ path: `u/${++seq}.bin`, token: "t", media: "image", mime: body.mime });
  if (url.pathname === "/api/upload" && method === "DELETE") return j({ ok: true });
  if (url.pathname === "/api/analyze") {
    if (needKey) return j({ error: "Gemini API 키가 등록되지 않았습니다.", needKey: true }, 400);
    if (expireOnce) { expireOnce = false; return j({ error: "업로드한 파일을 찾을 수 없습니다.", expired: true }, 404); }
    const isAudio = /\.(wav|mp3)$/i.test(body.name);
    return j({ id: `h${++seq}`, media: isAudio ? "audio" : "image", title: body.name.replace(/\.\w+$/, ""), result: isAudio ? audioResult : imageResult, modelUsed: "gemini-3.5-flash", options: body.options });
  }
  if (url.pathname === "/api/history" && method === "GET") return j({ items: [
    { id: "a1", title: "카페 사진", media_type: "image", file_name: "cafe.jpg", prompt: "a cozy cafe", model_used: "m", thumb: null, favorite: false, created_at: "2026-10-13T10:00:00Z" },
    { id: "a2", title: "BGM", media_type: "audio", file_name: "bgm.wav", prompt: "lofi", model_used: "m", thumb: null, favorite: true, created_at: "2026-10-12T10:00:00Z" },
  ] });
  if (url.pathname.startsWith("/api/history/") && method === "PATCH") return j({ ok: true });
  if (url.pathname.startsWith("/api/history/") && method === "DELETE") return j({ ok: true });
  return j({ error: "unexpected" }, 500);
});

const results = [];
const pass = (n) => { results.push(n); console.log("PASS", n); };
const jpg = await readFile("test-artifacts/sample.jpg");
try {
  await page.goto(origin);
  await page.getByText("클릭하거나 파일을 끌어다 놓으세요").waitFor();
  pass("초기 화면: 업로드 영역 표시");

  const input = page.locator("input[type=file]");
  await input.setInputFiles({ name: "memo.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await page.getByRole("alert").getByText(/지원하지 않는 형식/).waitFor();
  pass("지원하지 않는 형식 거부");

  await input.setInputFiles({ name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(21 * 1024 * 1024, 1) });
  await page.getByRole("alert").getByText(/20MB 이하/).waitFor();
  pass("크기 초과 거부(20MB)");

  await input.setInputFiles({ name: "street.jpg", mimeType: "image/jpeg", buffer: jpg });
  await page.locator(".rp-preview img").waitFor();
  assert.equal(await page.locator(".rp-privacy").count(), 1);
  pass("이미지 미리보기·삭제 안내 표시");

  await page.getByRole("button", { name: "분석 시작" }).click();
  await page.getByRole("alert").getByText(/API키등록/).first().waitFor();
  pass("키 미등록 시 등록 안내(needKey)");
  needKey = false;
  const uploadsBefore = calls.filter((c) => c.path === "/api/upload" && c.method === "POST").length;

  await page.locator("select").first().selectOption("gpt-image");
  await page.locator("textarea").first().fill("의상에 집중");
  await page.getByRole("button", { name: "옵션 바꿔 다시 분석" }).or(page.getByRole("button", { name: "분석 시작" })).click();
  await page.getByLabel("프롬프트 편집", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("프롬프트 편집", { exact: true }).inputValue(), "a woman in a red coat, rainy Seoul street");
  assert.equal(await page.locator(".rp-cmd").count(), 0);
  const analyze = calls.filter((c) => c.path === "/api/analyze").pop();
  assert.equal(analyze.body.options.target, "gpt-image");
  assert.equal(analyze.body.options.memo, "의상에 집중");
  assert.equal(analyze.body.mime, "image/jpeg");
  pass("분석 결과 표시(프롬프트·명령어, 옵션 전달)");

  assert.ok((await page.locator(".rp-cards article").count()) >= 2);
  await page.getByText("시각 분석").first().waitFor();
  pass("분석 요소 카드 표시");

  await page.getByLabel("프롬프트 편집", { exact: true }).fill("a man in a blue coat");
  await page.getByRole("button", { name: /수정 저장/ }).click();
  await page.waitForFunction(() => document.querySelector("textarea[aria-label=\"프롬프트 편집\"]")?.value === "a man in a blue coat");
  const patch = calls.filter((c) => c.method === "PATCH").pop();
  assert.equal(patch.body.result.midjourney_data.full_command, "a man in a blue coat");
  pass("프롬프트 편집 저장·명령어 재조합");

  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /JSON 파일 저장/ }).click()]);
  assert.equal(dl.suggestedFilename(), "street-prompt.json");
  pass("JSON 파일 저장 파일명");
  await page.getByRole("button", { name: "JSON 복사", exact: true }).click();
  await page.getByRole("button", { name: "복사됨" }).first().waitFor();
  pass("복사 완료 표시");

  const analyzeCount = calls.filter((c) => c.path === "/api/analyze").length;
  await page.getByRole("button", { name: "옵션 바꿔 다시 분석" }).click();
  await page.waitForFunction((n) => true && n >= 0, analyzeCount);
  await page.waitForTimeout(500);
  assert.equal(calls.filter((c) => c.path === "/api/analyze").length, analyzeCount + 1);
  assert.equal(calls.filter((c) => c.path === "/api/upload" && c.method === "POST").length, uploadsBefore, "다시 분석은 재업로드하지 않는다");
  pass("다시 분석: 임시 파일 재사용(재업로드 없음)");

  expireOnce = true;
  await page.getByRole("button", { name: "옵션 바꿔 다시 분석" }).click();
  await page.waitForTimeout(800);
  assert.equal(calls.filter((c) => c.path === "/api/upload" && c.method === "POST").length, uploadsBefore + 1);
  pass("보관 만료 시 자동 재업로드 후 분석");

  await page.screenshot({ path: path.join(artifacts, "analyzer-image.png"), fullPage: true });

  await input.setInputFiles({ name: "bgm.wav", mimeType: "audio/wav", buffer: Buffer.alloc(2000, 3) });
  await page.locator(".rp-preview audio").waitFor();
  const opts = await page.locator("select").first().locator("option").allTextContents();
  assert.ok(opts.some((t) => t.includes("Suno")) && !opts.some((t) => t.includes("Midjourney")));
  await page.getByRole("button", { name: "분석 시작" }).click();
  await page.waitForFunction(() => document.querySelector("textarea[aria-label='프롬프트 편집']")?.value === "dark ambient drone, 60 BPM");
  await page.getByText("BPM").first().waitFor();
  pass("오디오: 대상 도구 전환·결과 표시");

  assert.equal(errors.length, 0, errors.join("\n"));
  pass("페이지 오류 없음");

  await page.goto(`${origin}/?view=history`);
  await page.getByText("카페 사진").first().waitFor();
  await page.getByRole("button", { name: /즐겨찾기만/ }).click();
  await page.getByText("BGM").first().waitFor();
  assert.equal(await page.locator("h3", { hasText: "카페 사진" }).count(), 0);
  pass("기록 목록·즐겨찾기 필터");
  await page.getByRole("button", { name: /즐겨찾기만/ }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "카페 사진 삭제" }).click();
  await page.waitForFunction(() => !document.querySelector(".project-card h3")?.textContent?.includes("카페 사진") && document.querySelectorAll(".project-card").length === 1);
  pass("기록 삭제");
  await page.screenshot({ path: path.join(artifacts, "history.png"), fullPage: true });
  console.log(`\n${results.length}개 검사 통과`);
} catch (e) {
  await page.screenshot({ path: path.join(artifacts, "analyzer-fail.png"), fullPage: true }).catch(() => {});
  console.error("FAIL", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
