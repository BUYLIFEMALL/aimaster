// 실제 Chrome(보이는 창)에서 Workbench·HistoryList·KeyManager 흐름을 검수한다. 서버 API는 시험용 모의 응답으로 대체한다.
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
const css = (await readFile("src/app/globals.css", "utf8")) + "\n" + (await readFile("src/app/kw.css", "utf8"));
const PAGE = '<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/test.css"><body><div style="padding:20px;max-width:1200px;margin:0 auto"><div id="root"></div></div><script src="/test.js"></script></body></html>';
const server = createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url.startsWith("/test.js")) { res.setHeader("Content-Type", "application/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url.startsWith("/test.css")) { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else { res.setHeader("Content-Type", "text/html;charset=utf-8"); res.end(PAGE); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const sug = (n) => Array.from({ length: n }, (_, i) => ({ title: `제안 제목 ${i + 1}`, thumbnailCopy: `문구 ${i + 1}`, strategy: `공략 전략 ${i + 1}` }));
const REPORT_ID = "11111111-1111-4111-8111-111111111111";
const RESULTS = {
  autocomplete: (kw, engine) => ({ kind: "autocomplete", engine, keyword: kw, keywords: ["추천", "접이식", "가벼운", "릴렉스", "경량"].map((s, i) => ({ text: `${kw} ${s}`, ...(i === 0 ? { monthlyTotal: 12300, compIdx: "높음" } : {}) })), topics: null }),
  competition: (kw) => ({
    kind: "competition", keyword: kw, opportunityScore: 32, searchInterestIndex: 85, competitionIndex: 88, competitionLevel: "높음",
    documentCount: "1,200,000건(네이버 블로그 실측)",
    analysis: { title: "진단 제목", reason: "근거 문장", opportunity: "기회 문장", threat: "위협 문장", consumption: "소비 문장", conclusion: "결론 문장" },
    strategy: { expandedKeywords: ["확장 A", "확장 B"], blogTopics: sug(3) },
    real: { monthlyPc: 3000, monthlyMobile: 9300, monthlyTotal: 12300, blogDocTotal: 1200000, trend: Array.from({ length: 12 }, (_, i) => ({ period: `2025-${String(i + 1).padStart(2, "0")}-01`, ratio: 20 + i * 6 })) },
    sources: [{ title: "출처 1", uri: "https://example.com/s1" }],
  }),
  recommend: () => ({
    kind: "recommend", date: "2026-10-14",
    items: Array.from({ length: 10 }, (_, i) => ({ keyword: `전략 키워드 ${i + 1}`, category: i < 5 ? "정책/제도" : "이슈", reason: `이유 ${i + 1}`, title: `제목 ${i + 1}`, thumbnailCopy: `문구 ${i + 1}`, strategy: `공략 ${i + 1}` })),
    sources: [],
  }),
  prompt: (kw, pid) => ({ kind: "prompt", keyword: kw, promptId: pid, promptTitle: "롱테일 키워드 30개", markdown: "## 결과\n- 항목 1\n- 항목 2", sources: [] }),
};

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: false }); } catch { browser = await chromium.launch({ headless: false }); }
const context = await browser.newContext({ viewport: { width: 1300, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
const calls = [];
const state = { keys: { gemini: true, naver_client_id: false, naver_client_secret: false, naver_ads_api_key: false, naver_ads_secret_key: false, naver_ads_customer_id: false }, fail: null };
let history = [
  { id: "a1", feature: "competition", keyword: "홈카페", favorite: false, created_at: "2026-10-14T01:00:00Z" },
  { id: "a2", feature: "recommend", keyword: "오늘의 전략 키워드", favorite: true, created_at: "2026-10-13T01:00:00Z" },
];
await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  const method = route.request().method();
  const raw = route.request().postData();
  const body = raw ? JSON.parse(raw) : {};
  calls.push({ path: url.pathname, method, body, search: url.search });
  const j = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (url.pathname === "/api/keys" && method === "GET") {
    const keys = {};
    for (const [p, has] of Object.entries(state.keys)) keys[p] = { hasKey: has, maskedKey: has ? "abcd…wxyz" : null };
    return j({ keys });
  }
  if (url.pathname === "/api/keys" && method === "POST") { state.keys[body.provider] = true; return j({ success: true }); }
  if (url.pathname === "/api/keys" && method === "DELETE") { state.keys[url.searchParams.get("provider")] = false; return j({ success: true }); }
  if (url.pathname === "/api/keys/test") return j({ ok: true, message: `${body.target} 연결 정상` });
  if (url.pathname === "/api/analyze") {
    if (state.fail) return j(state.fail.body, state.fail.status);
    const { feature, keyword, params } = body;
    if (feature === "autocomplete" && params?.action === "topics") {
      return j({ id: REPORT_ID, result: { ...RESULTS.autocomplete("캠핑 의자", "naver"), topics: { mode: params.mode, items: sug(10) } } });
    }
    const fn = RESULTS[feature];
    if (!fn) return j({ error: "unexpected feature" }, 500);
    return j({ id: REPORT_ID, result: fn(keyword, params?.engine ?? params?.promptId) });
  }
  if (url.pathname === "/api/history" && method === "GET") {
    if (url.searchParams.get("id")) return j({ report: { id: REPORT_ID, feature: "competition", keyword: "홈카페", favorite: false, created_at: "2026-10-14T01:00:00Z", params: {}, result: RESULTS.competition("홈카페") } });
    return j({ reports: history });
  }
  if (url.pathname === "/api/history" && method === "PATCH") { history = history.map((h) => (h.id === body.id ? { ...h, favorite: body.favorite } : h)); return j({ success: true }); }
  if (url.pathname === "/api/history" && method === "DELETE") { history = history.filter((h) => h.id !== url.searchParams.get("id")); return j({ success: true }); }
  return j({ error: "unexpected" }, 500);
});

const results = [];
const pass = (n) => { results.push(n); console.log("PASS", n); };
const last = (p) => [...calls].reverse().find((c) => c.path === p);

// 1) 첫 화면
await page.goto(`${origin}/?view=work`);
await page.getByText("분석 종류 선택").waitFor();
assert.equal(await page.locator(".kw-features > button").count(), 9, "기능 버튼 8 + 라이브러리 1");
await page.getByText("Gemini 등록됨").waitFor();
await page.getByText("네이버 검색 API 미등록").waitFor();
await page.screenshot({ path: "test-artifacts/01-start.png", fullPage: true });
pass("첫 화면: 기능 9개·키 상태");

// 2) 자동완성
await page.getByLabel("키워드", { exact: true }).fill("캠핑 의자");
await page.getByRole("button", { name: "분석하기" }).click();
await page.getByText("자동완성 키워드 5개").waitFor();
let c = last("/api/analyze");
assert.equal(c.body.feature, "autocomplete");
assert.equal(c.body.params.engine, "naver");
assert.equal(await page.locator(".kw-kwlist li").count(), 5);
await page.getByText("월 12,300").waitFor();
await page.getByText("기록에 저장됨").waitFor();
pass("자동완성 실행·검색수 표시·저장 표시");

// 3) 구글로 바꿔 다시, 키워드 클릭 재분석
await page.getByRole("button", { name: "구글", exact: true }).click();
await page.locator(".kw-kwlist button", { hasText: "캠핑 의자 접이식" }).click();
await page.waitForFunction(() => document.querySelector('input[aria-label="키워드"]')?.value === "캠핑 의자 접이식");
c = last("/api/analyze");
assert.equal(c.body.keyword, "캠핑 의자 접이식");
assert.equal(c.body.params.engine, "google");
pass("키워드 클릭 → 해당 키워드로 재분석(검색엔진 유지)");

// 4) 주제 만들기
await page.getByRole("button", { name: "메인 키워드로 주제 만들기" }).click();
await page.getByText("만든 글 주제 (메인 키워드 중심)").waitFor();
c = last("/api/analyze");
assert.equal(c.body.params.action, "topics");
assert.equal(c.body.params.reportId, REPORT_ID);
assert.equal(await page.locator(".kw-sug > li").count(), 10);
pass("주제 만들기 10개");

// 5) 네이버 키 필요 기능: 안내 + 비활성
await page.getByRole("button", { name: /상위 블로그 분석/ }).click();
await page.getByText("이 기능은 본인의 네이버 Client ID/Secret이 필요합니다.").waitFor();
assert.equal(await page.getByRole("button", { name: "분석하기" }).isDisabled(), true);
pass("네이버 키 미등록 시 안내·실행 막음");

// 6) 경쟁력(점수·실측·추이)
await page.getByRole("button", { name: /키워드 경쟁력/ }).click();
await page.getByLabel("키워드", { exact: true }).fill("홈카페 레시피");
await page.getByRole("button", { name: "분석하기" }).click();
await page.getByText("진단 제목").waitFor();
assert.equal(await page.locator(".kw-score").count(), 3);
assert.equal(await page.locator(".kw-trend > div").count(), 12);
await page.getByText("월간 검색수(네이버 검색광고)").waitFor();
assert.ok(await page.getByText("AI 추정").first().isVisible());
await page.screenshot({ path: "test-artifacts/02-competition.png", fullPage: true });
pass("경쟁력: 점수 3개·실측 지표·12개월 추이");

// 7) 내보내기
const [md] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Markdown" }).click()]);
assert.match(md.suggestedFilename(), /^competition-.*\.md$/);
const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "CSV" }).click()]);
assert.match(csv.suggestedFilename(), /\.csv$/);
pass("Markdown·CSV 내려받기");

// 8) 오늘의 전략 키워드(키워드 입력 없음)
await page.getByRole("button", { name: /오늘의 전략 키워드/ }).first().click();
assert.equal(await page.getByLabel("키워드", { exact: true }).count(), 0);
await page.getByRole("button", { name: "오늘의 전략 키워드 찾기" }).click();
await page.getByText("2026-10-14 전략 키워드 10개").waitFor();
assert.equal(await page.locator(".kw-sug > li").count(), 10);
pass("오늘의 전략 키워드 10개");

// 9) 오류 표시(키 없음)
state.fail = { status: 400, body: { error: "Gemini API 키가 등록되지 않았습니다.", needKey: true } };
await page.getByRole("button", { name: "오늘의 전략 키워드 찾기" }).click();
await page.getByRole("alert").getByText("Gemini API 키가 등록되지 않았습니다.").waitFor();
await page.getByRole("link", { name: "키 등록하러 가기" }).waitFor();
state.fail = null;
pass("키 없음 오류 → 등록 안내 링크");

// 10) 프롬프트 라이브러리
await page.getByRole("button", { name: /프롬프트 라이브러리/ }).click();
await page.getByRole("dialog").waitFor();
assert.equal(await page.locator(".kw-lib > li").count(), 15, "첫 분류 15개");
await page.getByRole("tab", { name: "블로그 주제 발굴" }).click();
assert.equal(await page.locator(".kw-lib > li").count(), 20);
await page.getByPlaceholder("프롬프트 검색").fill("시리즈");
assert.equal(await page.locator(".kw-lib > li").count(), 1);
await page.locator(".kw-lib > li").first().getByRole("button", { name: "실행" }).click();
await page.getByText("롱테일 키워드 30개").first().waitFor();
c = last("/api/analyze");
assert.equal(c.body.feature, "prompt");
assert.equal(c.body.params.promptId, "t02");
pass("프롬프트 라이브러리: 분류·검색·실행");

// 11) 기록에서 열기
await page.goto(`${origin}/?view=work&report=${REPORT_ID}`);
await page.getByText("진단 제목").waitFor();
pass("기록 열기(report 파라미터)");

// 12) 기록 목록: 즐겨찾기·삭제
await page.goto(`${origin}/?view=history`);
await page.getByText("홈카페").waitFor();
assert.equal(await page.locator(".kw-history > li").count(), 2);
await page.locator(".kw-history > li").first().getByRole("button", { name: "즐겨찾기" }).click();
await page.waitForFunction(() => document.querySelectorAll('.kw-history button[aria-pressed="true"]').length === 2);
await page.getByRole("button", { name: "즐겨찾기만 보기" }).click();
assert.equal(await page.locator(".kw-history > li").count(), 2);
await page.getByRole("button", { name: "즐겨찾기만 보기" }).click();
await page.locator(".kw-history > li").first().getByRole("button", { name: "삭제" }).click();
await page.waitForFunction(() => document.querySelectorAll(".kw-history > li").length === 1);
pass("기록: 즐겨찾기·삭제");

// 13) 키 관리
await page.goto(`${origin}/?view=keys`);
await page.getByText("Google Gemini API 키 (필수)").waitFor();
const naverCard = page.locator('[data-group="naver"]');
await naverCard.getByLabel("Client ID").fill("my-client-id");
await naverCard.getByLabel("Client Secret").fill("my-client-secret");
await naverCard.getByRole("button", { name: "키 등록" }).click();
await naverCard.getByText("키를 등록했습니다").waitFor();
const posted = calls.filter((x) => x.path === "/api/keys" && x.method === "POST").map((x) => x.body.provider);
assert.deepEqual(posted, ["naver_client_id", "naver_client_secret"]);
await naverCard.getByRole("button", { name: "연결 확인" }).click();
await naverCard.getByText("naver 연결 정상").waitFor();
await page.screenshot({ path: "test-artifacts/03-keys.png", fullPage: true });
pass("키 등록(네이버 2칸)·연결 확인");

// 14) 모바일 폭: 가로 넘침 없음
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${origin}/?view=work&report=${REPORT_ID}`);
await page.getByText("진단 제목").waitFor();
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
assert.ok(overflow <= 1, `가로 넘침 ${overflow}px`);
await page.screenshot({ path: "test-artifacts/04-mobile.png", fullPage: true });
pass("모바일 폭 가로 넘침 없음");

assert.deepEqual(errors, [], `페이지 오류: ${errors.join(" | ")}`);
console.log(`\n${results.length}/${results.length} 통과`);
await browser.close();
server.close();
