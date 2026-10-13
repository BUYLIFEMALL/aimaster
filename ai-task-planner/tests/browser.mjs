import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { emptyWorkspace, localDate, workspaceSchema } from "../src/lib/planner/model.ts";
import { applyCommand } from "../src/lib/planner/engine.ts";

const artifacts = path.resolve("test-artifacts"); await mkdir(artifacts, { recursive: true });
const bundle = await build({ entryPoints: ["tests/browser-entry.tsx"], bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, tsconfig: "tsconfig.json" });
const css = await readFile("src/app/globals.css", "utf8");
let workspace = emptyWorkspace(), revision = 0, failStatus = 0, loseNextAcknowledgement = false;
let holdNextRead = false, releaseRead, readStarted;
const commandIds = new Set(), requests = [];
const snapshot = () => ({ workspace, revision, serverNow: Date.now(), userId: "fixture-member" });
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url.startsWith("/api/workspace")) {
    res.setHeader("Content-Type", "application/json;charset=utf-8");
    if (failStatus) { res.statusCode = failStatus; res.end(JSON.stringify({ error: "검수용 서버 연결 실패" })); return; }
    if (req.method === "GET" && holdNextRead) {
      holdNextRead = false;
      const stale = JSON.stringify(snapshot());
      await new Promise(resolve => { releaseRead = resolve; readStarted(); });
      res.end(stale); return;
    }
    if (req.method === "POST") {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString()); requests.push(body);
      if (!commandIds.has(body.commandId)) {
        if (body.revision !== revision) { res.statusCode = 409; res.end(JSON.stringify({ error: "다른 화면에서 기록이 변경됐습니다. 입력을 보존했습니다." })); return; }
        try { workspace = applyCommand(workspace, body.command, Date.now()); revision++; commandIds.add(body.commandId); }
        catch (e) { res.statusCode = e.status ?? 400; res.end(JSON.stringify({ error: e.message })); return; }
      }
      // Chrome may transparently retry a disconnected connection. Lose all acknowledgements
      // until the explicit user retry, so the failure path is actually exercised.
      if (loseNextAcknowledgement) { req.socket.destroy(); return; }
    }
    res.end(JSON.stringify(snapshot()));
  } else if (req.url === "/test.js") { res.setHeader("Content-Type", "application/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url === "/test.css") { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else { res.setHeader("Content-Type", "text/html;charset=utf-8"); res.end('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI 할 일·성과 관리 — 격리 검수</title><link rel="stylesheet" href="/test.css"><div id="root"></div><script src="/test.js"></script></html>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: "chrome", headless: false });
const context = await browser.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
const page = await context.newPage(), errors = [], checks = [];
page.on("pageerror", e => errors.push(e.message)); page.on("dialog", dialog => dialog.accept());
const check = label => { checks.push(label); console.log(`PASS ${label}`); };
const menu = label => page.getByRole("navigation").getByRole("link", { name: new RegExp(label) });
async function add(title) {
  await page.getByRole("textbox", { name: "제목", exact: true }).fill(title);
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click();
  await page.getByText("서버 저장 완료", { exact: true }).waitFor();
}
try {
  await page.goto(origin); await page.getByText("최신 기록 확인 완료", { exact: true }).waitFor();
  assert.equal(await page.locator(".task-row").count(), 0); check("empty member workspace contains no reference demo tasks");
  await menu("할 일 계획").click();
  await add("보고서 [검수] 작성"); assert.equal(workspace.tasks.length, 1); check("real component task creation reaches the isolated API and confirms saving");
  await page.getByRole("textbox", { name: "할 일 검색" }).fill("["); assert.equal(await page.locator(".task-row").count(), 1);
  await page.getByRole("textbox", { name: "할 일 검색" }).fill(""); check("literal bracket search does not crash");
  await page.getByRole("button", { name: "집중 시작", exact: true }).click();
  await page.getByRole("heading", { name: "집중 실행", exact: true }).waitFor();
  await page.waitForTimeout(1200);
  const started = new Promise(resolve => { readStarted = resolve; }); holdNextRead = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus"))); await started;
  assert.equal(await page.getByRole("button", { name: "일시정지", exact: true }).isEnabled(), true);
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  await page.getByRole("button", { name: "재개", exact: true }).waitFor();
  const staleResponse = page.waitForResponse(response => response.url().endsWith("/api/workspace") && response.request().method() === "GET");
  releaseRead(); await (await staleResponse).finished(); await page.waitForTimeout(200);
  assert.equal(await page.getByRole("button", { name: "재개", exact: true }).isVisible(), true);
  check("focus refresh leaves timer controls enabled and a delayed old GET cannot overwrite a saved pause");
  const paused = await page.getByLabel("남은 시간").textContent(); await page.waitForTimeout(1200);
  assert.equal(await page.getByLabel("남은 시간").textContent(), paused); assert.ok(workspace.sessions[0].segments.length > 0); check("pause freezes countdown and preserves actual segment");
  await page.getByRole("button", { name: "재개", exact: true }).click(); await page.getByRole("button", { name: "일시정지", exact: true }).waitFor();
  await menu("할 일 계획").click(); await page.getByRole("button", { name: "수정", exact: true }).click();
  const sessionBeforeEdit = workspace.sessions[0].id;
  await page.getByRole("textbox", { name: "제목", exact: true }).fill("보고서 수정 완료"); await page.getByRole("button", { name: "수정 저장", exact: true }).click();
  await page.getByText("서버 저장 완료", { exact: true }).waitFor(); assert.equal(workspace.sessions[0].id, sessionBeforeEdit); assert.equal(workspace.sessions[0].state, "running"); check("editing task metadata preserves the running session");
  await page.getByRole("button", { name: "완료", exact: true }).click(); await page.getByText("서버 저장 완료", { exact: true }).waitFor();
  assert.equal(workspace.sessions[0].state, "ended"); assert.equal(workspace.tasks[0].status, "done"); check("completion commits task and ends focus timing together");
  await menu("성과·AI 분석").click(); await page.getByRole("textbox", { name: "하루 돌아보기" }).fill("작업을 작은 단위로 나누었습니다.");
  await page.getByRole("button", { name: "노트 저장" }).click(); await page.getByText("현재 저장된 내용입니다.", { exact: true }).waitFor();
  assert.equal(workspace.notes[localDate(Date.now())], "작업을 작은 단위로 나누었습니다."); check("notes confirm server acknowledgment before reporting saved");
  await page.reload(); await page.getByText("최신 기록 확인 완료", { exact: true }).waitFor(); await menu("성과·AI 분석").click();
  assert.equal(await page.getByRole("textbox", { name: "하루 돌아보기" }).inputValue(), "작업을 작은 단위로 나누었습니다."); check("refresh rehydrates API records and notes without demo resets");
  await menu("할 일 계획").click(); await page.getByRole("button", { name: "휴지통", exact: true }).click();
  await page.getByText("서버 저장 완료", { exact: true }).waitFor(); await menu("기록·백업").click();
  await page.getByRole("button", { name: "복원", exact: true }).click(); await page.getByText("휴지통이 비어 있습니다.").waitFor();
  assert.equal(workspace.tasks[0].deletedAt, null); check("trash and restore keep the original task and session history");
  const downloadPromise = page.waitForEvent("download"); await page.getByRole("button", { name: "JSON 백업 다운로드" }).click(); const download = await downloadPromise;
  const downloadPath = await download.path(); const backup = JSON.parse(await readFile(downloadPath, "utf8")); workspaceSchema.parse(backup.workspace);
  assert.equal(backup.workspace.tasks.length, 1); assert.equal(JSON.stringify(backup).includes("api_key"), false); check("actual JSON download parses and includes personal records but no API key fields");
  await menu("할 일 계획").click(); failStatus = 503;
  await page.getByRole("textbox", { name: "제목", exact: true }).fill("실패해도 보존할 입력"); await page.getByRole("button", { name: "할 일 추가", exact: true }).click();
  await page.getByText("저장 실패 · 재시도 필요", { exact: true }).waitFor(); assert.equal(await page.getByRole("textbox", { name: "제목", exact: true }).inputValue(), "실패해도 보존할 입력"); check("503 save failure preserves input and does not claim success");
  failStatus = 0; await page.getByRole("button", { name: "할 일 추가", exact: true }).click(); await page.getByText("서버 저장 완료", { exact: true }).waitFor();
  await page.getByRole("textbox", { name: "제목", exact: true }).fill("응답 유실 재시도"); loseNextAcknowledgement = true;
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click(); await page.getByText("저장 실패 · 재시도 필요", { exact: true }).waitFor();
  const lostId = requests.at(-1).commandId; const countAfterLost = workspace.tasks.length;
  loseNextAcknowledgement = false;
  await page.getByRole("button", { name: "최신 기록 불러오기", exact: true }).click(); await page.getByText("최신 기록 확인 완료", { exact: true }).waitFor();
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click(); await page.getByText("서버 저장 완료", { exact: true }).waitFor();
  assert.equal(requests.at(-1).commandId, lostId); assert.equal(workspace.tasks.length, countAfterLost); check("acknowledgement loss plus refresh retries the original command ID without duplicate creation");
  await page.getByRole("textbox", { name: "제목", exact: true }).fill("동시 변경 후 남은 입력"); revision++;
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click(); await page.getByText("저장 실패 · 재시도 필요", { exact: true }).waitFor();
  assert.equal(await page.getByRole("textbox", { name: "제목", exact: true }).inputValue(), "동시 변경 후 남은 입력"); check("revision conflict keeps user input");
  await page.getByRole("button", { name: "최신 기록 불러오기", exact: true }).click(); await page.getByText("최신 기록 확인 완료", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(artifacts, "desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 1600, height: 1100 });
  const navBox = await page.locator(".sidebar nav").boundingBox(), accountBox = await page.locator(".sidebar-account").boundingBox(); assert.ok(accountBox.y - (navBox.y + navBox.height) <= 17); check("account stays immediately below the menu on a tall viewport");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole("button", { name: "메뉴 열기" }).click(); await page.getByRole("link", { name: /집중 실행/ }).click();
  await page.getByRole("heading", { name: "집중 실행", exact: true }).waitFor();
  await page.screenshot({ path: path.join(artifacts, "mobile.png"), fullPage: true }); check("390px layout and mobile menu are usable without horizontal overflow");
  await page.setViewportSize({ width: 1600, height: 950 });
  failStatus = 401; await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByRole("heading", { name: "로그인·이용 권한 확인이 필요합니다" }).waitFor(); assert.equal(await page.locator(".task-row").count(), 0);
  check("session denial clears all personal workspace content");
  assert.deepEqual(errors, []);
  await writeFile(path.join(artifacts, "browser-results.json"), JSON.stringify({ passed: checks.length, fixture: true, visibleChrome: true, realMemberLoginVerified: false, liveDatabaseVerified: false, checks, pageErrors: errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, artifacts, realMemberLoginVerified: false }));
} catch (e) { await page.screenshot({ path: path.join(artifacts, "failure.png"), fullPage: true }); throw e; }
finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
