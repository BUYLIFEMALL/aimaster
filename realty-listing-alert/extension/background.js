// AIMaster 부동산 매물 알림 확장 — 수집 엔진(3단계, v1.03).
// 원칙(인수인계 §0): 네이버는 회원 PC·회원 본인 로그인으로만 읽고, 매물은 우리 서버로 보내지 않는다(확장 안에만 저장).
// 텔레그램은 회원 본인 봇으로 이 PC에서 바로 보낸다. 서버에는 숫자 상태만 보고한다. 차단·확인 화면이면 그날 멈춘다.
import { collectComplex, rand, sleep } from "./lib/collector.js";
import { complexNoFromUrl, isGenericName, matchesTarget, normalizeArticle } from "./lib/listing.js";
import { compareComplex, filterEvents } from "./lib/compare.js";
import { kstDate, shouldRunScheduled } from "./lib/guard.js";
import { toCsv, toTable, toXlsx } from "./lib/sheet.js";
import { buildSummary, sendDocument, sendMessage } from "./lib/telegram.js";

const WEB = "https://realty-listing-alert.buylife.xyz";
const DEFAULT_RULES = {
  version: "builtin",
  complexUrl: "https://new.land.naver.com/complexes/{complexNo}",
  listPathIncludes: "/api/articles/complex/",
  fields: { list: "articleList", more: "isMoreData", price: "dealOrWarrantPrc", rent: "rentPrc" },
  maxPagesPerTarget: 10,
  scrollWaitMs: [2000, 5000],
  betweenTargetsMs: [10000, 30000],
  firstLoadWaitMs: 8000,
};
const version = () => chrome.runtime.getManifest().version_name || "";
const get = (keys) => chrome.storage.local.get(keys);
const set = (obj) => chrome.storage.local.set(obj);

async function addLog(text) {
  const { log = [] } = await get("log");
  await set({ log: [...log, `${new Date().toISOString()} ${text}`].slice(-100) });
}

async function deviceId() {
  const { deviceId: id } = await get("deviceId");
  if (id) return id;
  const fresh = crypto.randomUUID().replace(/-/g, "");
  await set({ deviceId: fresh });
  return fresh;
}

async function api(path, init = {}) {
  const { extToken } = await get("extToken");
  if (!extToken) throw new Error("웹과 연결되지 않았어요. 웹 대시보드에서 「바로 연결」을 눌러 주세요.");
  const res = await fetch(WEB + path, { ...init, headers: { ...(init.headers || {}), authorization: `Bearer ${extToken}`, "content-type": "application/json" } });
  const j = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("웹 연결이 끊겼거나 이용 권한이 없어요. 웹 대시보드에서 다시 연결해 주세요.");
  if (!res.ok) throw new Error(j.error || `웹 응답 오류(${res.status})`);
  return j;
}

/** 회원 설정(웹) — 실패하면 마지막으로 받은 값으로. */
async function loadSettings() {
  try {
    const s = await api("/api/extension/settings");
    await set({ settingsCache: s, settingsAt: new Date().toISOString() });
    return s;
  } catch (e) {
    const { settingsCache } = await get("settingsCache");
    if (settingsCache) return settingsCache;
    throw e;
  }
}
async function loadRules() {
  try {
    const r = await api("/api/extension/collect-rules");
    await set({ rulesCache: r });
    return r;
  } catch {
    const { rulesCache } = await get("rulesCache");
    return rulesCache || DEFAULT_RULES;
  }
}

async function reportStatus(result, count, error) {
  try {
    await api("/api/extension/status", {
      method: "POST",
      body: JSON.stringify({ deviceId: await deviceId(), extVersion: version(), result, count, error: error || undefined, ranAt: new Date().toISOString() }),
    });
  } catch (e) {
    await addLog(`상태 보고 실패: ${e.message}`);
  }
}

let busy = false;

/** 수집 1회: 감시 대상 → 수집 → 거르기 → 비교 → 파일 → 텔레그램 → 상태 보고. trigger: "schedule" | "manual" */
async function runCollection(trigger) {
  if (busy) return { ok: false, error: "이미 수집 중이에요. 끝날 때까지 기다려 주세요." };
  busy = true;
  const startedAt = new Date().toISOString();
  await set({ running: { startedAt, trigger, done: 0, total: 0 } });
  try {
    const settings = await loadSettings();
    const rules = await loadRules();
    const targets = settings.targets || [];
    await addLog(`${trigger === "manual" ? "지금 수집" : "예약 수집"} 시작 · 감시 대상 ${targets.length}곳`);
    if (!targets.length) {
      await set({ lastRunAt: startedAt });
      return { ok: false, error: "켜진 감시 대상이 없어요. 웹 🎯 감시 대상에서 단지를 추가해 주세요." };
    }
    await set({ running: { startedAt, trigger, done: 0, total: targets.length } });

    const listKey = rules.fields?.list || "articleList";
    const { states = {} } = await get("states");
    const perTarget = [];
    const fileRows = [];
    let total = 0;
    let result = "ok";
    let errMsg = null;

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (i > 0) {
        const [a, b] = rules.betweenTargetsMs || [10000, 30000];
        await sleep(rand(a, b));
      }
      const r = await collectComplex(t.complex_no, rules, addLog);
      await set({ running: { startedAt, trigger, done: i + 1, total: targets.length } });
      if (r.status === "blocked") {
        result = "blocked";
        errMsg = r.error;
        await set({ stoppedDate: kstDate() });
        break; // 그날 자동 수집 중지, 남은 대상도 읽지 않음
      }
      if (r.status !== "ok") {
        if (result === "ok") { result = r.status; errMsg = r.error; }
        await addLog(`단지 ${t.complex_no}: ${r.error}`);
        continue;
      }
      const seen = new Set();
      const items = r.bodies
        .flatMap((b) => b[listKey] || [])
        .map((a) => normalizeArticle(a, t.complex_no, isGenericName(t.complex_name) ? "" : t.complex_name, rules.fields))
        .filter((it) => it.no && !seen.has(it.no) && seen.add(it.no))
        .filter((it) => matchesTarget(it, t));
      const realName = r.bodies.flatMap((b) => b[listKey] || []).find((a) => a.articleName)?.articleName || "";
      const name = (!isGenericName(t.complex_name) && t.complex_name) || realName || `단지 ${t.complex_no}`;
      // 이름이 비었거나 탭 제목 같은 일반 이름이면 웹 감시 대상 이름을 실제 단지명으로 고친다(단지 번호·이름만 보냄)
      if (isGenericName(t.complex_name) && realName) {
        api("/api/extension/targets", { method: "POST", body: JSON.stringify({ complexNo: t.complex_no, complexName: realName, rename: true }) }).catch(() => {});
      }
      const cmp = compareComplex(states[t.complex_no], items, { complete: r.complete });
      states[t.complex_no] = cmp.state;
      const statusOf = new Map(cmp.events.map((e) => [e.item.no, e]));
      for (const it of items) {
        const e = statusOf.get(it.no);
        fileRows.push({ item: { ...it, complexName: name }, status: e ? e.type : "same", prevPriceText: e?.prevPriceText, firstSeen: cmp.state.items[it.no]?.firstSeen });
      }
      for (const e of cmp.events.filter((x) => x.type === "gone")) fileRows.push({ item: { ...e.item, complexName: name }, status: "gone", prevPriceText: e.prevPriceText, firstSeen: e.firstSeen });
      perTarget.push({ name, total: items.length, events: filterEvents(cmp.events, settings.delivery), firstRun: cmp.firstRun, complete: r.complete });
      total += items.length;
    }

    const table = toTable(fileRows);
    await set({ states, lastRunAt: startedAt, lastResult: { at: startedAt, trigger, result, error: errMsg, table, perTarget: perTarget.map((p) => ({ name: p.name, total: p.total, events: p.events.length, firstRun: p.firstRun })) } });

    await deliver({ settings, perTarget, table, result, errMsg, trigger });
    await reportStatus(result, total, errMsg);
    await addLog(`수집 끝 · ${result === "ok" ? "정상" : result} · 매물 ${total}건 · 알림 ${perTarget.reduce((n, p) => n + p.events.length, 0)}건`);
    return { ok: result === "ok", result, total, error: errMsg };
  } catch (e) {
    await addLog(`수집 오류: ${e.message || e}`);
    await reportStatus("error", 0, String(e.message || e)).catch(() => {});
    return { ok: false, error: String(e.message || e) };
  } finally {
    busy = false;
    await set({ running: null });
  }
}

/** 텔레그램 보내기 — 변동이 있거나, 첫 수집이거나, 「지금 수집」이면 보낸다. 실패하면 다음 회차에 알리고 같은 알림을 반복해 보내지 않는다. */
async function deliver({ settings, perTarget, table, result, errMsg, trigger }) {
  const tg = settings.telegram;
  if (!tg) { await addLog("텔레그램 봇이 연결되지 않아 보내지 않았어요(웹 📨 받는 방법)."); return; }
  const d = settings.delivery || {};
  const { telegramFailed = false } = await get("telegramFailed");
  try {
    if (result === "blocked") {
      await sendMessage(tg.botToken, tg.chatId, `🏠 [매물 알림] ⛔ 네이버 확인 화면 때문에 수집을 멈췄어요.\n${errMsg || ""}\n네이버 부동산을 직접 한 번 열어 확인해 주세요. 오늘 예약 수집은 쉬고 내일 다시 시작해요.`);
      await set({ telegramFailed: false });
      return;
    }
    const changed = perTarget.some((t) => t.events.length || t.firstRun);
    if (!changed && trigger !== "manual") return;
    if (d.deliverTelegram !== false) await sendMessage(tg.botToken, tg.chatId, buildSummary(perTarget, { failedBefore: telegramFailed }));
    if (d.deliverFile !== false && table.length) {
      const stamp = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})(\d{4})$/, "$1_$2");
      if (d.fileFormat === "csv") await sendDocument(tg.botToken, tg.chatId, new TextEncoder().encode(toCsv(table)), `매물알림_${stamp}.csv`, "text/csv", "🏠 [매물 알림] 정리 파일");
      else await sendDocument(tg.botToken, tg.chatId, toXlsx(table), `매물알림_${stamp}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "🏠 [매물 알림] 정리 파일");
    }
    await set({ telegramFailed: false });
  } catch (e) {
    await set({ telegramFailed: true });
    await addLog(`텔레그램 보내기 실패: ${e.message}`);
  }
}

// ── 예약: 1분마다 깨어나 차례인지 본다(밀린 회차는 몰아서 하지 않고 1번만) ──
function ensureAlarm() {
  chrome.alarms.get("tick", (a) => { if (!a) chrome.alarms.create("tick", { periodInMinutes: 1 }); });
}
chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== "tick" || busy) return;
  const { extToken, consentAt, lastRunAt, stoppedDate } = await get(["extToken", "consentAt", "lastRunAt", "stoppedDate"]);
  if (!extToken || !consentAt) return;
  let settings;
  try { settings = await loadSettings(); } catch { return; }
  if (!shouldRunScheduled({ schedule: settings.schedule, lastRunAt, stoppedDate }).run) return;
  await runCollection("schedule");
});
ensureAlarm();

// ── 팝업·웹 다리 메시지 ──
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    try {
      if (msg.type === "connect") {
        // 웹 「바로 연결」: 연결 코드를 이 기기(chrome.storage.local)에만 저장한다.
        if (!/^pat_[0-9a-f]{64}$/.test(msg.token || "")) return reply({ ok: false, error: "연결 코드 형식이 올바르지 않습니다." });
        await set({ extToken: msg.token, connectedAt: new Date().toISOString() });
        if (msg.closeTab && sender?.tab?.id) chrome.tabs.remove(sender.tab.id).catch(() => {});
        return reply({ ok: true });
      }
      if (msg.type === "consent") {
        await set({ consentAt: new Date().toISOString() });
        return reply({ ok: true });
      }
      if (msg.type === "collectNow") {
        const { consentAt } = await get("consentAt");
        if (!consentAt) return reply({ ok: false, error: "먼저 안내에 동의해 주세요." });
        runCollection("manual"); // 팝업을 닫아도 계속된다
        return reply({ ok: true });
      }
      if (msg.type === "addComplex") {
        const no = complexNoFromUrl(msg.tabUrl);
        if (!no) return reply({ ok: false, error: "네이버 부동산 단지 화면에서 눌러 주세요." });
        const r = await api("/api/extension/targets", { method: "POST", body: JSON.stringify({ complexNo: no, complexName: msg.name || "" }) });
        await addLog(`감시 대상 추가: 단지 ${no} (${r.count}/10)`);
        return reply({ ok: true, count: r.count, complexNo: no });
      }
      if (msg.type === "openResults") {
        await chrome.tabs.create({ url: chrome.runtime.getURL("result.html") });
        return reply({ ok: true });
      }
      if (msg.type === "state") {
        const s = await get(["extToken", "connectedAt", "consentAt", "lastRunAt", "stoppedDate", "running", "lastResult", "settingsCache", "log", "telegramFailed"]);
        return reply({
          connected: !!s.extToken,
          connectedAt: s.connectedAt || null,
          consent: !!s.consentAt,
          lastRunAt: s.lastRunAt || null,
          stoppedToday: s.stoppedDate === kstDate(),
          running: s.running || null,
          lastResult: s.lastResult ? { at: s.lastResult.at, result: s.lastResult.result, error: s.lastResult.error, perTarget: s.lastResult.perTarget } : null,
          schedule: s.settingsCache?.schedule || null,
          targetCount: s.settingsCache?.targets?.length ?? null,
          telegramLinked: s.settingsCache ? !!s.settingsCache.telegram : null,
          latestVersion: s.settingsCache?.latestVersion || null,
          telegramFailed: !!s.telegramFailed,
          recent: (s.log || []).slice(-6),
        });
      }
      if (msg.type === "refreshSettings") {
        const s = await loadSettings();
        return reply({ ok: true, targets: s.targets.length });
      }
      reply({ ok: false, error: "알 수 없는 요청" });
    } catch (e) {
      await addLog(`오류(${msg.type}): ${e.message || e}`);
      reply({ ok: false, error: String(e.message || e) });
    }
  })();
  return true;
});
