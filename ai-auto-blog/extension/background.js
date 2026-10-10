"use strict";

// BLOG 네이버 입력기 — 작업기(service worker), 2026-10-10 v1.41.
// 웹에서 "네이버 입력기로 보내기"를 누르면 이 작업기가 10초마다 서버의 자동 입력 대기 글을 가져가(POST /api/extension/task)
// 네이버 글쓰기 화면을 새로 열고 제목·본문·이미지·카테고리·태그까지 스스로 입력한다. 사이드패널은 상태를 보여주고 직접 시작/중지만 한다.
// 마지막 "발행" 버튼은 누르지 않는다 — 회원이 내용을 확인하고 직접 누른다.
importScripts("blog-core.js", "naver-page.js", "blog-engine.js", "naver-adapter.js");

const BASE = "https://ai-auto-blog-one.vercel.app";
const KEY = {
  token: "aiAutoBlogToken",
  blogId: "aiAutoBlogBlogId",
  settings: "aiAutoBlogPublishSettings",
  active: "blogActiveTask", // 지금 입력 중인 작업(작업기가 재시작되면 이 기록으로 중단을 알 수 있다)
  pending: "blogPendingResult", // 서버가 저장을 확인해 줄 때까지 보관하는 결과
  state: "blogTaskState", // 사이드패널에 보여줄 진행 상태
  notify: "aiAutoBlogNotify", // 작업이 끝나면 크롬 알림(기본 켜짐, false면 끔)
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const { TaskError, runInputTask } = self.BlogEngine;

let busy = false;
let cancelRequested = false;
let superseded = false;
let currentTask = null;

const get = (keys) => chrome.storage.local.get(keys);
const set = (values) => chrome.storage.local.set(values);

async function recordError(error) {
  try { await set({ [KEY.state]: { final: true, outcome: "error", message: `작업기 오류: ${error?.message || error}`, updatedAt: Date.now() } }); } catch { /* ignore */ }
}
// Chrome은 비동기 이벤트 처리기의 거절을 기다려 주지 않는다 — 모든 진입점이 직접 오류를 처리한다.
const run = (operation) => Promise.resolve().then(operation).catch(recordError);

async function web(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

// 진행 상태 갱신은 순서대로 한 줄로 처리한다(동시에 읽고 쓰면 나중 것이 앞의 변경을 지워 최종 상태가 틀어질 수 있다).
let stateQueue = Promise.resolve();
function setState(patch) {
  const next = stateQueue.then(async () => {
    const current = (await get(KEY.state))[KEY.state] || {};
    await set({ [KEY.state]: { ...current, ...patch, updatedAt: Date.now() } });
  });
  stateQueue = next.catch(() => {});
  return next;
}

// ---- 결과 보고: 서버가 저장했다고 확인(success·persisted·status 일치)할 때까지 로컬에 보관하고 보고만 다시 시도한다 ----
async function flushPending() {
  const stored = await get([KEY.pending, KEY.token]);
  const pending = stored[KEY.pending];
  const token = stored[KEY.token];
  if (!pending || !token) return true;
  try {
    const { ok, status, data } = await web(`/api/extension/posts/${encodeURIComponent(pending.id)}/input-result`, { method: "POST", token, body: { status: pending.status, error: pending.error || "", ...(pending.runId ? { runId: pending.runId } : {}) } });
    if (ok && data.success === true && data.persisted === true && data.status === pending.status) {
      await chrome.storage.local.remove(KEY.pending);
      return true;
    }
    // 서버가 "이 결과는 기록할 수 없다"고 확실히 답한 경우(글이 다시 보내졌거나 없어짐 등)는 다시 시도해도 같다 — 보관을 끝내고 안내만 남긴다.
    if ([400, 404, 409].includes(status)) {
      await chrome.storage.local.remove(KEY.pending);
      await setState({ reportNote: `서버가 입력 결과(${pending.status})를 기록하지 않았습니다: ${data.error || status}. 웹에서 글이 다시 보내졌거나 삭제됐을 수 있습니다.` });
      return true;
    }
  } catch { /* 네트워크 오류 — 다음에 보고만 다시 시도 */ }
  return false;
}

async function reportStatus(id, status, error = "", runId = "") {
  await set({ [KEY.pending]: { id, status, error: String(error || "").slice(0, 500), runId: runId || "", at: Date.now() } });
  const done = await flushPending();
  if (!done) await setState({ reportNote: "서버에 결과를 아직 전달하지 못했습니다. 결과는 확장에 보관되어 있으며 연결되면 다시 보고합니다." });
  return done;
}

// ---- 이미지 내려받기 ----
async function loadAsset(block, index) {
  const response = await fetch(block.url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(String(response.status));
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 0x8000));
  const mime = blob.type && blob.type.startsWith("image/") ? blob.type : "image/png";
  return { dataUrl: `data:${mime};base64,${btoa(binary)}`, name: self.BlogCore.imageFileName(index, block.url, mime) };
}

async function loadSettings() {
  const stored = (await get(KEY.settings))[KEY.settings] || {};
  return { category: String(stored.category || "").trim(), tags: self.BlogCore.parseTagInput(stored.tags) };
}

async function setBadge(text, color) {
  try { await chrome.action.setBadgeText({ text }); if (text) await chrome.action.setBadgeBackgroundColor({ color }); } catch { /* ignore */ }
}

// ---- 완료 알림(v1.44) ----
// 입력이 끝나면(발행 직전 준비 완료·입력 완료·실패) 크롬 알림으로 알려 준다. 알림을 누르면 그 네이버 글쓰기 탭으로 이동한다. 사용자가 중지한 경우는 알리지 않는다.
async function notifyOutcome({ outcome, title, message, tabId }) {
  try {
    if (!chrome.notifications || !["publish_ready", "completed", "failed"].includes(outcome)) return;
    if ((await get(KEY.notify))[KEY.notify] === false) return;
    const heading = outcome === "publish_ready" ? "발행 직전 준비 완료" : outcome === "completed" ? "네이버 입력 완료" : "네이버 입력 중단";
    const body = outcome === "publish_ready"
      ? `「${title}」 내용을 확인하고 네이버의 마지막 발행 버튼을 눌러 주세요.`
      : outcome === "completed"
        ? `「${title}」 본문 입력은 끝났습니다. 카테고리·태그를 확인하고 직접 발행해 주세요.`
        : `「${title}」 ${String(message || "").slice(0, 120)}`;
    const id = `blog-${outcome}-${Date.now()}`;
    await chrome.notifications.create(id, { type: "basic", iconUrl: "icons/icon128.png", title: `BLOG 네이버 입력기 · ${heading}`, message: body, priority: 2, requireInteraction: outcome !== "failed" });
    if (tabId != null) await set({ blogNotifyTab: { id, tabId } });
  } catch { /* 알림 실패는 작업 결과에 영향이 없다 */ }
}

// ---- 작업 실행 ----
async function runTask(task, mode) {
  const stored = await get([KEY.blogId]);
  const blogId = String(stored[KEY.blogId] || "").trim();
  currentTask = task.id;
  cancelRequested = false;
  superseded = false;
  const runId = task.runId || "";
  await set({ [KEY.active]: { id: task.id, runId, title: task.title, mode, startedAt: Date.now(), stage: "preparing" } });
  // 실행 임대: 입력하는 동안 45초마다 서버에 "살아 있음"을 알린다. 서버가 이 실행이 더는 유효하지 않다고(409) 답하면 입력을 중지한다.
  const heartbeat = runId ? setInterval(() => run(async () => {
    const token = (await get(KEY.token))[KEY.token];
    if (!token) return;
    try {
      const { status } = await web(`/api/extension/posts/${encodeURIComponent(task.id)}/heartbeat`, { method: "POST", token, body: { runId } });
      if (status === 409) { superseded = true; cancelRequested = true; }
    } catch { /* 네트워크 오류는 무시 — 임대가 끝나면 서버가 알아서 정리한다 */ }
  }), 45000) : null;
  await setState({ id: task.id, runId, title: task.title, mode, final: false, outcome: "", stage: "preparing", message: "작업을 준비하는 중...", typedChars: 0, totalChars: 0, warnings: [], reportNote: "" });
  await setBadge("", "#000000");

  const adapter = self.BlogNaverAdapter.createNaverAdapter({ chrome, pageFn: self.blogEditorCommand, TaskError, sleep });
  try {
    if (!blogId) throw new TaskError("BLOG_ID_MISSING", "네이버 블로그 ID가 설정되지 않았습니다. 사이드패널에서 내 블로그 ID를 먼저 저장해주세요.");
    const blocks = Array.isArray(task.blocks) ? task.blocks : [];
    const imageBlocks = blocks.map((block, index) => ({ block, index })).filter((entry) => entry.block.type === "image");
    const assets = {};
    let loaded = 0;
    for (const { block, index } of imageBlocks) {
      if (cancelRequested) throw new TaskError("CANCELLED", "사용자가 입력을 중지했습니다.");
      loaded += 1;
      await setState({ stage: "preparing", message: `이미지 ${loaded}/${imageBlocks.length}장을 불러오는 중...` });
      try { assets[index] = await loadAsset(block, index); } catch { /* 불러오지 못한 이미지는 건너뛰고 경고로 알린다 */ }
    }
    const settings = await loadSettings();
    const result = await runInputTask({
      task, assets, adapter, blogId, settings,
      progress: (stage, message, extra) => {
        run(async () => {
          await setState({ stage, message, ...(extra || {}) });
          const active = (await get(KEY.active))[KEY.active];
          if (active?.id === task.id && active.stage !== stage) await set({ [KEY.active]: { ...active, stage } });
        });
      },
      report: (status, error) => reportStatus(task.id, status, error, runId),
      isCancelled: () => cancelRequested,
      sleep,
    });
    await setState({ final: true, outcome: result.status, stage: result.status, message: result.message, warnings: result.warnings || [], imageCount: result.imageCount, linkedCount: result.linkedCount });
    await setBadge(result.status === "publish_ready" ? "준비" : "완료", result.status === "publish_ready" ? "#16a34a" : "#2563eb");
    await notifyOutcome({ outcome: result.status, title: task.title, message: result.message, tabId: adapter.state.tabId });
  } catch (error) {
    const code = error instanceof TaskError ? error.code : "INPUT_FAILED";
    const message = error instanceof TaskError ? error.message : self.BlogCore.formatBrowserError(error, "네이버 편집기 입력");
    const stopped = superseded && code === "CANCELLED";
    await reportStatus(task.id, "failed", `[${code}] ${message}`, runId); // 대체된 실행의 보고는 서버가 거절(409)하고 확장은 보관을 끝낸다
    await setState({ final: true, outcome: code === "CANCELLED" ? "cancelled" : "failed", stage: "failed", message: stopped ? "웹에서 이 글이 다시 보내졌거나 이 실행이 끝난 것으로 처리되어 입력을 중지했습니다. 네이버 화면의 내용을 확인한 뒤 필요하면 다시 보내주세요." : message });
    await setBadge(code === "CANCELLED" ? "" : "실패", "#dc2626");
    if (code !== "CANCELLED") await notifyOutcome({ outcome: "failed", title: task.title, message, tabId: adapter.state.tabId });
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    try { await adapter.cleanup(); } catch { /* ignore */ }
    currentTask = null;
    await chrome.storage.local.remove(KEY.active);
  }
}

// 작업 도중 작업기가 재시작된 경우: 입력 중이던 글은 "중단"으로 보고한다. 자동으로 다시 입력하지 않는다(중복 입력 방지).
async function recoverInterrupted(active) {
  if (active.stage === "settings" || active.stage === "publish_ready" || active.stage === "completed") {
    await chrome.storage.local.remove(KEY.active); // 입력은 이미 검증·보고됨
    return;
  }
  await reportStatus(active.id, "failed", "[EXTENSION_INTERRUPTED] 입력 중 확장이 다시 시작되어 중단했습니다. 네이버 편집기에 일부 입력된 내용이 남아 있을 수 있습니다. 내용을 확인한 뒤 BLOG에서 다시 보내주세요. 자동으로 다시 입력하지 않았습니다.", active.runId || "");
  await setState({ id: active.id, title: active.title, final: true, outcome: "failed", stage: "failed", message: "입력 중 확장이 다시 시작되어 중단했습니다. 네이버 화면을 확인하고 BLOG에서 다시 보내주세요." });
  await chrome.storage.local.remove(KEY.active);
}

async function pump() {
  if (busy) return;
  busy = true;
  try {
    const stored = await get([KEY.token, KEY.blogId, KEY.active]);
    const token = stored[KEY.token];
    if (!token) return;
    await flushPending();
    if (stored[KEY.active] && currentTask === null) { await recoverInterrupted(stored[KEY.active]); }
    if (!String(stored[KEY.blogId] || "").trim()) return; // 블로그 ID 없이는 자동 입력을 가져가지 않는다(가져가면 실패로 끝난다)
    const { ok, status, data } = await web("/api/extension/task", { method: "POST", token, body: {} });
    if (!ok) { if (status !== 401) await setState({ connection: `서버 연결 확인 실패 (${status})` }); return; }
    if (data.task) await runTask(data.task, "auto");
  } catch { /* 네트워크 오류 — 다음 주기에 다시 */ } finally { busy = false; }
}

// ---- 사이드패널 메시지 ----
async function startManual(postId) {
  if (busy || currentTask !== null) throw new Error("이미 입력 작업이 진행 중입니다. 끝나거나 중지한 뒤 시작해주세요.");
  busy = true;
  try {
    const stored = await get([KEY.token, KEY.blogId, KEY.active]);
    if (!stored[KEY.token]) throw new Error("먼저 BLOG 연동 토큰으로 연결해주세요.");
    if (!String(stored[KEY.blogId] || "").trim()) throw new Error("내 네이버 블로그 ID를 먼저 저장해주세요.");
    if (stored[KEY.active]) throw new Error("이전 작업 정리가 끝나지 않았습니다. 잠시 후 다시 시도해주세요.");
    const list = await web("/api/extension/posts", { token: stored[KEY.token] });
    if (!list.ok) throw new Error(list.data.error || `보낸 글 조회 실패 (${list.status})`);
    const post = (list.data.posts || []).find((item) => String(item.id) === String(postId));
    if (!post) throw new Error("선택한 글을 찾지 못했습니다. 목록을 새로고침해주세요.");
    // 직접 시작은 서버에서 새 실행 번호와 임대를 받아야(저장 확인) 시작한다. 살아 있는 다른 실행이 있으면 서버가 거절한다.
    const claimed = await web(`/api/extension/posts/${encodeURIComponent(post.id)}/start`, { method: "POST", token: stored[KEY.token], body: {} });
    if (!claimed.ok || claimed.data.success !== true || claimed.data.persisted !== true || !claimed.data.runId) throw new Error(claimed.data.error || `입력 시작을 서버에 기록하지 못했습니다 (${claimed.status})`);
    const task = { id: post.id, runId: claimed.data.runId, title: post.title || "", blocks: post.blocks || [], tags: post.tags || [] };
    // 작업은 기다리지 않고 백그라운드에서 진행한다(busy는 작업이 끝날 때 해제).
    runTask(task, "manual").catch(recordError).finally(() => { busy = false; });
  } catch (error) { busy = false; throw error; }
}

// 이미 입력이 끝난 글의 발행 설정(카테고리·태그)만 다시 입력
async function reapplySettings() {
  if (busy || currentTask !== null) throw new Error("입력 작업이 진행 중입니다. 끝난 뒤 다시 시도해주세요.");
  busy = true;
  try {
    const stored = await get([KEY.blogId, KEY.state]);
    const blogId = String(stored[KEY.blogId] || "").trim();
    if (!blogId) throw new Error("내 네이버 블로그 ID를 먼저 저장해주세요.");
    const settings = await loadSettings();
    if (!settings.category && !settings.tags.length) throw new Error("태그 또는 카테고리를 입력해주세요.");
    const adapter = self.BlogNaverAdapter.createNaverAdapter({ chrome, pageFn: self.blogEditorCommand, TaskError, sleep });
    adapter.state.blogId = blogId;
    const tabs = (await chrome.tabs.query({ url: "https://blog.naver.com/*" })).filter((tab) => adapter.ownEditorUrl(tab.url, blogId));
    if (tabs.length !== 1) throw new Error(tabs.length ? "내 블로그 글쓰기 탭이 여러 개 열려 있습니다. 하나만 남기고 다시 시도해주세요." : "내 블로그 글쓰기 탭을 찾지 못했습니다.");
    adapter.state.tabId = tabs[0].id;
    try {
      await adapter.openPublishSettings();
      if (settings.tags.length) await adapter.applyTags(settings.tags, { shouldStop: () => cancelRequested });
      if (settings.category) await adapter.applyCategory(settings.category);
    } finally { await adapter.cleanup(); }
    const last = (stored[KEY.state] || {});
    if (last.id) await reportStatus(last.id, "publish_ready", "", last.runId || "");
    await setState({ final: true, outcome: "publish_ready", stage: "publish_ready", message: "카테고리·태그 입력 완료. 내용을 확인한 뒤 네이버의 마지막 발행 버튼만 직접 누르세요." });
  } finally { busy = false; }
}

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  (async () => {
    if (message.type === "status") {
      const stored = await get([KEY.active, KEY.pending, KEY.state]);
      run(pump);
      return { active: stored[KEY.active] || null, pending: stored[KEY.pending] || null, state: stored[KEY.state] || null, running: currentTask !== null };
    }
    if (message.type === "start") { await startManual(message.postId); return { ok: true }; }
    if (message.type === "cancel") { if (currentTask === null) return { ok: true, idle: true }; cancelRequested = true; return { ok: true }; }
    if (message.type === "reapplySettings") { await reapplySettings(); return { ok: true }; }
    if (message.type === "ackBadge") { await setBadge("", "#000000"); return { ok: true }; }
    if (message.type === "pump") { run(pump); return { ok: true }; }
    throw new Error("지원하지 않는 요청");
  })().then((result) => { try { reply(result); } catch { /* 패널이 닫힘 */ } }, (error) => { try { reply({ error: error?.message || String(error) }); } catch { /* ignore */ } });
  return true;
});

// 알림을 누르면 입력한 네이버 글쓰기 탭으로 이동한다(탭이 이미 닫혔다면 아무것도 하지 않는다).
chrome.notifications?.onClicked?.addListener((notificationId) => run(async () => {
  const stored = (await get("blogNotifyTab")).blogNotifyTab;
  try { await chrome.notifications.clear(notificationId); } catch { /* ignore */ }
  if (!stored || stored.id !== notificationId || stored.tabId == null) return;
  try {
    const tab = await chrome.tabs.update(stored.tabId, { active: true });
    if (tab?.windowId != null) await chrome.windows.update(tab.windowId, { focused: true });
  } catch { /* 탭이 닫힘 */ }
}));

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
try { Promise.resolve(chrome.alarms.create("blog-pump", { periodInMinutes: 0.5 })).catch(() => {}); } catch { /* ignore */ }
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === "blog-pump") run(pump); });
chrome.runtime.onStartup.addListener(() => run(pump));
chrome.runtime.onInstalled.addListener(() => run(pump));
// 깨어 있는 동안 10초마다 서버의 자동 입력 대기 글을 확인한다. 작업기가 잠들면 알람(30초)이 깨운다.
setInterval(() => run(pump), 10000);
run(pump);
