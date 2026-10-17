// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image·경량 1K는 gemini-3.1-flash-lite-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
// 실제 Chrome(보이는 창)에서 Studio·HistoryList 흐름을 검수한다. 서버 API와 Storage는 시험용 모의 응답으로 대체한다.
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";

const artifacts = path.resolve("test-artifacts");
await mkdir(artifacts, { recursive: true });
const jpg = await readFile("test-artifacts/sample.jpg");
const MOCK_SB = "https://mock.supabase.test";

const bundle = await build({
  entryPoints: ["tests/browser-entry.tsx"], bundle: true, write: false, format: "iife", platform: "browser",
  jsx: "automatic", logLevel: "silent", alias: { "@": path.resolve("src") },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(MOCK_SB),
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '"anon-test-key"',
  },
});
const css = await readFile("src/app/globals.css", "utf8");
const PAGE = '<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/test.css"><body><div style="padding:20px;max-width:1300px;margin:0 auto"><div id="root"></div></div><script src="/test.js"></script></body></html>';
const server = createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url.startsWith("/test.js")) { res.setHeader("Content-Type", "application/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url.startsWith("/test.css")) { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else if (req.url.startsWith("/img/")) { res.setHeader("Content-Type", "image/jpeg"); res.end(jpg); }
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
let needKey = true;
let seq = 0;
const UID = "11111111-2222-4333-8444-555555555555";
const uuid = () => `aaaaaaaa-bbbb-4ccc-8ddd-${String(++seq).padStart(12, "0")}`;
const outItem = (text) => { const id = uuid(); return { path: `${UID}/out/${id}.png`, url: `${origin}/img/${id}.png`, w: 1344, h: 768, mime: "image/png", ...(text ? { text } : {}) }; };

await page.route(`${MOCK_SB}/**`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "ok" }) }));
await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  const method = route.request().method();
  const raw = route.request().postData();
  const body = raw ? JSON.parse(raw) : {};
  calls.push({ path: url.pathname, method, body });
  const j = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (url.pathname === "/api/upload" && method === "POST") return j({ path: `${UID}/in/${uuid()}.${body.name.endsWith("png") ? "png" : "jpg"}`, token: "t", mime: body.mime });
  if (url.pathname === "/api/upload" && method === "DELETE") return j({ ok: true });
  if (url.pathname === "/api/suggest") {
    if (needKey) return j({ error: "Gemini API 키가 등록되지 않았습니다.", needKey: true }, 400);
    return j({ text: `제안된 문장(${body.type})` });
  }
  if (url.pathname === "/api/run") {
    if (needKey) return j({ error: "Gemini API 키가 등록되지 않았습니다.", needKey: true }, 400);
    const k = body.params.kind;
    const outputs = k === "story" ? [outItem("장면 1"), outItem("장면 2"), outItem("장면 3")] : k === "recipe" ? [outItem("1단계: 재료 준비"), { path: "", url: null, w: 0, h: 0, mime: "", text: "2단계: 볶기" }] : [outItem()];
    return j({ id: `h${seq}`, kind: k, title: "시험 결과", model: "gemini-3.1-flash-lite-image", warning: k === "recipe" ? "1단계는 이미지를 만들지 못해 설명만 표시합니다." : null, outputs, texts: [] });
  }
  if (url.pathname === "/api/history" && method === "GET") return j({ items: [
    { id: "r1", kind: "edit", title: "유화", prompt: "", model: "m", favorite: false, created_at: "2026-10-14T01:00:00Z", count: 1, cover: `${origin}/img/c1.jpg` },
    { id: "r2", kind: "story", title: "여행자", prompt: "", model: "m", favorite: true, created_at: "2026-10-13T01:00:00Z", count: 8, cover: null },
  ] });
  if (url.pathname.startsWith("/api/history/") && method === "GET") return j({ item: { id: url.pathname.split("/").pop(), kind: "edit", outputs: [{ path: `${UID}/out/${uuid()}.png`, url: `${origin}/img/x.jpg`, w: 10, h: 10, mime: "image/png" }] } });
  if (url.pathname.startsWith("/api/history/") && method === "PATCH") return j({ ok: true });
  if (url.pathname.startsWith("/api/history/") && method === "DELETE") return j({ ok: true });
  return j({ error: "unexpected" }, 500);
});

const results = [];
const pass = (n) => { results.push(n); console.log("PASS", n); };
const card = (title) => page.locator(".bc-card", { has: page.getByRole("heading", { name: title }) });
const lastRun = () => calls.filter((c) => c.path === "/api/run").pop().body.params;
try {
  await page.goto(origin);
  await page.getByText("클릭하거나 이미지를 끌어다 놓으세요").waitFor();
  for (const t of ["이미지 생성", "빠른 작업", "연속 스토리 · 이미지 레시피", "이미지 편집", "이미지 합성", "인생 앨범 제작", "만화 패널", "결과"]) {
    await page.getByRole("heading", { name: t }).waitFor();
  }
  assert.equal(await page.locator(".bc-card.locked").count(), 5);
  pass("초기 화면: 모든 기능 카드가 한 화면에 표시(원본 필요 카드 5개 잠김 표시)");

  await page.getByPlaceholder("예: 우주를 나는 고양이").fill("우주를 나는 고양이");
  await page.getByRole("button", { name: "이미지 생성", exact: true }).click();
  await page.getByRole("alert").getByText(/API키등록/).first().waitFor();
  pass("키 미등록 시 등록 안내(needKey)");
  needKey = false;

  await page.getByRole("button", { name: "16:9", exact: true }).first().click();
  await page.getByRole("button", { name: "프롬프트 제안" }).first().click();
  await page.waitForFunction(() => document.querySelector("textarea")?.value.includes("제안된 문장(generate)"));
  await page.getByRole("button", { name: "이미지 생성", exact: true }).click();
  await page.locator(".bc-out img").first().waitFor();
  assert.equal(lastRun().kind, "generate");
  assert.equal(lastRun().aspect, "16:9");
  assert.equal(lastRun().base, undefined);
  pass("만들기: 프롬프트 제안 → 이미지 생성(종횡비 전달)");

  const input = page.locator("input[type=file]").first();
  await input.setInputFiles({ name: "memo.gif", mimeType: "image/gif", buffer: Buffer.from("x") });
  await page.getByRole("alert").getByText(/지원하지 않는 형식/).waitFor();
  await input.setInputFiles({ name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(16 * 1024 * 1024, 1) });
  await page.getByRole("alert").getByText(/15MB 이하/).waitFor();
  pass("형식·크기 초과 거부");

  await input.setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: jpg });
  await page.locator(".bc-base img").waitFor();
  assert.ok(calls.some((c) => c.path === "/api/upload" && c.method === "POST" && c.body.name === "photo.jpg"));
  pass("원본 이미지 업로드·미리보기");

  await page.getByRole("button", { name: "복원", exact: true }).click();
  await page.getByRole("button", { name: "업스케일", exact: true }).click();
  await page.getByRole("button", { name: "4x", exact: true }).click();
  await page.getByLabel("스타일 변환").selectOption({ label: "유화" });
  await page.getByRole("button", { name: "편집 실행" }).click();
  await page.locator(".bc-out img").first().waitFor();
  const e = lastRun();
  assert.equal(e.kind, "edit");
  assert.deepEqual(e.processes.sort(), ["restore", "upscale"]);
  assert.equal(e.style, "oil");
  assert.equal(e.upscale, 4);
  assert.ok(e.base.includes("/in/"));
  pass("편집: 처리·스타일·업스케일 4x 전달");

  await card("이미지 편집").getByRole("button", { name: "프롬프트 제안" }).click();
  await page.waitForFunction(() => [...document.querySelectorAll("textarea")].some((t) => t.value.includes("제안된 문장(edit)")));
  pass("편집 프롬프트 제안 반영");

  await page.locator("input[type=file]").nth(1).setInputFiles({ name: "src.png", mimeType: "image/png", buffer: jpg });
  await page.locator(".bc-src img").waitFor();
  await page.getByPlaceholder(/원본 인물에게 소스 갑옷/).fill("갑옷을 입혀주세요");
  await page.getByRole("button", { name: "원본 비율" }).click();
  await page.getByRole("button", { name: "합성 실행" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".bc-out img").length === 1);
  const s = lastRun();
  assert.equal(s.kind, "synthesis");
  assert.equal(s.sources.length, 1);
  assert.equal(s.prompt, "갑옷을 입혀주세요");
  pass("합성: 소스 추가·실행");

  await page.getByRole("button", { name: /배경 제거/ }).click();
  await page.waitForFunction(() => document.querySelectorAll(".bc-out img").length === 1);
  assert.equal(lastRun().kind, "bgremove");
  await page.getByRole("button", { name: /증명사진 변환/ }).click();
  await page.waitForFunction(() => document.querySelectorAll(".bc-out img").length === 1);
  assert.equal(lastRun().kind, "idphoto");
  pass("빠른 작업: 배경 제거·증명사진");

  await page.getByRole("button", { name: /부분 삭제/ }).click();
  const canvas = page.locator(".bc-mask-stage canvas");
  await canvas.waitFor();
  await page.locator(".bc-mask-stage img").waitFor();
  await page.waitForTimeout(300);
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 6 });
  await page.mouse.up();
  await page.getByRole("button", { name: "부분 삭제 실행" }).click();
  await page.waitForFunction(() => !document.querySelector(".bc-mask-stage"));
  const ip = lastRun();
  assert.equal(ip.kind, "inpaint");
  assert.ok(ip.mask.includes("/in/") && ip.mask.endsWith(".png"));
  assert.ok(calls.some((c) => c.path === "/api/upload" && c.body.name === "mask.png"));
  pass("부분 삭제: 브러시 마스크 업로드·실행");

  await page.getByPlaceholder(/숲길을 따라 걷다/).fill("여행자 이야기");
  await page.getByRole("button", { name: /스토리 8컷 생성/ }).click();
  await page.waitForFunction(() => document.querySelectorAll(".bc-outs.multi .bc-out").length === 3);
  assert.equal(lastRun().kind, "story");
  pass("스페셜: 연속 스토리(다중 결과)");

  await page.getByPlaceholder(/마카롱 굽는 법/).fill("알리오올리오");
  await page.getByRole("button", { name: /레시피 생성/ }).click();
  await page.getByText("1단계는 이미지를 만들지 못해 설명만 표시합니다.").waitFor();
  await page.getByText("2단계: 볶기").waitFor();
  pass("스페셜: 이미지 레시피(일부 단계 텍스트만 + 경고)");

  await page.getByRole("button", { name: "만화 패널 생성" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".bc-out img").length === 1);
  assert.equal(lastRun().kind, "comic");
  await page.getByPlaceholder(/현재 나이/).fill("30");
  await page.getByRole("button", { name: "앨범 제작 실행" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".bc-out img").length === 1);
  assert.equal(lastRun().kind, "lifealbum");
  assert.equal(lastRun().age, 30);
  pass("스페셜: 만화 패널·인생 앨범");

  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "다운로드" }).first().click()]);
  assert.equal(dl.suggestedFilename(), "banana_lifealbum_1.png");
  pass("다운로드 파일명");

  await page.getByRole("button", { name: /이 결과로 계속 편집/ }).first().click();
  await page.getByText("결과가 여기에 표시됩니다").waitFor();
  assert.ok(await page.locator(".bc-base img").count() === 1);
  pass("이 결과로 계속 편집 → 새 원본으로 교체·결과 패널 초기화");

  await page.screenshot({ path: path.join(artifacts, "studio.png"), fullPage: true });
  assert.equal(errors.length, 0, errors.join("\n"));
  pass("페이지 오류 없음");

  await page.goto(`${origin}/?view=history`);
  await page.getByText("유화").first().waitFor();
  assert.equal(await page.locator(".project-card").count(), 2);
  await page.getByRole("button", { name: /즐겨찾기만/ }).click();
  await page.waitForFunction(() => document.querySelectorAll(".project-card").length === 1);
  await page.getByRole("button", { name: /즐겨찾기만/ }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /유화 삭제/ }).click();
  await page.waitForFunction(() => document.querySelectorAll(".project-card").length === 1);
  pass("기록 목록·즐겨찾기 필터·삭제");
  console.log(`\n${results.length}개 검사 통과`);
} catch (e) {
  await page.screenshot({ path: path.join(artifacts, "studio-fail.png"), fullPage: true }).catch(() => {});
  console.error("FAIL", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
