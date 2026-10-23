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
const css = await readFile("src/app/globals.css", "utf8") + await readFile("src/app/overview.css", "utf8");
let workspace = emptyWorkspace(), revision = 0, failStatus = 0, loseNextAcknowledgement = false;
let holdNextRead = false, releaseRead, readStarted;
let analysisMode = "success", analysisCalls = 0;
const commandIds = new Set(), requests = [];
const snapshot = () => ({ workspace, revision, serverNow: Date.now(), userId: "fixture-member" });
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url === "/api/keys") { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ hasKey: true })); }
  else if (req.url === "/api/analysis") {
    analysisCalls++; const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const input = JSON.parse(Buffer.concat(chunks).toString());
    res.setHeader("Content-Type", "application/json");
    if (analysisMode === "missing") { res.statusCode = 400; res.end(JSON.stringify({ error: "본인 Gemini 키를 등록해주세요.", needKey: true })); }
    else res.end(JSON.stringify({ revision: input.revision, date: input.date, model: workspace.settings.aiModel, analyzedAt: new Date().toISOString(), result: analysisMode === "malformed" ? { summary: "필드 누락" } : { summary: "모의 분석 결과입니다.", strengths: ["완료 기록 확인"], suggestions: Array.from({ length: 3 }, (_, i) => ({ action: `개선 ${i + 1}`, evidence: "제공한 완료 기록" })) } }));
  }
  else if (req.url.startsWith("/api/workspace")) {
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
  assert.equal(await page.getByRole("button", { name: "✨ 달성 결과 분석하기", exact: true }).isDisabled(), true);
  assert.equal(analysisCalls, 0); check("AI makes no request when the selected scope has no completed work");
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
  await menu("대시보드").click();
  await page.setViewportSize({ width: 1366, height: 950 });
  for (const name of ["할 일 추가", "오늘의 성과", "시간대별 완료 수", "AI 성과 분석", "성과 노트"]) {
    assert.equal(await page.getByRole("heading", { name, exact: true }).isVisible(), true);
  }
  const columns = await Promise.all([".overview-task-list", ".overview-planning", ".overview-insights"].map(selector => page.locator(selector).boundingBox()));
  assert.ok(columns[0].x + columns[0].width <= columns[1].x && columns[1].x + columns[1].width <= columns[2].x);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const editorNode = await page.getByRole("textbox", { name: "제목", exact: true }).elementHandle();
  await page.waitForTimeout(1100); assert.equal(await editorNode.evaluate(node => node.isConnected), true);
  check("1366px overview shows three columns with all panels and keeps the editor mounted across timer ticks");
  await add("대시보드 즉시 실행 검수");
  assert.equal(new URL(page.url()).pathname, "/dashboard");
  let overviewTask = page.locator(".task-row").filter({ hasText: "대시보드 즉시 실행 검수" });
  await overviewTask.getByRole("button", { name: "수정", exact: true }).click();
  await page.getByRole("textbox", { name: "제목", exact: true }).fill("대시보드 수정·집중 검수");
  await page.getByRole("button", { name: "수정 저장", exact: true }).click();
  await page.getByText("서버 저장 완료", { exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, "/dashboard");
  check("overview creation and inline editing save without navigating away");
  overviewTask = page.locator(".task-row").filter({ hasText: "대시보드 수정·집중 검수" });
  await overviewTask.getByRole("button", { name: "집중 시작", exact: true }).click();
  await page.getByRole("button", { name: "일시정지", exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, "/dashboard");
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  await page.getByRole("button", { name: "재개", exact: true }).waitFor();
  const overviewPaused = await page.getByLabel("남은 시간").textContent();
  await page.getByRole("group", { name: "분류 빠른 선택" }).getByRole("button", { name: "학습", exact: true }).click();
  assert.equal(await page.locator(".task-row").count(), 0);
  assert.equal(await page.locator(".overview-summary .metric").first().locator("strong").textContent(), "0%");
  assert.equal(await page.locator(".overview-summary .metric").first().locator("small").textContent(), "0 / 0개 계획 완료");
  assert.deepEqual(await page.locator(".chart > div > span").allTextContents(), Array(12).fill("0"));
  assert.equal(await page.getByLabel("남은 시간").textContent(), overviewPaused);
  assert.equal(await page.getByRole("button", { name: "재개", exact: true }).isEnabled(), true);
  assert.ok((await page.locator(".timer-caption").textContent()).includes("대시보드 수정·집중 검수"));
  check("category tabs scope lists, metrics and chart together without hiding or resetting a paused timer");
  await page.getByRole("button", { name: "재개", exact: true }).click();
  await page.getByRole("button", { name: "일시정지", exact: true }).waitFor();
  await page.getByRole("group", { name: "분류 빠른 선택" }).getByRole("button", { name: "전체", exact: true }).click();
  await overviewTask.getByRole("button", { name: "완료", exact: true }).click();
  await page.getByText("서버 저장 완료", { exact: true }).waitFor();
  assert.equal(await page.getByRole("region", { name: "완료 목록", exact: true }).locator(".task-row").filter({ hasText: "대시보드 수정·집중 검수" }).count(), 1);
  assert.equal(workspace.sessions.at(-1).state, "ended");
  check("overview completion moves the task into the completed section and stops its focus session");
  await page.getByRole("button", { name: "짧은 휴식", exact: true }).click();
  await page.getByRole("button", { name: "시작", exact: true }).click();
  await page.getByRole("button", { name: "현재 타이머 종료", exact: true }).waitFor();
  assert.equal(workspace.sessions.at(-1).mode, "short");
  await page.getByRole("button", { name: "현재 타이머 종료", exact: true }).click();
  await page.getByText("서버 저장 완료", { exact: true }).waitFor();
  await page.getByRole("button", { name: "집중", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "시작", exact: true }).isDisabled(), true);
  await page.getByRole("combobox", { name: "집중할 할 일", exact: true }).selectOption(workspace.tasks.find(t => t.status !== "done").id);
  await page.getByRole("button", { name: "시작", exact: true }).click();
  await page.getByRole("button", { name: "현재 타이머 종료", exact: true }).waitFor();
  await page.getByRole("button", { name: "현재 타이머 종료", exact: true }).click();
  await page.getByText("서버 저장 완료", { exact: true }).waitFor();
  check("overview toolbar starts a selected task or a task-free break and requires a task for focus");
  await page.getByRole("textbox", { name: "하루 돌아보기" }).fill("대시보드에서 한눈에 확인하고 저장했습니다.");
  await page.getByRole("button", { name: "노트 저장" }).click();
  await page.getByText("현재 저장된 내용입니다.", { exact: true }).waitFor();
  await page.reload(); await page.getByText("최신 기록 확인 완료", { exact: true }).waitFor();
  assert.equal(await page.getByRole("textbox", { name: "하루 돌아보기" }).inputValue(), "대시보드에서 한눈에 확인하고 저장했습니다.");
  check("overview note survives a server reload and shares the same saved record as the results screen");
  assert.equal(await page.getByRole("button", { name: "타이머 정산", exact: true }).isVisible(), true);
  const emptyScope = page.getByRole("group", { name: "분류 빠른 선택" }); await emptyScope.getByRole("button", { name: "학습", exact: true }).click();
  assert.equal(await page.getByText("미측정", { exact: true }).isVisible(), true); assert.deepEqual(await page.locator(".chart-grid-lines span").allTextContents(), ["4", "3", "2", "1", "0"]);
  assert.ok((await page.locator(".col-bar").evaluateAll(nodes => nodes.map(n => n.style.height))).every(height => height === "0%"));
  const zeroAxis = await page.locator(".chart-grid-lines span").last().boundingBox(), barTrack = await page.locator(".col-bar-track").first().boundingBox();
  assert.ok(Math.abs(zeroAxis.y + zeroAxis.height / 2 - barTrack.y - barTrack.height) <= 1, `zero tick aligns with bar baseline (tick ${JSON.stringify(zeroAxis)}, track ${JSON.stringify(barTrack)})`);
  await emptyScope.getByRole("button", { name: "전체", exact: true }).click(); check("unmeasured accuracy is distinct from zero and empty chart bars match the axis");
  await menu("API키등록·플랫폼연동").click(); await page.getByText("본인 Gemini 키가 등록되어 있습니다.", { exact: true }).waitFor();
  await page.getByRole("combobox", { name: "Gemini 모델", exact: true }).selectOption("gemini-3.8-flash"); await page.getByRole("button", { name: "분석 모델 저장", exact: true }).click(); await page.getByText("서버 저장 완료", { exact: true }).waitFor();
  assert.equal(workspace.settings.aiModel, "gemini-3.8-flash"); await page.reload(); await page.getByText("최신 기록 확인 완료", { exact: true }).waitFor(); await menu("API키등록·플랫폼연동").click(); assert.equal(await page.getByRole("combobox", { name: "Gemini 모델", exact: true }).inputValue(), "gemini-3.8-flash");
  assert.ok((await page.getByRole("link", { name: "Gemini API 키 발급 매뉴얼 (팝업)" }).getAttribute("href")).includes("f442cd37")); check("own-key status, persisted model selection and platform manual are connected");
  await page.screenshot({ path: path.join(artifacts, "continuation-settings.png"), fullPage: true });
  await menu("대시보드").click(); analysisMode = "missing"; await page.getByRole("button", { name: "✨ 달성 결과 분석하기", exact: true }).click(); await page.getByRole("dialog", { name: "본인 Gemini 키 등록 안내" }).waitFor(); await page.getByRole("button", { name: "닫기", exact: true }).click();
  analysisMode = "malformed"; await page.getByRole("button", { name: "✨ 달성 결과 분석하기", exact: true }).click(); await page.getByRole("alert").waitFor(); assert.equal(await page.getByRole("heading", { name: "오늘의 성과", exact: true }).isVisible(), true);
  analysisMode = "success"; await page.getByRole("button", { name: "✨ 달성 결과 분석하기", exact: true }).click(); await page.getByText("모의 분석 결과입니다.", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(artifacts, "continuation-analysis-fixture.png"), fullPage: true });
  await page.getByRole("textbox", { name: "할 일 검색" }).fill("없는 범위"); assert.equal(await page.getByText("모의 분석 결과입니다.", { exact: true }).count(), 0); await page.getByRole("textbox", { name: "할 일 검색" }).fill(""); check("missing key opens guidance, malformed analysis preserves UI, and a scope change clears old analysis");
  await menu("기록·백업").click(); let incoming = emptyWorkspace();
  incoming.categories = structuredClone(workspace.categories); incoming.settings.defaultCategoryId = workspace.settings.defaultCategoryId;
  incoming = applyCommand(incoming, { type: "task.add", input: { title: '=SUM(1,2) 한글 "인용"', categoryId: incoming.settings.defaultCategoryId, priority: "normal", estimatedMinutes: 1, plannedDate: localDate(Date.now()) } }, Date.now());
  const backupCount = workspace.tasks.length; const payload = { program: "ai-task-planner", appVersion: "v1.04", exportedAt: new Date().toISOString(), workspace: incoming };
  await page.getByLabel("백업 JSON 파일 (4MiB 이하)").setInputFiles({ name: "fixture.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(payload)) }); await page.getByLabel("백업 가져오기 미리보기").waitFor(); assert.equal(workspace.tasks.length, backupCount);
  await page.screenshot({ path: path.join(artifacts, "continuation-import-preview.png"), fullPage: true });
  await page.getByRole("button", { name: "가져오기 확정", exact: true }).click(); await page.getByText("백업 항목을 서버에 추가했습니다. 기존 기록은 보존했습니다.", { exact: true }).waitFor(); assert.equal(workspace.tasks.length, backupCount + 1); assert.equal(workspace.notes[localDate(Date.now())], "대시보드에서 한눈에 확인하고 저장했습니다.");
  await page.getByLabel("백업 JSON 파일 (4MiB 이하)").setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from('{"program":"wrong"}') }); await page.getByRole("alert").waitFor(); assert.equal(workspace.tasks.length, backupCount + 1); check("JSON preview writes nothing before confirmation; restore adds records and invalid files preserve existing notes/tasks");
  await page.getByRole("textbox", { name: "할 일 검색" }).fill("SUM"); const csvDownloadPromise = page.waitForEvent("download"); await page.getByRole("button", { name: "선택 범위 CSV 다운로드" }).click(); const csvDownload = await csvDownloadPromise; const csv = await readFile(await csvDownload.path(), "utf8"); assert.ok(csv.startsWith("\uFEFF")); assert.ok(csv.includes("실제집중(초·전체기간)")); assert.ok(csv.includes("'=SUM(1,2) 한글")); assert.equal(csv.includes("보고서 수정 완료"), false); check("actual Unicode CSV download respects the search scope and escapes a formula title");
  await page.getByRole("textbox", { name: "할 일 검색" }).fill(""); await menu("대시보드").click();
  await page.screenshot({ path: path.join(artifacts, "overview-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 1000, height: 950 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole("button", { name: "짧은 휴식", exact: true }).click();
  await page.getByRole("button", { name: "시작", exact: true }).click();
  await page.getByRole("button", { name: "현재 타이머 종료", exact: true }).click();
  await page.getByText("서버 저장 완료", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(artifacts, "overview-mobile.png"), fullPage: true });
  check("1000px and 390px overview reflows without overflow and mobile timer controls remain usable");
  await page.setViewportSize({ width: 1600, height: 950 });
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
