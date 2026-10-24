// 단지 1곳 수집 — 회원 PC·회원 본인 로그인으로, 페이지가 스스로 불러온 목록 응답만 읽는다(별도 요청을 만들지 않음).
// 순서: 보이는 창에 배경 새 탭(빈 탭) → 디버거 붙임 → 단지 화면으로 이동 → 목록 영역을 사람처럼 스크롤 → 응답 읽기
//       → 더 없음(isMoreData=false)·페이지 상한·새 응답 없음이면 멈춤 → 디버거 뗌 → 확장이 연 탭만 닫기.
// 차단(401·403·429)·확인 화면·로그인 화면이면 바로 멈추고 우회하지 않는다(인수인계 §3-3).
import { BLOCK_TEXT, isBlockedStatus, isRuleMismatch } from "./guard.js";

/** 기다리는 동안 10초마다 확장 API를 불러 서비스 워커가 잠들지 않게 한다(0단계에서 확인한 문제). */
export async function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await new Promise((r) => setTimeout(r, Math.min(10000, end - Date.now())));
    await chrome.runtime.getPlatformInfo();
  }
}
export const rand = (a, b) => a + Math.floor(Math.random() * Math.max(1, b - a));

const PAGE_CHECK = `(() => ({
  host: location.hostname,
  blocked: ${BLOCK_TEXT}.test((document.body && document.body.innerText) || ""),
}))()`;
// 가장 많이 스크롤되는 영역(매물 목록)을 끝까지 내려 다음 페이지를 부르게 한다.
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

async function evalInPage(tabId, expression) {
  const r = await chrome.debugger.sendCommand({ tabId }, "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  return r?.result?.value;
}

function decodeBody(b) {
  const text = b.base64Encoded ? new TextDecoder().decode(Uint8Array.from(atob(b.body), (c) => c.charCodeAt(0))) : b.body;
  return JSON.parse(text);
}

/**
 * @returns {Promise<{status: "ok"|"blocked"|"rule_mismatch"|"error", bodies: object[], complete: boolean, error?: string}>}
 */
export async function collectComplex(complexNo, rules, log = async () => {}) {
  const listKey = rules.fields?.list || "articleList";
  const moreKey = rules.fields?.more || "isMoreData";
  const url = String(rules.complexUrl).replace("{complexNo}", encodeURIComponent(complexNo));
  const bodies = [];
  const pending = new Set();
  let blockedStatus = null;
  let blockedText = false;
  let lastMore = true;
  let error = null;
  let listUrl = null; // 페이지가 부른 목록 주소(다음 페이지를 부를 때 page만 바꿈)
  let listAuth = null; // 페이지가 보낸 인증 머리글 — 이 수집 동안 메모리에만, 저장하지 않음
  // 같은 페이지가 두 번 잡히면(늦게 도착한 응답 등) 버린다 — 첫 매물 번호로 구분(2026-10-25: 3페이지를 건너뛴 원인)
  const pageKeys = new Set();
  const addBody = (body, how) => {
    const list = body?.[listKey];
    const key = Array.isArray(list) && list.length ? String(list[0]?.articleNo) : "빈쪽";
    if (pageKeys.has(key)) { diag.push(`겹친 응답 버림${how}`); return false; }
    pageKeys.add(key);
    bodies.push(body);
    lastMore = body?.[moreKey] === true;
    diag.push(`응답${bodies.length}: ${list?.length ?? "?"}건·더있음=${String(body?.[moreKey])}${how}`);
    return true;
  };
  const diag = []; // 진단 기록(2026-10-25: 2페이지가 안 읽히는 원인 찾기) — 숫자·상태만, 매물 내용 없음

  const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"] }).catch(() => null);
  const tab = await chrome.tabs.create({ url: "about:blank", active: false, ...(win?.id ? { windowId: win.id } : {}) });
  const tabId = tab.id;

  const onEvent = async (src, method, params) => {
    if (src.tabId !== tabId) return;
    if (method === "Network.requestWillBeSent" && String(params.request?.url || "").includes(rules.listPathIncludes)) {
      listUrl = params.request.url;
      const h = params.request.headers || {};
      if (h.authorization || h.Authorization) listAuth = h.authorization || h.Authorization;
      return;
    }
    if (method === "Network.responseReceived") {
      if (!String(params.response?.url || "").includes(rules.listPathIncludes)) return;
      if (isBlockedStatus(params.response.status)) blockedStatus = params.response.status;
      else pending.add(params.requestId);
    } else if (method === "Network.loadingFinished" && pending.has(params.requestId)) {
      pending.delete(params.requestId);
      try {
        const body = decodeBody(await chrome.debugger.sendCommand({ tabId }, "Network.getResponseBody", { requestId: params.requestId }));
        addBody(body, "");
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
    await sleep(rules.firstLoadWaitMs || 8000);

    let stale = 0;
    for (let i = 0; i < (rules.maxPagesPerTarget || 10) + 3; i++) {
      if (blockedStatus) break;
      const page = await evalInPage(tabId, PAGE_CHECK);
      if (page && (page.blocked || !/land\.naver\.com$/.test(page.host))) { blockedText = true; break; }
      if (bodies.length >= (rules.maxPagesPerTarget || 10)) break;
      if (bodies.length && !lastMore) break;
      const before = bodies.length;
      await evalInPage(tabId, SCROLL_ONE);
      const [a, b] = rules.scrollWaitMs || [2000, 5000];
      await sleep(rand(a, b));
      if (bodies.length === before) {
        // 스크롤로 다음 페이지가 안 오면(2026-10-25 헬리오시티 1페이지만 읽힘) 탭 안에서 페이지가 쓰던 같은 주소에 page만 바꿔 부른다.
        // 0단계: 페이지 인증 머리글을 붙이면 2페이지도 200(인수인계 §2-2 2순위). 응답은 위 onEvent가 똑같이 읽는다.
        if (lastMore && listUrl) {
          const next = new URL(listUrl);
          next.searchParams.set("page", String(bodies.length + 1));
          diag.push(`다음쪽 요청 page=${bodies.length + 1}${listAuth ? "(인증)" : "(인증없음)"}`);
          // 응답 본문을 그 자리에서 돌려받는다(2026-10-25 진단: 200인데 디버거 쪽에서 응답을 놓침)
          const res = await evalInPage(tabId, `fetch(${JSON.stringify(next.toString())}, { credentials: "include", headers: ${JSON.stringify(listAuth ? { authorization: listAuth } : {})} }).then(async (r) => ({ status: r.status, body: r.ok ? await r.json().catch(() => null) : null })).catch(() => ({ status: 0, body: null }))`);
          const status = res?.status ?? 0;
          diag.push(`응답코드 ${status}`);
          if (isBlockedStatus(status)) { blockedStatus = status; break; }
          if (status === 200 && res?.body && Array.isArray(res.body[listKey])) addBody(res.body, "(직접)");
          if (bodies.length > before) { stale = 0; await sleep(rand(a, b)); continue; }
        }
        stale += 1;
        diag.push(`스크롤 뒤 새 응답 없음(${stale})${listUrl ? "" : "·목록주소 못 잡음"}`);
        if (stale >= 2) break;
      } else stale = 0;
    }
  } catch (e) {
    error = String(e).slice(0, 160);
    if (/Another debugger|Cannot attach|not attached/i.test(error)) error = "다른 확장이 이 탭을 조작 중이라 디버거를 붙이지 못했어요.";
  } finally {
    chrome.debugger.onEvent.removeListener(onEvent);
    try { await chrome.debugger.detach({ tabId }); } catch {}
    try { await chrome.tabs.remove(tabId); } catch {}
  }

  if (blockedStatus || blockedText) {
    const why = blockedStatus ? `네이버가 ${blockedStatus} 응답(접근 제한)을 보냈어요.` : "네이버 확인 화면(보안 문자·로그인)이 나타났어요.";
    await log(`단지 ${complexNo}: 멈춤 — ${why}`);
    return { status: "blocked", bodies, complete: false, error: why };
  }
  if (!bodies.length) return { status: error ? "error" : "rule_mismatch", bodies, complete: false, error: error || "매물 목록 응답을 찾지 못했어요(네이버 화면이 바뀌었을 수 있어요)." };
  if (bodies.some((b) => isRuleMismatch(b, rules))) return { status: "rule_mismatch", bodies: [], complete: false, error: "매물 목록 모양이 수집 규칙과 달라요." };
  await log(`단지 ${complexNo}: 목록 ${bodies.length}페이지 · 매물 ${bodies.reduce((n, b) => n + (b[listKey]?.length || 0), 0)}건`);
  await log(`단지 ${complexNo} 진단: ${diag.join(" / ").slice(0, 400)}`);
  return { status: "ok", bodies, complete: !lastMore };
}
