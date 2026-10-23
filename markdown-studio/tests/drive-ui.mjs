import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const artifacts = path.resolve("test-artifacts"); await mkdir(artifacts,{ recursive:true });
const bundle = await build({ entryPoints:["tests/browser-entry.tsx"], bundle:true, write:false, format:"iife", platform:"browser", jsx:"automatic", define:{ "process.env.NODE_ENV":'"development"' }, tsconfig:"tsconfig.json" });
const css = await postcss([tailwind()]).process(await readFile("src/app/globals.css","utf8"),{ from:path.resolve("src/app/globals.css") });
let forcedStatus = 200;
const server = createServer((req,res) => {
  res.setHeader("Cache-Control","no-store");
  if (req.url.startsWith("/api/session")) {
    res.setHeader("Content-Type","application/json"); res.statusCode = forcedStatus;
    const member = /fixture-member=([^;]+)/.exec(req.headers.cookie || "")?.[1] || "fixture-a";
    res.end(JSON.stringify(forcedStatus === 200 ? { userId:member } : { error:"시험용 서버 연결 실패" }));
  } else if (req.url.startsWith("/fonts/")) { readFile(path.join("public", decodeURIComponent(req.url))).then(buf => { res.setHeader("Content-Type","font/ttf"); res.end(buf); }, () => { res.statusCode = 404; res.end(); });
  } else if (req.url === "/test.js") { res.setHeader("Content-Type","application/javascript");res.end(bundle.outputFiles[0].text); }
  else if (req.url === "/test.css") { res.setHeader("Content-Type","text/css");res.end(css.css); }
  else { res.setHeader("Content-Type","text/html;charset=utf-8");res.end('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Markdown component fixture</title><link rel="stylesheet" href="/test.css"><div id="root"></div><script src="/test.js"></script></html>'); }
});
await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel:"chrome",headless:false });
const context = await browser.newContext({ viewport:{ width:1600,height:950 },acceptDownloads:true });
await context.addCookies([{ name:"fixture-member",value:"fixture-a",url:origin }]);
const page = await context.newPage(); const errors=[]; page.on("pageerror", e => errors.push(e.message));
const checks=[];
const textOf = loc => loc.evaluate(el => Array.from(el.querySelectorAll(".cm-line")).map(l => l.textContent).join("\n"));
const record = (name,extra={}) => checks.push({ name, passed:true, ...extra });
import { createDriveMock } from "./drive-mock.mjs";
const mock = createDriveMock();
const CLIENT_ID = "123456789012-abcdefghijklmnop.apps.googleusercontent.com";
const fixtureDir = path.join(artifacts, "fixture-drive");
await mkdir(path.join(fixtureDir, "회의", "하위"), { recursive: true });
await writeFile(path.join(fixtureDir, "회의", "개요.md"), "# 개요\n\n본문 한글");
await writeFile(path.join(fixtureDir, "회의", "하위", "상세.md"), "상세 내용");
await writeFile(path.join(fixtureDir, "루트.md"), "루트 문서");

// Google 로그인 도구(GIS)는 스텁, Drive API는 모의 서버로 가로챈다
await context.addInitScript(() => {
  window.__gisCalls = []; window.__gisMode = "ok"; window.__gisExpires = 3600; window.__revoked = null;
  window.google = { accounts: { oauth2: {
    initTokenClient(cfg) {
      return { requestAccessToken(overrides) {
        window.__gisCalls.push({ client_id: cfg.client_id, scope: cfg.scope, prompt: overrides?.prompt });
        setTimeout(() => {
          const m = window.__gisMode;
          if (m === "deny") cfg.callback({ error: "access_denied" });
          else if (m === "closed") cfg.error_callback({ type: "popup_closed" });
          else if (m === "noscope") cfg.callback({ access_token: "mock-token", expires_in: 3600, scope: "openid email" });
          else cfg.callback({ access_token: "mock-token", expires_in: window.__gisExpires, scope: cfg.scope });
        }, 20);
      } };
    },
    revoke(token, done) { window.__revoked = token; if (done) done(); },
  } } };
});
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "GET,POST,PATCH,OPTIONS", "access-control-max-age": "0" };
await context.route("https://www.googleapis.com/**", async route => {
  const req = route.request();
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
  const r = await mock.handle(req.method(), req.url(), req.headers(), req.postData());
  if (r === "throw") return route.abort("failed");
  return route.fulfill({ status: r.status, headers: { ...r.headers, ...CORS }, body: r.body });
});

const tool = (name, opts = {}) => page.getByRole("button", { name, exact: true, ...opts });
const status = text => page.getByRole("status").filter({ hasText: text });
const connectOnLibrary = async () => { await page.goto(`${origin}/library`); await tool("Google에 연결").click(); await page.getByText("연결됨:", { exact: false }).first().waitFor(); };
const fileNames = () => [...mock.files.values()].filter(f => f.id !== "root" && f.mimeType !== "application/vnd.google-apps.folder").map(f => f.name).sort();
try {
  // 1) 문서 준비: 폴더 가져오기
  await page.goto(`${origin}/prepare`); await page.locator('input[aria-label="가져올 폴더 선택"]').waitFor({ state: "attached" });
  await page.locator('input[aria-label="가져올 폴더 선택"]').setInputFiles(fixtureDir);
  await page.getByText("3개 문서를 가져왔습니다").waitFor(); record("fixture documents imported");

  // 2) 설정: Client ID 검증·저장, 연결 거절/범위 누락/창 닫힘/성공
  await page.goto(`${origin}/settings`); const idInput = page.getByRole("textbox", { name: "Google Client ID" }); await idInput.waitFor();
  assert.equal(await tool("Google에 연결").isDisabled(), true, "Client ID 없이는 연결 불가");
  await idInput.fill("not-a-client-id"); await tool("Client ID 저장").click();
  await page.getByRole("alert").filter({ hasText: "형식이 올바르지 않습니다" }).waitFor();
  await idInput.fill(CLIENT_ID); await tool("Client ID 저장").click(); await status("Client ID를 이 브라우저에 저장했습니다").waitFor();
  assert.match(await page.locator("code").filter({ hasText: "127.0.0.1" }).first().innerText(), /^http:\/\/127\.0\.0\.1:\d+$/, "현재 주소 표시");
  // 초보자용 안내: 매뉴얼 팝업(전용 게시글), 진행 체크리스트는 이 브라우저에 유지
  const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: /Drive 연동용 OAuth 클라이언트 만들기 매뉴얼/ }).first().click()]);
  await popup.waitForURL(/\/guides\/7d473e83-e9ce-4f68-ab52-92015a98148e$/, { timeout: 30000 }); await popup.close();
  assert.equal(await page.getByText("0/6 완료", { exact: false }).count(), 1);
  await page.getByRole("checkbox", { name: "1단계 완료" }).check(); await page.getByRole("checkbox", { name: "2단계 완료" }).check();
  await page.getByText("2/6 완료", { exact: false }).waitFor();
  for (const [mode, msg] of [["deny", "허용하지 않았습니다"], ["closed", "연결 창이 닫혔습니다"], ["noscope", "Drive 파일 접근"]]) {
    await page.evaluate(m => { window.__gisMode = m; }, mode);
    await tool("Google에 연결").click(); await page.getByRole("alert").filter({ hasText: msg }).waitFor();
    assert.equal(await page.getByText("연결되지 않았습니다").count(), 1, `${mode}: 연결되지 않은 상태 유지`);
  }
  await page.evaluate(() => { window.__gisMode = "ok"; });
  await tool("Google에 연결").click(); await page.getByText("me@example.test", { exact: false }).first().waitFor();
  const calls = await page.evaluate(() => window.__gisCalls); const last = calls[calls.length - 1];
  assert.deepEqual([last.client_id, last.scope], [CLIENT_ID, "https://www.googleapis.com/auth/drive.file"]);
  assert.ok(!JSON.stringify(calls).includes("secret"), "Client Secret은 사용하지 않음");
  record("settings: client id validation, consent denied/closed/missing scope, successful connect with drive.file only");

  // 3) 새로고침하면 연결은 풀리고(토큰 미저장), Client ID는 남는다
  await page.reload(); await idInput.waitFor(); await page.waitForFunction(() => document.querySelector('input[aria-label="Google Client ID"]')?.value);
  assert.equal(await idInput.inputValue(), CLIENT_ID); await page.getByText("연결되지 않았습니다").waitFor();
  await page.getByText("2/6 완료", { exact: false }).waitFor(); assert.equal(await page.getByRole("checkbox", { name: "1단계 완료" }).isChecked(), true, "체크리스트 유지");
  const stored = await page.evaluate(async () => {
    const dbs = await indexedDB.databases(); let dump = JSON.stringify(Object.entries(localStorage)) + JSON.stringify(Object.entries(sessionStorage)) + document.cookie;
    for (const info of dbs) await new Promise(res => { const r = indexedDB.open(info.name); r.onsuccess = () => { const db = r.result; const names = [...db.objectStoreNames]; let n = names.length; if (!n) return res(); names.forEach(s => { const g = db.transaction(s).objectStore(s).getAll(); g.onsuccess = () => { dump += JSON.stringify(g.result); if (!--n) { db.close(); res(); } }; }); }; });
    return dump;
  });
  assert.ok(!stored.includes("mock-token"), "접근 토큰은 어디에도 저장되지 않음"); record("access token is not persisted; client id is");

  // 4) 올리기: 전용 폴더 아래 구조 생성, 다시 올리면 변경 없음
  await connectOnLibrary();
  await tool("전체 문서 올리기 (3)").click(); await status("올림 3개").waitFor();
  assert.deepEqual(fileNames(), ["개요.md", "루트.md", "상세.md"]);
  const root = [...mock.files.values()].find(f => f.name === "마크다운 문서 자동화"); assert.ok(root && root.parents[0] === "root");
  const top = mock.files.get(mock.byName("루트.md")[0].parents[0]); assert.equal(top.name, "fixture-drive"); assert.equal(top.parents[0], root.id, "My Drive 최상위가 아니라 전용 폴더 아래");
  await tool("전체 문서 올리기 (3)").click(); await status("변경 없음 3개").waitFor();
  assert.equal(fileNames().length, 3, "중복 생성 없음"); record("upload creates structure under dedicated folder; re-upload is unchanged");

  // 5) Drive에서 바뀐 파일: 목록에 표시 → 사본으로 가져오기(내 문서 유지)
  mock.edit(mock.byName("개요.md")[0].id, "# 개요\n\nDrive에서 수정");
  await tool("Drive 목록 불러오기").click();
  await page.locator(".drive-list li").filter({ hasText: "개요.md" }).getByText("Drive에서 변경됨").waitFor();
  assert.equal(await page.locator(".drive-list li").count(), 3);
  await page.getByRole("button", { name: /^선택한 1개 가져오기$/ }).click(); await page.getByLabel("가져오기 결과").getByText("사본으로 추가").waitFor(); await status("가져오기 결과: 성공 1개").waitFor();
  await page.goto(`${origin}/library`); await page.getByRole("button", { name: "개요 (Drive 사본).md 열기", exact: true }).waitFor();
  record("remote change is detected and imported as a copy without touching my document");

  // 6) 충돌: 내 문서 수정 + Drive 수정 → 덮어쓰지 않음 → 강제 선택 시 갱신
  await page.goto(`${origin}/editor`);
  await page.getByRole("button", { name: "루트.md 열기", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "마크다운 원문" }); await editor.waitFor(); await editor.click(); await page.keyboard.press("Control+A"); await page.keyboard.type("내가 고친 루트");
  await page.getByRole("status").filter({ hasText: "저장 완료" }).waitFor();
  mock.edit(mock.byName("루트.md")[0].id, "Drive에서 고친 루트");
  await connectOnLibrary();
  await tool("현재 문서 올리기").click(); await page.getByText("충돌 — 덮어쓰지 않음").waitFor();
  assert.equal(mock.byName("루트.md")[0].content, "Drive에서 고친 루트", "덮어쓰지 않음");
  await page.getByLabel("내 문서로 덮어쓰기", { exact: false }).check(); await tool("현재 문서 올리기").click(); await page.getByText("갱신함").first().waitFor();
  assert.equal(mock.byName("루트.md")[0].content, "내가 고친 루트"); record("conflict is reported and only overwritten when explicitly forced");

  // 7) 오류: 401(재연결 안내·연결 해제 표시), 403 API 비활성 안내 — 덮어쓰기를 켜 모든 문서가 API를 호출하게 한다
  const uploadAll = () => page.getByRole("button", { name: /^전체 문서 올리기/ }).click();
  await page.getByLabel("내 문서로 덮어쓰기", { exact: false }).check();
  mock.failNext(1, 401, "authError", { match: (m, u) => u.pathname.includes("/drive/v3/files/") });
  await uploadAll(); await page.getByRole("alert").filter({ hasText: "다시 연결" }).first().waitFor();
  assert.equal(await tool("Google에 연결").count(), 1, "401 후 연결 해제 상태로 표시"); mock.clearFailures();
  assert.equal(await page.getByRole("status").filter({ hasText: "저장 실패" }).count(), 0, "Drive 오류가 문서 저장 상태(자동 저장)에 영향을 주지 않음");
  assert.equal(await page.locator(".notice.warning").count(), 0);
  await tool("Google에 연결").click(); await page.getByText("연결됨:", { exact: false }).first().waitFor();
  mock.failNext(1, 403, "accessNotConfigured", { match: (m, u) => u.pathname === "/drive/v3/files" });
  await tool("Drive 목록 불러오기").click(); await page.getByRole("alert").filter({ hasText: "Drive API가 사용 설정" }).waitFor(); mock.clearFailures();
  record("401 asks to reconnect and clears connection; 403 accessNotConfigured shows setup guidance");

  // 8) 429는 재시도 후 성공, 5xx가 계속되면 실패로 보고(성공 알림 없음)
  mock.failNext(2, 429, "rateLimitExceeded", { match: (m, u) => u.pathname === "/drive/v3/files", headers: { "Retry-After": "1" } });
  await tool("Drive 목록 불러오기").click(); await page.getByText("Drive에서 마크다운 파일", { exact: false }).first().waitFor({ timeout: 30000 }); mock.clearFailures();
  mock.failNext(99, 503, "backendError", { match: (m, u) => u.pathname.includes("upload") });
  await tool("현재 문서 올리기").click();
  await page.getByText("Google 서버가 일시적으로", { exact: false }).first().waitFor({ timeout: 60000 }); mock.clearFailures();
  assert.equal(await page.getByText("올림 1개").count(), 0, "실패를 성공으로 알리지 않음");
  assert.equal(await page.getByLabel("올리기 결과").getByText("실패", { exact: true }).count(), 1);
  record("429 retried then succeeds; persistent 5xx is reported as failure, not success");

  // 9) 연결 해제: 토큰 취소 요청, 계정 전환 시 이전 계정의 연결 기록을 재사용하지 않음
  await tool("연결 해제").click(); await status("연결을 해제했습니다").waitFor();
  assert.equal(await page.evaluate(() => window.__revoked), "mock-token", "Google에 토큰 취소 요청");
  const before = fileNames().length;
  mock.account.permissionId = "acct-2"; mock.account.emailAddress = "other@example.test";
  await tool("Google에 연결").click(); await page.getByText("other@example.test", { exact: false }).first().waitFor();
  await status("다른 Google 계정").waitFor();
  await uploadAll(); await status("올림").waitFor({ timeout: 30000 });
  assert.ok(fileNames().length > before, "다른 계정에는 새로 올림(이전 계정의 연결 기록 미사용)"); record("disconnect revokes token; a different Google account starts fresh");

  // 10) 토큰 만료: 곧 만료되는 토큰은 사용하지 않고 재연결을 요구
  await page.goto(`${origin}/library`); await page.evaluate(() => { window.__gisExpires = 20; });
  await tool("Google에 연결").click(); await page.getByRole("alert").filter({ hasText: "만료" }).waitFor(); record("near-expiry token is rejected with reconnect guidance");

  // 11) 모바일 폭
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/settings", "/library"]) { await page.goto(`${origin}${route}`); await page.waitForTimeout(500); assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, `${route} 가로 넘침`); }
  await page.screenshot({ path: path.join(artifacts, "drive-mobile.png"), fullPage: true }); record("390px settings and library have no horizontal overflow");

  assert.deepEqual(errors, []);
  await writeFile(path.join(artifacts, "drive-ui-results.json"), JSON.stringify({ fixture: true, mockGoogle: true, realGoogleVerified: false, realMemberLoginVerified: false, checks, pageErrors: errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, artifacts, mockGoogle: true, realGoogleVerified: false }));
} catch (e) {
  await page.screenshot({ path: path.join(artifacts, "drive-ui-failure.png"), fullPage: true });
  console.error(String(e).slice(0, 1800)); process.exitCode = 1;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
