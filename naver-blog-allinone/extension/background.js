// background.js - 네이버 블로그 올인원 마스터 PRO
importScripts("naver-category-page.js");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let categoryBusy = false;

// 모든 프레임에서 카테고리 명령을 실행하고 [{frameId, result}]로 돌려준다.
async function runInFrames(tabId, command, args = {}) {
  const results = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: aioCategoryCommand, args: [command, args] });
  return results.map((entry) => ({ frameId: entry.frameId, result: entry.result || { ok: false, error: "응답 없음" } }));
}

// 발행 설정창을 열고(첫 발행 버튼만) 카테고리 목록을 읽거나 하나를 선택한다. 최종 발행은 누르지 않는다.
async function openSettingsAndRun(tabId, command, args) {
  const opened = (await runInFrames(tabId, "openPublishSettings")).find((entry) => entry.result?.ok);
  if (!opened) throw new Error("네이버 발행 설정창을 열지 못했습니다. 글쓰기 화면이 열려 있는지 확인해 주세요.");
  await sleep(600);
  let last = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const results = await runInFrames(tabId, command, args);
    const hit = results.find((entry) => entry.result?.ok);
    if (hit) return hit.result;
    last = results.find((entry) => entry.result && !entry.result.notHere)?.result || last;
    if (last && !last.notHere) break;
    await sleep(500);
  }
  throw new Error(last?.reason || last?.error || "네이버 카테고리를 읽지 못했습니다.");
}

// 회원의 실제 네이버 카테고리 목록을 읽는다: 새 탭에서 발행 설정창만 열어 읽고 닫는다(쓰던 탭은 건드리지 않는다).
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
      if (current.status === "loading") { readySince = 0; await sleep(500); continue; }
      let dismissed = false;
      let state = "loading";
      try {
        dismissed = (await runInFrames(tabId, "dismissResume")).some((entry) => entry.result?.dismissed);
        const states = (await runInFrames(tabId, "inspect")).map((entry) => entry.result?.status);
        state = states.includes("login") ? "login" : states.includes("ready") ? "ready" : "loading";
      } catch { /* 이동 중에는 다시 시도 */ }
      if (dismissed || state !== "ready") { readySince = 0; await sleep(700); continue; }
      if (!readySince) readySince = Date.now();
      if (Date.now() - readySince >= 1500) break;
      await sleep(300);
    }
    const result = await openSettingsAndRun(tabId, "categories", {});
    return { categories: result.categories };
  } finally {
    if (tabId != null) { try { await chrome.tabs.remove(tabId); } catch { /* 이미 닫힘 */ } }
    if (senderTab?.id != null) {
      try { await chrome.tabs.update(senderTab.id, { active: true }); if (senderTab.windowId != null) await chrome.windows.update(senderTab.windowId, { focused: true }); } catch { /* ignore */ }
    }
    categoryBusy = false;
  }
}
chrome.runtime.onInstalled.addListener(() => {
  console.log("[AIMaster 올인원 마스터] 확장 프로그램이 설치되었습니다.");
});

// 메시지 리스너 (원고 동기화 및 탭 열기)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "SAVE_DRAFT") {
    chrome.storage.local.set({ currentDraft: message.draft }, () => {
      sendResponse({ status: "SUCCESS" });
    });
    return true;
  }

  if (message.action === "GET_DRAFT") {
    chrome.storage.local.get(["currentDraft"], (result) => {
      sendResponse({ draft: result.currentDraft || null });
    });
    return true;
  }

  // 올인원 웹 화면의 [카테고리 불러오기] 요청(웹 출처에서 온 것만)
  if (message.action === "READ_NAVER_CATEGORIES") {
    if (!/^(https:\/\/naver-blog-allinone\.(buylife\.xyz|vercel\.app)\/|http:\/\/localhost:3000\/)/.test(String(sender?.url || ""))) {
      sendResponse({ error: "허용되지 않은 요청입니다." });
      return true;
    }
    readNaverCategories(sender.tab).then((r) => sendResponse(r), (e) => sendResponse({ error: e?.message || String(e) }));
    return true;
  }

  // 네이버 글쓰기 화면의 위젯에서 온 [카테고리 적용] 요청(발행 설정창을 열고 선택까지만, 최종 발행은 회원이)
  if (message.action === "APPLY_NAVER_CATEGORY") {
    if (!/^https:\/\/blog\.naver\.com\//.test(String(sender?.url || "")) || sender.tab?.id == null) {
      sendResponse({ error: "허용되지 않은 요청입니다." });
      return true;
    }
    const c = message.category || {};
    openSettingsAndRun(sender.tab.id, "categorySelect", { id: String(c.id || ""), name: String(c.name || "") })
      .then((r) => sendResponse({ ok: true, name: r.name }), (e) => sendResponse({ error: e?.message || String(e) }));
    return true;
  }

  if (message.action === "OPEN_NAVER_EDITOR") {
    chrome.tabs.create({ url: "https://blog.naver.com/GoBlogWrite.naver" });
    sendResponse({ status: "SUCCESS" });
    return true;
  }
});
