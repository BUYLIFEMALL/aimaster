// 추가 요청 없이 페이지가 받은 응답만 읽는다. 개인 정보 칸은 값을 저장하지 않는다.
const SENSITIVE = /realtor|phone|tel|mobile|cpName|cpPc|cpMobile|contact|detailAddr|exposureAddress|articleRealtor|Name$/i;
const KEEP_NAMES = /^(realEstateTypeName|tradeTypeName|areaName)$/;
const WANT = /land\.naver\.com\/(api|front-api)\//;
const requests = new Map();
let attached = null;

const load = async () => (await chrome.storage.local.get("log")).log ?? { pages: [], responses: [], errors: [] };
const save = (log) => chrome.storage.local.set({ log });

const mask = (k, v) => {
  if (v === null || typeof v === "object") return Array.isArray(v) ? `[배열 ${v.length}]` : v === null ? null : "{객체}";
  if (SENSITIVE.test(k) && !KEEP_NAMES.test(k)) return "(가림)";
  return typeof v === "string" ? v.slice(0, 40) : v;
};
const summarize = (body) => {
  const top = Object.keys(body ?? {});
  const listKey = top.find((k) => Array.isArray(body[k]));
  const list = listKey ? body[listKey] : Array.isArray(body) ? body : null;
  const out = { top, listKey: listKey ?? null, count: list?.length ?? null, isMoreData: body?.isMoreData ?? null };
  for (const k of top) if (!Array.isArray(body[k])) out[`top_${k}`] = mask(k, body[k]);
  if (list?.[0] && typeof list[0] === "object") {
    const fields = {};
    for (const row of list) for (const [k, v] of Object.entries(row)) {
      const f = (fields[k] ??= { filled: 0, samples: [] });
      if (v !== null && v !== "" ) f.filled++;
      const m = mask(k, v);
      if (f.samples.length < 3 && m !== null && m !== "" && !f.samples.includes(m)) f.samples.push(m);
    }
    out.fields = fields;
  }
  return out;
};

chrome.debugger.onEvent.addListener(async (src, method, p) => {
  if (method === "Network.responseReceived" && WANT.test(p.response.url)) {
    requests.set(p.requestId, { url: p.response.url, status: p.response.status });
  }
  if (method === "Network.loadingFinished" && requests.has(p.requestId)) {
    const r = requests.get(p.requestId);
    requests.delete(p.requestId);
    const log = await load();
    const u = new URL(r.url);
    const entry = { at: new Date().toISOString(), path: u.pathname, query: Object.fromEntries(u.searchParams), status: r.status };
    try {
      const { body } = await chrome.debugger.sendCommand(src, "Network.getResponseBody", { requestId: p.requestId });
      entry.summary = summarize(JSON.parse(body));
    } catch (e) {
      entry.note = "본문 읽기 실패";
    }
    log.responses.push(entry);
    if (log.responses.length > 200) log.responses.shift();
    await save(log);
  }
});
chrome.debugger.onDetach.addListener(() => { attached = null; });

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  (async () => {
    if (msg.type === "start") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!/land\.naver\.com/.test(tab?.url ?? "")) return reply({ error: "네이버 부동산 탭에서 눌러 주세요." });
      if (attached !== tab.id) {
        await chrome.debugger.attach({ tabId: tab.id }, "1.3");
        await chrome.debugger.sendCommand({ tabId: tab.id }, "Network.enable");
        attached = tab.id;
      }
      const log = await load();
      log.pages.push({ at: new Date().toISOString(), url: tab.url, label: msg.label });
      await save(log);
      return reply({ ok: true });
    }
    if (msg.type === "stop") {
      if (attached) await chrome.debugger.detach({ tabId: attached }).catch(() => {});
      attached = null;
      return reply({ ok: true });
    }
    if (msg.type === "log") return reply({ log: await load(), attached });
    if (msg.type === "clear") { await chrome.storage.local.remove("log"); return reply({ ok: true }); }
  })();
  return true;
});
