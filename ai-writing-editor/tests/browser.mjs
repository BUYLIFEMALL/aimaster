// 실제 Chrome(보이는 창)에서 StartPanel·Editor(Tiptap 서식 에디터)·DocumentList·KeyManager 흐름을 검수한다. 서버 API는 시험용 모의 응답으로 대체한다.
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";

await mkdir(path.resolve("test-artifacts"), { recursive: true });
const bundle = await build({
  entryPoints: ["tests/browser-entry.tsx"], bundle: true, write: false, format: "iife", platform: "browser",
  jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent",
  alias: { "@": path.resolve("src") },
});
const css = (await readFile("src/app/globals.css", "utf8")) + "\n" + (await readFile("src/app/we.css", "utf8"));
const PAGE = '<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/test.css"><body><div style="padding:20px;max-width:1200px;margin:0 auto"><div id="root"></div></div><script src="/test.js"></script></body></html>';
const server = createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url.startsWith("/test.js")) { res.setHeader("Content-Type", "application/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url.startsWith("/test.css")) { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else { res.setHeader("Content-Type", "text/html;charset=utf-8"); res.end(PAGE); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const DOC_ID = "22222222-2222-4222-8222-222222222222";
const GENERATED = "# 생산성을 높이는 방법\n\n첫째, 우선순위를 정합니다. 영화가 끝나고 나서 우리들은 저녁을 먹으러 식당에 갔다 왔어요.\n\n둘째, 집중 시간을 확보합니다. 그곳에서 먹은 음식은 맛있고 맛있고 또 맛있었습니다.\n\n셋째, 규칙적으로 쉽니다.";
const store = { doc: null, puts: [], posts: [], rewrites: [], analyzes: 0 };
const state = { fail: null };

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: false }); } catch { browser = await chromium.launch({ headless: false }); }
const context = await browser.newContext({ viewport: { width: 1300, height: 950 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
let docs = [
  { id: "d1", title: "첫 글", format: "blog", chars: 1200, updated_at: "2026-10-14T01:00:00Z" },
  { id: "d2", title: "이메일 초안", format: "email", chars: 300, updated_at: "2026-10-13T01:00:00Z" },
];
const keyState = { gemini: true };
await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  const method = route.request().method();
  const raw = route.request().postData();
  const body = raw ? JSON.parse(raw) : {};
  const j = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (state.fail && ["/api/generate", "/api/rewrite", "/api/analyze"].includes(url.pathname)) return j(state.fail.body, state.fail.status);
  if (url.pathname === "/api/generate") { store.generated = body; return j({ content: GENERATED, sources: [{ uri: "https://example.com/a", title: "출처 A" }], format: body.format }); }
  if (url.pathname === "/api/documents" && method === "POST") {
    store.posts.push(body);
    store.doc = { id: DOC_ID, title: body.title, content: body.content, format: body.format, sources: body.sources ?? [] };
    return j({ document: store.doc });
  }
  if (url.pathname === "/api/documents" && method === "PUT") { store.puts.push(body); return j({ document: { id: body.id, title: body.title, updated_at: new Date().toISOString() } }); }
  if (url.pathname === "/api/documents" && method === "GET") {
    if (url.searchParams.get("id")) return j({ document: store.doc });
    return j({ documents: docs });
  }
  if (url.pathname === "/api/documents" && method === "DELETE") { docs = docs.filter((d) => d.id !== url.searchParams.get("id")); return j({ success: true }); }
  if (url.pathname === "/api/rewrite") {
    store.rewrites.push(body);
    await new Promise((r) => setTimeout(r, 250));
    return j({ text: `〔${body.action ?? body.instruction}〕${body.selection.slice(0, 12)}` });
  }
  if (url.pathname === "/api/analyze") {
    store.analyzes += 1;
    const c = body.content;
    const pick = (t) => (c.includes(t) ? t : null);
    const list = [
      { originalText: pick("식당에 갔다 왔어요."), suggestedText: "식당에 갔습니다.", reason: "경어체 통일", category: "문법" },
      { originalText: pick("맛있고 맛있고 또 맛있었습니다."), suggestedText: "매우 맛있었습니다.", reason: "반복 제거", category: "표현" },
      { originalText: pick("규칙적으로 쉽니다."), suggestedText: "규칙적으로 휴식합니다.", reason: "어휘 다듬기", category: "표현" },
    ].filter((s) => s.originalText);
    return j({ suggestions: list, truncated: false });
  }
  if (url.pathname === "/api/keys" && method === "GET") return j({ keys: { gemini: { hasKey: keyState.gemini, maskedKey: keyState.gemini ? "AIza…wxyz" : null } } });
  if (url.pathname === "/api/keys" && method === "POST") { keyState.gemini = true; return j({ success: true }); }
  if (url.pathname === "/api/keys" && method === "DELETE") { keyState.gemini = false; return j({ success: true }); }
  if (url.pathname === "/api/keys/test") return j({ ok: true, message: "Gemini 키가 정상 동작합니다." });
  return j({ error: "unexpected" }, 500);
});

const results = [];
const pass = (n) => { results.push(n); console.log("PASS", n); };

// 1) 시작 화면 → 초안 생성 → 에디터로 이동
await page.goto(`${origin}/dashboard`);
await page.getByRole("tab", { name: "새 글 생성" }).waitFor();
await page.getByLabel("주제 또는 요청").fill("생산성을 높이는 5가지 방법에 대한 블로그 글");
await page.getByLabel("글쓰기 형식").selectOption("blog");
await page.getByLabel("톤").selectOption("friendly");
await page.getByLabel("분량").selectOption("long");
await page.getByLabel(/인터넷 검색 사용/).check();
await page.screenshot({ path: "test-artifacts/01-start.png", fullPage: true });
await page.getByRole("button", { name: "초안 생성하기" }).click();
await page.waitForURL(`**/editor/${DOC_ID}`);
assert.equal(store.generated.format, "blog");
assert.equal(store.generated.tone, "friendly");
assert.equal(store.generated.length, "long");
assert.equal(store.generated.useInternet, true);
assert.equal(store.posts[0].title, "생산성을 높이는 방법");
const pm = page.locator(".ProseMirror");
await pm.waitFor();
const md = () => page.evaluate(() => document.querySelector(".ProseMirror").editor.getMarkdown());
const plain = () => pm.innerText();
assert.equal(await page.locator(".we-prose h1").count(), 1, "마크다운 제목이 서식으로 렌더링");
assert.equal(await page.locator(".we-prose h1").innerText(), "생산성을 높이는 방법");
await page.getByText("참고한 출처 1건").waitFor();
pass("초안 생성 → 문서 저장 → 서식 에디터 열림(마크다운 제목 렌더링)");

// 2) 문단 선택 → 버블 툴바 → 짧게
const para = (t) => page.locator(".we-prose p", { hasText: t });
await para("첫째, 우선순위를 정합니다.").click({ clickCount: 3 });
const toolbar = page.getByRole("toolbar", { name: "선택한 문장 수정" });
await toolbar.waitFor();
const tb = await toolbar.boundingBox();
const pb = await para("첫째, 우선순위를 정합니다.").boundingBox();
assert.ok(tb.y < pb.y, "툴바가 선택한 문단 위에 표시");
await page.screenshot({ path: "test-artifacts/02-toolbar.png", fullPage: true });
await toolbar.getByRole("button", { name: "짧게" }).click();
await page.waitForFunction(() => document.querySelector(".we-prose").innerText.includes("〔shorten〕"));
assert.ok(store.rewrites[0].selection.startsWith("첫째, 우선순위를 정합니다."));
assert.ok(store.rewrites[0].after.length > 0 && store.rewrites[0].before.length > 0, "앞뒤 문맥 전달");
assert.equal(await page.locator(".we-prose p").count(), 3, "문단 수 유지(문단이 쪼개지지 않음)");
pass("선택 → 버블 툴바 → 짧게 적용(문단 유지)");

// 3) 실행 취소
await page.getByRole("button", { name: "실행 취소" }).click();
await page.waitForFunction(() => !document.querySelector(".we-prose").innerText.includes("〔shorten〕"));
assert.ok((await plain()).includes("영화가 끝나고 나서"));
pass("실행 취소로 AI 수정 되돌림");

// 4) 직접 지시
await para("셋째, 규칙적으로 쉽니다.").click({ clickCount: 3 });
await toolbar.waitFor();
await toolbar.getByRole("button", { name: "직접 지시" }).click();
await toolbar.getByLabel("수정 지시문").fill("초등학생도 이해하게");
await toolbar.getByRole("button", { name: "지시 실행" }).click();
await page.waitForFunction(() => document.querySelector(".we-prose").innerText.includes("〔초등학생도 이해하게〕"));
assert.equal(store.rewrites[1].instruction, "초등학생도 이해하게");
await page.getByRole("button", { name: "실행 취소" }).click();
await page.waitForFunction(() => !document.querySelector(".we-prose").innerText.includes("〔초등학생도"));
pass("직접 지시문으로 수정 후 취소");

// 5) 서식 도구: 굵게·제목2·목록·인용·링크
await page.locator(".we-prose").click({ position: { x: 30, y: 520 } }); // 남아 있는 선택 해제
await para("셋째, 규칙적으로 쉽니다.").click({ clickCount: 3 });
await page.getByRole("toolbar", { name: "서식 도구" }).getByRole("button", { name: "굵게" }).click();
{ const m = await md(); assert.ok(m.includes("**셋째, 규칙적으로 쉽니다.**"), "굵게가 마크다운으로 저장: " + JSON.stringify(m)); }
await para("둘째, 집중 시간을 확보합니다.").click({ clickCount: 3 });
await page.getByRole("button", { name: "제목 2" }).click();
assert.equal(await page.locator(".we-prose h2").count(), 1);
await page.getByRole("button", { name: "제목 2" }).click(); // 다시 눌러 본문으로
await page.getByRole("button", { name: "글머리 기호 목록" }).click();
assert.match(await md(), /^- 둘째/m, "목록이 마크다운으로 저장");
await page.getByRole("button", { name: "글머리 기호 목록" }).click();
await page.getByRole("button", { name: "인용" }).click();
assert.equal(await page.locator(".we-prose blockquote").count(), 1);
await page.getByRole("button", { name: "인용" }).click();
await page.getByRole("button", { name: "제목 2" }).click();
await para("셋째, 규칙적으로 쉽니다.").click({ clickCount: 3 });
await page.getByRole("button", { name: "링크", exact: true }).click();
await page.getByLabel("링크 주소").fill("javascript:alert(1)");
await page.getByRole("button", { name: "적용", exact: true }).click();
await page.getByText("http(s) 주소를 입력해 주세요.").waitFor();
await page.getByLabel("링크 주소").fill("example.com/guide");
await page.getByRole("button", { name: "적용", exact: true }).click();
assert.equal(await page.locator('.we-prose a[href="https://example.com/guide"]').count(), 1);
await page.screenshot({ path: "test-artifacts/03-format.png", fullPage: true });
assert.match(await md(), /^## 둘째/m, "제목2가 ## 로 저장");
pass("서식 도구(굵게·제목·목록·인용·링크 주소 검증)");

// 6) 글 분석 → 제안 → 필터 → 개별 적용
await page.getByRole("button", { name: "글 분석" }).click();
const panel = page.getByLabel("글 분석 제안");
await panel.getByText("경어체 통일").waitFor();
assert.equal(await panel.locator(".we-sug-list > li").count(), 3);
await panel.getByRole("button", { name: /^문법 1$/ }).click();
assert.equal(await panel.locator(".we-sug-list > li").count(), 1);
await panel.getByRole("button", { name: /^전체/ }).click();
await panel.locator(".we-sug-list > li").first().getByRole("button", { name: "적용" }).click();
await page.waitForFunction(() => document.querySelector(".we-prose").innerText.includes("식당에 갔습니다."));
assert.equal(await panel.locator(".we-sug-list > li").count(), 2);
await page.screenshot({ path: "test-artifacts/04-panel.png", fullPage: true });
pass("글 분석: 제안 3개·분류 필터·개별 적용");

// 7) 본문에서 보기 → 선택, 본문 변경 후 적용 불가 안내
await panel.locator(".we-sug-list > li").first().getByRole("button", { name: "본문에서 보기" }).click();
// Tiptap의 focus 명령은 다음 프레임에 DOM 선택을 반영한다
await page.waitForFunction(() => window.getSelection()?.toString() === "맛있고 맛있고 또 맛있었습니다.");
await page.evaluate(() => {
  const ed = document.querySelector(".ProseMirror").editor;
  const needle = "맛있고 맛있고 또 맛있었습니다.";
  let found = null;
  ed.state.doc.descendants((n, pos) => {
    if (found || !n.isTextblock) return true;
    const i = n.textContent.indexOf(needle);
    if (i >= 0) found = { from: pos + 1 + i, to: pos + 1 + i + needle.length };
    return false;
  });
  ed.chain().insertContentAt(found, "좋았습니다.").run();
});
await panel.locator(".we-sug-list > li").first().getByRole("button", { name: "적용" }).click();
await page.getByText("본문에서 해당 문장을 찾지 못해").waitFor();
assert.equal(await panel.locator(".we-sug-list > li").count(), 1);
pass("본문에서 보기 선택·바뀐 문장 적용 불가 안내");

// 8) 모두 적용 — 굵게 서식이 유지된 채 문장만 교체(링크 서식 안의 문장)
await panel.getByRole("button", { name: /모두 적용/ }).click();
await page.getByText("1개를 적용했습니다.").waitFor();
const mdAfter = await md();
assert.ok(mdAfter.includes("규칙적으로 휴식합니다."), "교체됨");
assert.match(mdAfter, /\*\*.*규칙적으로 휴식합니다\..*\*\*/, "교체 후에도 굵게 서식 유지");
assert.match(mdAfter, /\(https:\/\/example\.com\/guide\)/, "링크 유지");
pass("모두 적용(굵게·링크 서식 유지)");

// 9) 자동 저장(마크다운)
await page.waitForFunction(() => document.querySelector(".we-save")?.textContent?.includes("저장됨"), null, { timeout: 8000 });
const lastPut = store.puts[store.puts.length - 1];
assert.equal(lastPut.id, DOC_ID);
assert.ok(lastPut.content.includes("규칙적으로 휴식합니다."));
assert.match(lastPut.content, /^# 생산성을 높이는 방법/m);
pass("1.5초 디바운스 자동 저장(마크다운)");

// 10) 서식 복사(HTML+텍스트)·내려받기
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
await page.getByRole("button", { name: "서식 복사" }).click();
await page.getByText("복사 완료").first().waitFor();
const clip = await page.evaluate(async () => {
  const items = await navigator.clipboard.read();
  const out = {};
  for (const it of items) for (const t of it.types) out[t] = await (await it.getType(t)).text();
  return out;
});
assert.match(clip["text/html"], /<h1[^>]*>생산성을 높이는 방법<\/h1>/);
assert.match(clip["text/html"], /<strong>/);
assert.ok(clip["text/plain"].includes("생산성을 높이는 방법"));
const { readFile: rf } = await import("node:fs/promises");
const dl = async (name) => {
  const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name, exact: true }).click()]);
  return { name: d.suggestedFilename(), text: await rf(await d.path(), "utf8") };
};
const mdFile = await dl(".md");
assert.match(mdFile.name, /\.md$/);
assert.match(mdFile.text, /^# 생산성을 높이는 방법/m);
const htmlFile = await dl(".html");
assert.match(htmlFile.text, /<!doctype html>[\s\S]*<h1/i);
const txtFile = await dl(".txt");
assert.ok(!txtFile.text.includes("**") && !txtFile.text.includes("<h1"), "txt는 서식 기호 없음");
pass("서식 복사(HTML+텍스트)·.md/.html/.txt 내려받기");

// 11) 오류 표시(키 없음)
state.fail = { status: 400, body: { error: "Gemini API 키가 등록되지 않았습니다.", needKey: true } };
await page.getByRole("button", { name: "글 분석" }).click();
await page.getByRole("alert").getByText("Gemini API 키가 등록되지 않았습니다.").waitFor();
await page.getByRole("link", { name: "키 등록하러 가기" }).waitFor();
state.fail = null;
pass("키 없음 오류 → 등록 안내");

// 12) 기존 글 분석 시작(자동 분석)
await page.goto(`${origin}/dashboard`);
await page.getByRole("tab", { name: "기존 글 분석" }).click();
await page.getByLabel("분석할 글").fill("저는 어제 학교에 갔습니다. 영화가 끝나고 나서 우리들은 저녁을 먹으러 식당에 갔다 왔어요. 규칙적으로 쉽니다.");
await page.getByRole("button", { name: "에디터에서 분석하기" }).click();
await page.waitForURL(`**/editor/${DOC_ID}?analyze=1`);
await page.getByLabel("글 분석 제안").getByText("경어체 통일").waitFor();
assert.equal(store.posts[store.posts.length - 1].format, "free");
pass("기존 글 붙여넣기 → 에디터 자동 분석");

// 13) 문서 목록 삭제
await page.goto(`${origin}/?view=docs`);
await page.getByText("이메일 초안").waitFor();
assert.equal(await page.locator(".we-docs > li").count(), 2);
await page.getByRole("button", { name: "이메일 초안 삭제" }).click();
await page.waitForFunction(() => document.querySelectorAll(".we-docs > li").length === 1);
pass("문서 목록·삭제");

// 14) 키 관리
await page.goto(`${origin}/?view=keys`);
await page.getByText("Google Gemini API 키 (필수)").waitFor();
await page.getByRole("button", { name: "연결 확인" }).click();
await page.getByText("Gemini 키가 정상 동작합니다.").waitFor();
pass("키 연결 확인");

// 15) 모바일 폭
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${origin}/editor/${DOC_ID}`);
await page.locator(".ProseMirror").waitFor();
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
assert.ok(overflow <= 1, `가로 넘침 ${overflow}px`);
await page.screenshot({ path: "test-artifacts/05-mobile.png", fullPage: true });
pass("모바일 폭 가로 넘침 없음");

assert.deepEqual(errors, [], `페이지 오류: ${errors.join(" | ")}`);
console.log(`\n${results.length}/${results.length} 통과`);
await browser.close();
server.close();
