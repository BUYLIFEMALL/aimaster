chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

importScripts("naver-category-page.js");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
    const opened = (await runInFrames(tabId, "openPublishSettings")).find((entry) => entry.result?.ok);
    if (!opened) throw new Error("네이버 발행 설정창을 열지 못했습니다. 글쓰기 화면이 열려 있는지 확인해 주세요.");
    await sleep(600);
    let last = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const results = await runInFrames(tabId, "categories");
      const hit = results.find((entry) => entry.result?.ok);
      if (hit) return { categories: hit.result.categories };
      last = results.find((entry) => entry.result && !entry.result.notHere)?.result || last;
      if (last && !last.notHere) break;
      await sleep(500);
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

chrome.runtime.onMessage.addListener((message, sender, reply) => {
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
