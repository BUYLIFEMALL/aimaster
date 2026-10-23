chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});


const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); // sidepanel.js의 sleep과 이름이 겹치지 않게 한다
let categoryBusy = false;

async function runInFrames(tabId, command, args = {}) {
  const results = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: aioCategoryCommand, args: [command, args] });
  return results.map((entry) => ({ frameId: entry.frameId, result: entry.result || { ok: false, error: "응답 없음" } }));
}

// 회원의 실제 네이버 카테고리 목록을 읽는다: 새 탭에서 발행 설정창만 열어 읽고 닫는다(쓰던 탭은 건드리지 않고 최종 발행은 누르지 않는다).
async function readNaverCategories(senderTab) {
  if (categoryBusy) throw new Error("이미 카테고리를 읽는 중입니다. 잠시 후 다시 눌러 주세요.");
  categoryBusy = true;
  let tabId = null;
  try {
    const tab = await chrome.tabs.create({ url: "https://blog.naver.com/GoBlogWrite.naver", active: true });
    tabId = tab.id;
    const deadline = Date.now() + 90000;
    let readySince = 0;
    for (;;) {
      if (Date.now() > deadline) throw new Error("90초 안에 네이버 글쓰기 화면을 준비하지 못했습니다. 네이버에 로그인한 뒤 다시 눌러 주세요.");
      const current = await chrome.tabs.get(tabId);
      if (current.status === "loading") { readySince = 0; await waitMs(500); continue; }
      let dismissed = false;
      let state = "loading";
      try {
        dismissed = (await runInFrames(tabId, "dismissResume")).some((entry) => entry.result?.dismissed);
        const states = (await runInFrames(tabId, "inspect")).map((entry) => entry.result?.status);
        state = states.includes("login") ? "login" : states.includes("ready") ? "ready" : "loading";
      } catch { /* 이동 중에는 다시 시도 */ }
      if (dismissed || state !== "ready") { readySince = 0; await waitMs(700); continue; }
      if (!readySince) readySince = Date.now();
      if (Date.now() - readySince >= 1500) break;
      await waitMs(300);
    }
    const opened = (await runInFrames(tabId, "openPublishSettings")).find((entry) => entry.result?.ok);
    if (!opened) throw new Error("네이버 발행 설정창을 열지 못했습니다. 글쓰기 화면이 열려 있는지 확인해 주세요.");
    await waitMs(600);
    let last = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const results = await runInFrames(tabId, "categories");
      const hit = results.find((entry) => entry.result?.ok);
      if (hit) return { categories: hit.result.categories };
      last = results.find((entry) => entry.result && !entry.result.notHere)?.result || last;
      if (last && !last.notHere) break;
      await waitMs(500);
    }
    throw new Error(last?.reason || last?.error || "네이버 카테고리를 읽지 못했습니다.");
  } finally {
    if (tabId != null) { try { await chrome.tabs.remove(tabId); } catch { /* 이미 닫힘 */ } }
    if (senderTab?.id != null) {
      try { await chrome.tabs.update(senderTab.id, { active: true }); if (senderTab.windowId != null) await chrome.windows.update(senderTab.windowId, { focused: true }); } catch { /* ignore */ }
    }
    categoryBusy = false;
  }
}

// 카테고리 목록은 SEO 스튜디오 사이트 화면(web-bridge.js)에서 온 요청만 받는다.
// 2026-10-23: 웹 「바로 연결」 — 우리 사이트 화면에서 온 새 연결 코드만, 서버 확인(whoami)을 통과하면 저장한다.
const STUDIO_ORIGINS = ["https://naver-blog-seo-studio.vercel.app/", "https://naver-blog-seo-studio.buylife.xyz/"];
async function connectWithToken(token) {
  if (!/^pat_[0-9a-f]{64}$/.test(token)) return { ok: false, error: "연결 코드 형식이 올바르지 않습니다." };
  const response = await fetch("https://naver-blog-seo-studio.buylife.xyz/api/extension/whoami", { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, error: body.error || `연결 확인 실패 (${response.status})` };
  await chrome.storage.local.set({ seoStudioToken: token });
  return { ok: true, email: body.email || "" };
}

// 2026-10-23: 사이드패널이 보낸 입력·자동 포스팅을 여기서 실행한다. 엔진이 화면에 쓰는 값($("…").textContent 등)은
// 대체 요소에 모아 chrome.storage에 저장하고, 사이드패널이 열려 있으면 그 값을 그대로 화면에 비춘다.
let seoRunActive = false;
let seoRunUi = { running: false, mode: "", props: {} };
let seoRunFlushTimer = null;
const seoRunElements = new Map();
function flushSeoRunUi() {
  clearTimeout(seoRunFlushTimer);
  seoRunFlushTimer = null;
  return chrome.storage.local.set({ [SEO_RUN_UI]: { ...seoRunUi, aliveAt: Date.now() } }).catch(() => {});
}
function seoRunUiElement(id) {
  if (seoRunElements.has(id)) return seoRunElements.get(id);
  const values = {};
  const element = { addEventListener() {}, close() {}, showModal() {} };
  for (const prop of ["textContent", "hidden", "href", "value", "disabled"]) {
    Object.defineProperty(element, prop, {
      get: () => values[prop] ?? (prop === "hidden" || prop === "disabled" ? false : ""),
      set: (next) => {
        values[prop] = next;
        if (prop === "value") return; // 입력칸 값은 사이드패널이 보낸 값을 읽기만 한다
        seoRunUi.props[id] = { ...seoRunUi.props[id], [prop]: next };
        if (!seoRunFlushTimer) seoRunFlushTimer = setTimeout(flushSeoRunUi, 250);
      },
    });
  }
  seoRunElements.set(id, element);
  return element;
}
const SEO_RUN_BUTTONS = ["fill", "previewFill", "autoPublish", "reconcilePublish"];
async function runSeoJob(mode, payload) {
  seoRunActive = true;
  seoRunUi = { running: true, mode, startedAt: Date.now(), props: {} };
  webDrafts = payload.draft ? [payload.draft] : [];
  activeWebDraftId = String(payload.draftId || "");
  activeWebDraftTitle = String(payload.title || "");
  activeWebDraftBody = String(payload.body || "");
  activeWebDraftCoverDataUrl = String(payload.coverDataUrl || "");
  activeWebDraftContentImages = Array.isArray(payload.contentImages) ? payload.contentImages : [];
  activeWebDraftBlocks = Array.isArray(payload.blocks) ? payload.blocks : [];
  for (const [id, value] of Object.entries(payload.inputs || {})) $(id).value = String(value ?? "");
  $("publishResultLink").hidden = true;
  for (const id of SEO_RUN_BUTTONS) $(id).disabled = true;
  await flushSeoRunUi();
  // 서비스 워커는 할 일이 없으면 잠들 수 있으므로, 실행 중에는 20초마다 확장 API를 불러 깨어 있게 한다.
  const keepAlive = setInterval(() => { chrome.runtime.getPlatformInfo().catch(() => {}); flushSeoRunUi(); }, 20 * 1000);
  try {
    if (mode === "fill") await fillDraftIntoNaver();
    else if (mode === "auto") await startAutoPublication();
    else await reconcileAutoPublication();
  } catch (error) {
    $("generateStatus").textContent = mode === "fill" ? formatBrowserError(error, "네이버 편집기 입력") : (error instanceof Error ? error.message : String(error));
  } finally {
    clearInterval(keepAlive);
    $("keepPanelOpen").hidden = true;
    for (const id of SEO_RUN_BUTTONS) $(id).disabled = false;
    seoRunUi.running = false;
    seoRunActive = false;
    await flushSeoRunUi();
  }
}
// 2026-10-23: 입력 엔진(sidepanel.js·auto-publish.js)도 여기서 불러와(위 실행부 선언 뒤에 불러야 엔진이 불러와질 때 $가 동작한다), 사이드패널을 닫아도 입력·자동 포스팅이 이어지게 한다.
importScripts("naver-category-page.js", "sidepanel.js", "auto-publish-page.js", "auto-publish.js");
// 워커가 새로 시작됐는데 「실행 중」 기록이 남아 있으면, 앞 워커가 실행 도중 끝난 것이다(확장 새로고침 등).
chrome.storage.local.get?.(SEO_RUN_UI)?.then((stored) => {
  const saved = stored?.[SEO_RUN_UI];
  if (!saved?.running || seoRunActive) return;
  const props = { ...saved.props, generateStatus: { textContent: "확장이 다시 시작되어 이전 입력이 중간에 멈췄습니다. 네이버 탭의 글을 확인한 뒤 다시 시작하세요." }, keepPanelOpen: { hidden: true } };
  for (const id of SEO_RUN_BUTTONS) props[id] = { disabled: false };
  return chrome.storage.local.set({ [SEO_RUN_UI]: { ...saved, running: false, props, aliveAt: Date.now() } });
}).catch(() => {});

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type === "seoRun") {
    // 이 확장의 사이드패널에서 온 요청만 받는다(네이버·스튜디오 페이지의 스크립트는 거절).
    if (sender?.id !== chrome.runtime.id || sender?.tab || !String(sender?.url || "").startsWith(chrome.runtime.getURL("sidepanel.html"))) { reply({ ok: false, error: "허용되지 않은 요청입니다." }); return false; }
    if (!["fill", "auto", "reconcile"].includes(message.mode)) { reply({ ok: false, error: "알 수 없는 작업입니다." }); return false; }
    if (seoRunActive) { reply({ ok: false, error: "이미 입력이 진행 중입니다. 끝난 뒤 다시 눌러 주세요." }); return false; }
    runSeoJob(message.mode, message.payload || {});
    reply({ ok: true });
    return false;
  }
  if (message?.type === "connect") {
    if (!STUDIO_ORIGINS.some((o) => String(sender?.url || "").startsWith(o))) { reply({ ok: false, error: "허용되지 않은 요청입니다." }); return false; }
    connectWithToken(String(message.token || "")).then((result) => {
      reply(result);
      if (result.ok && message.closeTab && sender.tab?.id) setTimeout(() => chrome.tabs.remove(sender.tab.id).catch(() => {}), 1500);
    }, (error) => reply({ ok: false, error: error?.message || String(error) }));
    return true;
  }
  if (message?.type !== "categories") return false;
  if (!["https://naver-blog-seo-studio.vercel.app/", "https://naver-blog-seo-studio.buylife.xyz/"].some((o) => String(sender?.url || "").startsWith(o))) { reply({ error: "허용되지 않은 요청입니다." }); return false; }
  readNaverCategories(sender.tab).then((result) => reply(result), (error) => reply({ error: error?.message || String(error) }));
  return true;
});
