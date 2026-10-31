// 감시 화면 1곳 수집. 회원이 저장한 네이버 화면을 배경 탭으로 열어, 페이지가 스스로 불러온 목록 응답만 읽는다.
// 네이버로 직접 요청을 보내지 않는다. 다음 페이지도 목록을 스크롤해 페이지가 부르게 한다.
// 차단(401·403·429)·확인 화면·로그인 화면이면 바로 멈추고 우회하지 않는다.
import { BLOCK_TEXT, isBlockedStatus } from "./guard.js";

export const RULES = {
  listPath: "/api/articles",
  maxPagesPerTarget: 15,
  maxPagesPerDay: 200,
  firstLoadWaitMs: 8000,
  scrollWaitMs: [2500, 5000],
  betweenTargetsMs: [15000, 40000],
  scheduleJitter: 0.1,
};

export async function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await new Promise((r) => setTimeout(r, Math.min(10000, end - Date.now())));
    await chrome.runtime.getPlatformInfo(); // 기다리는 동안 서비스 워커가 잠들지 않게
  }
}
export const rand = (a, b) => a + Math.floor(Math.random() * Math.max(1, b - a));

const PAGE_CHECK = `(() => ({ host: location.hostname, blocked: ${BLOCK_TEXT}.test((document.body && document.body.innerText) || "") }))()`;
// 가장 많이 스크롤되는 영역(매물 목록)을 끝까지 내린다
const SCROLL_ONE = `(() => {
  let best = null, gap = 0;
  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    if (!/(auto|scroll)/.test(s.overflowY)) continue;
    const g = el.scrollHeight - el.clientHeight;
    if (g > gap && el.clientHeight > 150) { gap = g; best = el; }
  }
  const t = best || document.scrollingElement;
  t.scrollTop = t.scrollHeight;
  return true;
})()`;

const evalInPage = async (tabId, expression) =>
  (await chrome.debugger.sendCommand({ tabId }, "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }))?.result?.value;

function decodeBody(b) {
  const text = b.base64Encoded ? new TextDecoder().decode(Uint8Array.from(atob(b.body), (c) => c.charCodeAt(0))) : b.body;
  return JSON.parse(text);
}

/** 지도 묶음을 누른 응답(markerId)은 화면 전체 목록이 아니라서 뺀다 */
export function isViewList(rawUrl, listPath = RULES.listPath) {
  try {
    const u = new URL(rawUrl);
    return u.pathname === listPath && !u.searchParams.get("markerId");
  } catch {
    return false;
  }
}

/** @returns {Promise<{status:"ok"|"blocked"|"rule_mismatch"|"error", bodies:object[], complete:boolean, cortarNo?:string, error?:string}>} */
export async function collectView(url, log = async () => {}) {
  const bodies = [];
  const pending = new Set();
  const pageKeys = new Set();
  let blockedStatus = null;
  let blockedText = false;
  let lastMore = true;
  let cortarNo = null;
  let error = null;

  const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"] }).catch(() => null);
  const tab = await chrome.tabs.create({ url: "about:blank", active: false, ...(win?.id ? { windowId: win.id } : {}) });
  const tabId = tab.id;

  const onEvent = async (src, method, params) => {
    if (src.tabId !== tabId) return;
    if (method === "Network.responseReceived") {
      const rurl = String(params.response?.url || "");
      if (!isViewList(rurl)) return;
      if (isBlockedStatus(params.response.status)) blockedStatus = params.response.status;
      else {
        pending.add(params.requestId);
        cortarNo = cortarNo || new URL(rurl).searchParams.get("cortarNo");
      }
    } else if (method === "Network.loadingFinished" && pending.has(params.requestId)) {
      pending.delete(params.requestId);
      try {
        const body = decodeBody(await chrome.debugger.sendCommand({ tabId }, "Network.getResponseBody", { requestId: params.requestId }));
        const list = body?.articleList;
        const key = Array.isArray(list) && list.length ? String(list[0]?.articleNo) : "빈쪽";
        if (pageKeys.has(key)) return;
        pageKeys.add(key);
        bodies.push(body);
        lastMore = body?.isMoreData === true;
      } catch (e) {
        error = `응답 읽기 실패: ${String(e).slice(0, 80)}`;
      }
    }
  };

  chrome.debugger.onEvent.addListener(onEvent);
  try {
    await chrome.debugger.attach({ tabId }, "1.3");
    await chrome.debugger.sendCommand({ tabId }, "Network.enable");
    await chrome.debugger.sendCommand({ tabId }, "Page.navigate", { url });
    await sleep(RULES.firstLoadWaitMs);
    let stale = 0;
    for (let i = 0; i < RULES.maxPagesPerTarget + 3; i++) {
      if (blockedStatus) break;
      const page = await evalInPage(tabId, PAGE_CHECK);
      if (page && (page.blocked || !/land\.naver\.com$/.test(page.host))) { blockedText = true; break; }
      if (bodies.length >= RULES.maxPagesPerTarget) break;
      if (bodies.length && !lastMore) break;
      const before = bodies.length;
      await evalInPage(tabId, SCROLL_ONE);
      await sleep(rand(...RULES.scrollWaitMs));
      if (bodies.length === before) {
        stale += 1;
        if (stale >= 2) break;
      } else stale = 0;
    }
  } catch (e) {
    error = String(e).slice(0, 160);
    if (/Another debugger|Cannot attach|not attached/i.test(error)) error = "다른 확장이 이 탭을 조작 중이라 읽지 못했어요.";
  } finally {
    chrome.debugger.onEvent.removeListener(onEvent);
    try { await chrome.debugger.detach({ tabId }); } catch {}
    try { await chrome.tabs.remove(tabId); } catch {}
  }

  if (blockedStatus || blockedText) {
    const why = blockedStatus ? `네이버가 ${blockedStatus} 응답(접근 제한)을 보냈어요.` : "네이버 확인 화면(보안 문자·로그인)이 나타났어요.";
    await log(`멈춤: ${why}`);
    return { status: "blocked", bodies, complete: false, error: why };
  }
  if (!bodies.length) return { status: error ? "error" : "rule_mismatch", bodies, complete: false, error: error || "매물 목록 응답을 찾지 못했어요. 네이버 화면이 바뀌었을 수 있어요." };
  if (bodies.some((b) => !Array.isArray(b?.articleList))) return { status: "rule_mismatch", bodies: [], complete: false, error: "매물 목록 모양이 예상과 달라요." };
  return { status: "ok", bodies, complete: !lastMore, cortarNo, pagesRead: bodies.length };
}
