// AIMaster 부동산 매물 알림 확장 v1.01 — 지금은 0단계 사전 검증 기능만 들어 있다(3단계에서 수집 엔진으로 교체).
// 매물 개인 정보(전화·주소·대표자)는 기록하지 않고, 매물 데이터는 우리 서버로 보내지 않는다.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.floor(Math.random() * (b - a));
const PERSONAL = /phone|tel|cellPhone|realtorAddress|representative|address|addr|email/i;
const MAX_ARTICLE_PAGES = 3;
let lastAuth = null; // 페이지가 보낸 authorization 머리글 — 메모리에만, 저장하지 않음

async function getReport() {
  const { report } = await chrome.storage.local.get("report");
  return report || { startedAt: new Date().toISOString(), capture: null, direct: null, alarm: null, telegram: null };
}
async function patch(key, value) {
  const r = await getReport();
  r[key] = value;
  await chrome.storage.local.set({ report: r });
  return r;
}

function shape(v, depth = 0) {
  if (v === null) return "null";
  if (Array.isArray(v)) return v.length ? [`len=${v.length}`, depth < 3 ? shape(v[0], depth + 1) : "…"] : ["len=0"];
  if (typeof v === "object") {
    if (depth >= 3) return "{…}";
    const o = {};
    for (const k of Object.keys(v)) o[k] = PERSONAL.test(k) ? "(개인정보 칸 — 값 생략)" : shape(v[k], depth + 1);
    return o;
  }
  return typeof v;
}
function scrub(obj) {
  const o = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (PERSONAL.test(k)) continue;
    o[k] = typeof v === "object" && v !== null ? "(객체)" : v;
  }
  return o;
}
function findArticleArray(body) {
  if (!body || typeof body !== "object") return null;
  if (Array.isArray(body.articleList)) return body.articleList;
  for (const v of Object.values(body)) {
    if (Array.isArray(v) && v[0] && typeof v[0] === "object" && "articleNo" in v[0]) return v;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = findArticleArray(v);
      if (inner) return inner;
    }
  }
  return null;
}
function summarizeArticles(body) {
  const list = findArticleArray(body) || [];
  const first = list[0] || {};
  const priceKeys = Object.keys(first).filter((k) => /prc|price|deal|rent|warrant/i.test(k));
  const tradeTypes = {};
  const estateTypes = {};
  for (const a of list) {
    if (a.tradeTypeCode || a.tradeTypeName) tradeTypes[a.tradeTypeCode ?? "?"] = a.tradeTypeName ?? "?";
    if (a.realEstateTypeCode || a.realEstateTypeName) estateTypes[a.realEstateTypeCode ?? "?"] = a.realEstateTypeName ?? "?";
  }
  return {
    count: list.length,
    isMoreData: body?.isMoreData,
    topKeys: Object.keys(body || {}),
    itemKeys: Object.keys(first),
    priceKeys,
    priceSamples: list.slice(0, 5).map((a) => Object.fromEntries(priceKeys.map((k) => [k, a[k]]))),
    tradeTypes,
    estateTypes,
    sample: list.slice(0, 2).map(scrub),
  };
}
function urlKey(u) {
  try {
    const x = new URL(u);
    const q = {};
    x.searchParams.forEach((v, k) => (q[k] = v));
    return { host: x.host, path: x.pathname, query: q };
  } catch { return { raw: String(u).slice(0, 200) }; }
}

async function evalInPage(tabId, expression) {
  const r = await chrome.debugger.sendCommand({ tabId }, "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  return r?.result?.value;
}
async function withDebugger(tabId, fn) {
  try { await chrome.debugger.attach({ tabId }, "1.3"); }
  catch {
    try { await chrome.debugger.detach({ tabId }); } catch {}
    await chrome.debugger.attach({ tabId }, "1.3");
  }
  try { return await fn(); }
  finally { try { await chrome.debugger.detach({ tabId }); } catch {} }
}

const BLOCK_CHECK = `(() => { const t = (document.body && document.body.innerText) || ""; return /보안문자|자동입력 방지|자동 입력 방지|captcha|비정상적인 접근|로그인이 필요/i.test(t); })()`;
const SCROLL_ONE = `(() => {
  let best = null, gap = 0;
  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    if (!/(auto|scroll)/.test(s.overflowY)) continue;
    const g = el.scrollHeight - el.clientHeight;
    if (g > gap && el.clientHeight > 150) { gap = g; best = el; }
  }
  const target = best || document.scrollingElement;
  target.scrollTop = target.scrollHeight;
  return { tag: target.tagName, id: target.id || "", cls: String(target.className || "").slice(0, 80), scrollHeight: target.scrollHeight };
})()`;

async function runCapture(tabId, tabUrl) {
  const t0 = Date.now();
  const out = { tabUrl: urlKey(tabUrl), requests: [], articlePages: [], otherJson: [], statusProblems: [], blocked: false, scrollTargets: [], authHeaderSeen: false };
  const pending = new Map();
  const onEvent = async (src, method, params) => {
    if (src.tabId !== tabId) return;
    if (method === "Network.requestWillBeSent") {
      const u = params.request.url;
      if (!/land\.naver\.com/.test(u)) return;
      const h = params.request.headers || {};
      const auth = h.authorization || h.Authorization;
      if (auth) { lastAuth = auth; out.authHeaderSeen = true; }
      pending.set(params.requestId, u);
      out.requests.push({ ...urlKey(u), method: params.request.method, hasAuth: !!auth, type: params.type });
    } else if (method === "Network.responseReceived") {
      const u = pending.get(params.requestId);
      if (u && params.response.status >= 400) out.statusProblems.push({ ...urlKey(u), status: params.response.status });
    } else if (method === "Network.loadingFinished") {
      const u = pending.get(params.requestId);
      if (!u || !/\/api\//.test(u)) return;
      try {
        const b = await chrome.debugger.sendCommand({ tabId }, "Network.getResponseBody", { requestId: params.requestId });
        const body = JSON.parse(b.base64Encoded ? new TextDecoder().decode(Uint8Array.from(atob(b.body), (c) => c.charCodeAt(0))) : b.body);
        if (findArticleArray(body)) out.articlePages.push({ ...urlKey(u), at: Date.now() - t0, ...summarizeArticles(body) });
        else if (out.otherJson.length < 25) out.otherJson.push({ ...urlKey(u), shape: shape(body) });
      } catch (e) { out.otherJson.push({ ...urlKey(u), error: String(e).slice(0, 120) }); }
    }
  };
  chrome.debugger.onEvent.addListener(onEvent);
  try {
    await withDebugger(tabId, async () => {
      await chrome.debugger.sendCommand({ tabId }, "Network.enable");
      await chrome.debugger.sendCommand({ tabId }, "Page.reload", {}); // 1페이지도 기록하려고 한 번 새로 고침
      await sleep(6000);
      for (let i = 0; i < 6 && out.articlePages.length < MAX_ARTICLE_PAGES; i++) {
        if (await evalInPage(tabId, BLOCK_CHECK)) { out.blocked = true; break; }
        out.scrollTargets.push(await evalInPage(tabId, SCROLL_ONE));
        await sleep(rand(2000, 5000));
      }
      // 남은 시간은 주인님이 지역(시·구·동) 선택을 눌러 보시는 동안 응답만 기록
      while (Date.now() - t0 < 60000) await sleep(1000);
      out.blocked = out.blocked || (await evalInPage(tabId, BLOCK_CHECK));
    });
  } finally {
    chrome.debugger.onEvent.removeListener(onEvent);
  }
  out.seconds = Math.round((Date.now() - t0) / 1000);
  await patch("capture", out);
  return { ok: true, articlePages: out.articlePages.length, otherJson: out.otherJson.length, blocked: out.blocked, statusProblems: out.statusProblems.length, authHeaderSeen: out.authHeaderSeen };
}

async function runDirect(tabId) {
  const r = await getReport();
  const tpl = r.capture?.articlePages?.[0];
  if (!tpl) return { ok: false, error: "먼저 ① 응답 읽기 시험을 해 주세요(주소 형식이 필요)." };
  const base = new URL(`https://${tpl.host}${tpl.path}`);
  for (const [k, v] of Object.entries(tpl.query)) base.searchParams.set(k, v);
  const results = [];
  await withDebugger(tabId, async () => {
    for (const withAuth of [false, true]) {
      for (const page of [1, 2]) {
        if (withAuth && !lastAuth) { results.push({ withAuth, page, skipped: "페이지 인증 머리글 없음(확장 재시작으로 지워졌을 수 있음)" }); continue; }
        base.searchParams.set("page", String(page));
        const expr = `(async () => { try {
          const res = await fetch(${JSON.stringify(base.toString())}, { credentials: "include", headers: ${withAuth ? JSON.stringify({ authorization: lastAuth }) : "{}"} });
          const txt = await res.text(); let j = null; try { j = JSON.parse(txt); } catch {}
          return { status: res.status, json: j, head: j ? null : txt.slice(0, 160) };
        } catch (e) { return { error: String(e) }; } })()`;
        const v = await evalInPage(tabId, expr);
        results.push({ withAuth, page, status: v?.status, error: v?.error, head: v?.head, ...(v?.json && findArticleArray(v.json) ? summarizeArticles(v.json) : { shape: v?.json ? shape(v.json) : null }) });
        await sleep(rand(3000, 5000));
      }
    }
  });
  const out = { url: urlKey(base.toString()), results };
  await patch("direct", out);
  return { ok: true, results: results.map((x) => ({ withAuth: x.withAuth, page: x.page, status: x.status, count: x.count, isMoreData: x.isMoreData, skipped: x.skipped, error: x.error })) };
}

async function startAlarm() {
  await chrome.alarms.clear("pv");
  await patch("alarm", { startedAt: new Date().toISOString(), fires: [] });
  chrome.alarms.create("pv", { delayInMinutes: 1, periodInMinutes: 1 });
  return { ok: true, note: "지금 크롬 창을 최소화해 두세요. 5분 뒤 결과 파일 저장을 눌러 주세요." };
}
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== "pv") return;
  const wins = await chrome.windows.getAll();
  const r = await getReport();
  const al = r.alarm || { fires: [] };
  al.fires.push({ at: new Date().toISOString(), windowStates: wins.map((w) => w.state) });
  if (al.fires.length >= 5) chrome.alarms.clear("pv");
  await patch("alarm", al);
});

async function sendTelegram(token, chat) {
  if (!token || !chat) return { ok: false, error: "봇 토큰과 chat id를 넣어 주세요." };
  const fd = new FormData();
  fd.append("chat_id", chat);
  fd.append("caption", "부동산 매물 알림 사전 검증 — 파일 보내기 시험");
  fd.append("document", new Blob(["﻿단지,거래,가격\n시험 단지,매매,0\n"], { type: "text/csv" }), "realty-test.csv");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body: fd });
  const j = await res.json().catch(() => ({}));
  const out = { status: res.status, ok: j.ok, description: j.description || null, at: new Date().toISOString() };
  await patch("telegram", out); // 토큰·chat id는 저장하지 않음
  return out;
}

async function saveReport() {
  // 결과 화면(확장 안 HTML)을 새 탭으로 연다 — 거기서 파일로 받기·복사(서비스 워커의 data: 다운로드는 조용히 실패할 수 있었다).
  await chrome.tabs.create({ url: chrome.runtime.getURL("result.html") });
  return { ok: true, note: "결과 화면을 열었습니다." };
}

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  (async () => {
    try {
      if (msg.type === "connect") {
        // 웹 「바로 연결」: 연결 코드를 이 기기(chrome.storage.local)에만 저장한다.
        if (!/^pat_[0-9a-f]{64}$/.test(msg.token || "")) return reply({ ok: false, error: "연결 코드 형식이 올바르지 않습니다." });
        await chrome.storage.local.set({ extToken: msg.token, connectedAt: new Date().toISOString() });
        if (msg.closeTab && _s?.tab?.id) chrome.tabs.remove(_s.tab.id).catch(() => {});
        return reply({ ok: true });
      }
      if (msg.type === "capture") return reply(await runCapture(msg.tabId, msg.tabUrl));
      if (msg.type === "direct") return reply(await runDirect(msg.tabId));
      if (msg.type === "alarm") return reply(await startAlarm());
      if (msg.type === "telegram") return reply(await sendTelegram(msg.token, msg.chat));
      if (msg.type === "save") return reply(await saveReport());
      if (msg.type === "summary") {
        const r = await getReport();
        return reply({ capture: r.capture ? { articlePages: r.capture.articlePages.length, blocked: r.capture.blocked } : null, direct: !!r.direct, alarmFires: r.alarm?.fires?.length ?? 0, telegram: r.telegram });
      }
    } catch (e) { reply({ ok: false, error: String(e) }); }
  })();
  return true;
});
