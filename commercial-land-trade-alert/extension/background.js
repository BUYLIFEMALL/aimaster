// 상가·건물·토지 매물 알림 확장 — 수집 엔진. 기준: realty-listing-alert/extension/background.js
// 네이버는 회원 PC·회원 본인 로그인으로만 읽고, 매물은 우리 서버로 보내지 않는다. 서버에는 숫자 상태만 보고한다. 차단·확인 화면이면 그날 멈춘다.
import { collectView, rand, RULES, sleep } from "./lib/collector.js";
import { isWatchableUrl, matchesTarget, normalizeArticle } from "./lib/listing.js";
import { compareTarget, filterEvents } from "./lib/compare.js";
import { computeNextDue, kstDate, shouldRunScheduled } from "./lib/guard.js";
import { toCsv, toTable, toXlsx } from "./lib/sheet.js";
import { ALERT_PREFIX, buildKakaoText, buildMailHtml, buildMailSubject, buildSummary, kakaoLinkFor, sendDocument, sendKakaoMemo, sendMessage, sendResendMail } from "./lib/notify.js";

const WEB = "https://commercial-land-trade-alert.buylife.xyz";
const version = () => chrome.runtime.getManifest().version_name || "";
const get = (keys) => chrome.storage.local.get(keys);
const set = (obj) => chrome.storage.local.set(obj);

async function addLog(text) {
  const { log = [] } = await get("log");
  await set({ log: [...log, `${new Date().toISOString()} ${text}`].slice(-100) });
}

async function api(path, init = {}) {
  const { extToken } = await get("extToken");
  if (!extToken) throw new Error("웹과 연결되지 않았어요. 웹 「API키등록·플랫폼연동」에서 「바로 연결」을 눌러 주세요.");
  const res = await fetch(WEB + path, { ...init, headers: { ...(init.headers || {}), authorization: `Bearer ${extToken}`, "content-type": "application/json" } });
  const j = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("웹 연결이 끊겼거나 이용 권한이 없어요. 웹에서 다시 연결해 주세요.");
  if (!res.ok) throw new Error(j.error || `웹 응답 오류(${res.status})`);
  return j;
}

async function loadSettings() {
  try {
    const s = await api("/api/extension/settings");
    await set({ settingsCache: s });
    return s;
  } catch (e) {
    const { settingsCache } = await get("settingsCache");
    if (settingsCache) return settingsCache;
    throw e;
  }
}

async function reportStatus(result, count, error) {
  try {
    await api("/api/extension/status", { method: "POST", body: JSON.stringify({ extVersion: version(), result, count, error: error || undefined, ranAt: new Date().toISOString() }) });
  } catch (e) {
    await addLog(`상태 보고 실패: ${e.message}`);
  }
}

async function pagesToday() {
  const { pagesDay } = await get("pagesDay");
  return pagesDay?.date === kstDate() ? pagesDay.count : 0;
}
async function addPages(n) {
  await set({ pagesDay: { date: kstDate(), count: (await pagesToday()) + n } });
}

let busy = false;

async function runCollection(trigger) {
  if (busy) return { ok: false, error: "이미 수집 중이에요." };
  busy = true;
  const startedAt = new Date().toISOString();
  await set({ running: { startedAt, trigger, done: 0, total: 0 } });
  try {
    const settings = await loadSettings();
    const targets = settings.targets || [];
    await addLog(`${trigger === "manual" ? "지금 수집" : "예약 수집"} 시작 · 감시 화면 ${targets.length}곳`);
    if (!targets.length) {
      await set({ lastRunAt: startedAt });
      return { ok: false, error: "켜진 감시 화면이 없어요. 네이버 부동산에서 「이 화면 감시」를 눌러 주세요." };
    }
    const { states = {} } = await get("states");
    const perTarget = [];
    const fileRows = [];
    let total = 0;
    let result = "ok";
    let errMsg = null;
    let limitHit = false;

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      await set({ running: { startedAt, trigger, done: i, total: targets.length } });
      if (i > 0) await sleep(rand(...RULES.betweenTargetsMs));
      if ((await pagesToday()) >= RULES.maxPagesPerDay) {
        limitHit = true;
        await addLog(`오늘 수집 한도(${RULES.maxPagesPerDay}페이지)에 닿아 나머지는 쉬어요`);
        break;
      }
      const r = await collectView(t.url, addLog);
      await addPages(Math.max(1, r.bodies?.length || 0));
      if (r.status === "blocked") {
        result = "blocked";
        errMsg = r.error;
        await set({ stoppedDate: kstDate() });
        break;
      }
      if (r.status !== "ok") {
        if (result === "ok") { result = r.status; errMsg = r.error; }
        await addLog(`${t.name}: ${r.error}`);
        continue;
      }
      const seen = new Set();
      const items = r.bodies
        .flatMap((b) => b.articleList || [])
        .map((a) => normalizeArticle(a, t.id, t.url))
        .filter((it) => it.no && !seen.has(it.no) && seen.add(it.no))
        .filter((it) => matchesTarget(it, t));
      const cmp = compareTarget(states[t.id], items, { complete: r.complete });
      states[t.id] = cmp.state;
      const statusOf = new Map(cmp.events.map((e) => [e.item.no, e]));
      for (const it of items) {
        const e = statusOf.get(it.no);
        fileRows.push({ item: { ...it, targetName: t.name }, status: e ? e.type : "same", prevPriceText: e?.prevPriceText, firstSeen: cmp.state.items[it.no]?.firstSeen });
      }
      for (const e of cmp.events.filter((x) => x.type === "gone")) fileRows.push({ item: { ...e.item, targetName: t.name }, status: "gone", prevPriceText: e.prevPriceText, firstSeen: e.firstSeen });
      perTarget.push({ name: t.name, total: items.length, events: filterEvents(cmp.events, settings.delivery), firstRun: cmp.firstRun, complete: r.complete, pagesRead: r.pagesRead });
      total += items.length;
      await addLog(`${t.name}: ${r.pagesRead}페이지 · 조건 맞는 매물 ${items.length}건${r.complete ? "" : " · 범위가 넓어 앞부분만 읽음"}`);
    }

    if (limitHit) await set({ limitDate: kstDate() });
    const table = toTable(fileRows);
    const iv = settings.schedule?.intervalMinutes || 360;
    await set({
      states,
      lastRunAt: startedAt,
      nextDueAt: computeNextDue(new Date(startedAt).getTime(), iv, RULES.scheduleJitter),
      lastResult: { at: startedAt, trigger, result, error: errMsg, perTarget: perTarget.map((p) => ({ name: p.name, total: p.total, events: p.events.length, firstRun: p.firstRun, complete: p.complete })) },
    });
    await deliver({ settings, perTarget, table, result, errMsg, trigger, limitHit });
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

// 채널마다 따로 보낸다. 한 채널이 실패해도 다른 채널은 보낸다. 순서: 텔레그램 → 이메일 → 카카오톡
async function deliver({ settings, perTarget, table, result, errMsg, trigger, limitHit }) {
  const tg = settings.telegram;
  const email = settings.email?.apiKey ? settings.email : null;
  const kakao = settings.kakao?.accessToken ? settings.kakao : null;
  if (settings.email?.error) await addLog(`이메일 받기: ${settings.email.error}`);
  if (settings.kakao?.error) await addLog(`카톡 받기: ${settings.kakao.error}`);
  if (!tg && !email && !kakao) { await addLog("받는 곳이 연결되지 않아 보내지 않았어요(웹 「API키등록·플랫폼연동」)."); return; }

  async function notice(text) {
    if (tg) await sendMessage(tg.botToken, tg.chatId, text).catch((e) => addLog(`텔레그램 실패: ${e.message}`));
    if (email) await sendResendMail(email.apiKey, { to: email.to, subject: `${ALERT_PREFIX} 안내`, text }).catch((e) => addLog(`이메일 실패: ${e.message}`));
    if (kakao) await sendKakaoMemo(kakao.accessToken, text.slice(0, 200)).catch((e) => addLog(`카톡 실패: ${e.message}`));
  }
  if (result === "blocked") {
    await notice(`${ALERT_PREFIX} ⛔ 네이버가 잠시 이용을 제한해 수집을 멈췄어요.\n${errMsg || ""}\n네이버 부동산을 직접 열어 확인 화면을 풀어 주세요. 오늘 예약은 쉬고 내일 다시 시작해요. 자주 걸리면 예약 간격을 길게, 감시 화면을 줄여 주세요.`);
    return;
  }
  if (limitHit) {
    const { limitNoticeDate } = await get("limitNoticeDate");
    if (limitNoticeDate !== kstDate()) {
      await notice(`${ALERT_PREFIX} ⏸ 오늘 수집 한도(${RULES.maxPagesPerDay}페이지)에 닿아 쉬어요. 내일 다시 시작해요.`);
      await set({ limitNoticeDate: kstDate() });
    }
  }
  const changed = perTarget.some((t) => t.events.length || t.firstRun);
  if (!changed && trigger !== "manual") return;

  const { telegramFailed = false } = await get("telegramFailed");
  const summary = buildSummary(perTarget, { failedBefore: telegramFailed });
  let file = null;
  if (settings.delivery?.deliverFile !== false && table.length) {
    const stamp = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})(\d{4})$/, "$1_$2");
    file = { bytes: toXlsx(table), filename: `매물알림_${stamp}.xlsx`, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  }
  if (tg) {
    try {
      await sendMessage(tg.botToken, tg.chatId, summary);
      if (file) await sendDocument(tg.botToken, tg.chatId, file.bytes, file.filename, file.mime, `${ALERT_PREFIX} 정리 파일`);
      await set({ telegramFailed: false });
    } catch (e) {
      await set({ telegramFailed: true });
      await addLog(`텔레그램 실패: ${e.message}`);
    }
  }
  if (email) await sendResendMail(email.apiKey, { to: email.to, subject: buildMailSubject(perTarget), text: summary, html: buildMailHtml(perTarget), file }).catch((e) => addLog(`이메일 실패: ${e.message}`));
  if (kakao) await sendKakaoMemo(kakao.accessToken, buildKakaoText(perTarget), kakaoLinkFor(perTarget)).catch((e) => addLog(`카톡 실패: ${e.message}`));
}

// 예약: 1분마다 깨어나 차례인지 본다(밀린 회차는 1번만)
function ensureAlarm() {
  chrome.alarms.get("tick", (a) => { if (!a) chrome.alarms.create("tick", { periodInMinutes: 1 }); });
}
chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== "tick" || busy) return;
  const { extToken, consentAt, lastRunAt, stoppedDate, limitDate, nextDueAt } = await get(["extToken", "consentAt", "lastRunAt", "stoppedDate", "limitDate", "nextDueAt"]);
  if (!extToken || !consentAt) return;
  let settings;
  try { settings = await loadSettings(); } catch { return; }
  if (shouldRunScheduled({ schedule: settings.schedule, lastRunAt, stoppedDate, limitDate, nextDueAt }).run) await runCollection("schedule");
});
ensureAlarm();

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    try {
      if (msg.type === "connect") {
        if (!/^pat_[0-9a-f]{64}$/.test(msg.token || "")) return reply({ ok: false, error: "연결 코드 형식이 올바르지 않습니다." });
        await set({ extToken: msg.token, connectedEmail: null });
        const w = await api("/api/extension/whoami").catch(() => null);
        if (w?.email) await set({ connectedEmail: w.email });
        return reply({ ok: true, email: w?.email });
      }
      if (msg.type === "consent") { await set({ consentAt: new Date().toISOString() }); return reply({ ok: true }); }
      if (msg.type === "collectNow") {
        const { consentAt } = await get("consentAt");
        if (!consentAt) return reply({ ok: false, error: "먼저 안내에 동의해 주세요." });
        runCollection("manual"); // 팝업을 닫아도 계속된다
        return reply({ ok: true });
      }
      if (msg.type === "addView") {
        if (!isWatchableUrl(msg.url)) return reply({ ok: false, error: "네이버 부동산의 상가·건물·토지 지도 화면에서 눌러 주세요." });
        const r = await api("/api/extension/targets", { method: "POST", body: JSON.stringify({ url: msg.url, name: msg.name || "" }) });
        await addLog(`감시 화면 추가: ${r.name} (${r.count}/10)`);
        loadSettings().catch(() => {});
        return reply({ ok: true, count: r.count, name: r.name });
      }
      if (msg.type === "state") {
        const s = await get(["extToken", "connectedEmail", "consentAt", "stoppedDate", "limitDate", "nextDueAt", "pagesDay", "running", "lastResult", "settingsCache", "log"]);
        if (s.running && !busy) { s.running = null; await set({ running: null }); } // 끊긴 수집 정리
        return reply({
          connected: !!s.extToken,
          email: s.connectedEmail || null,
          consent: !!s.consentAt,
          stoppedToday: s.stoppedDate === kstDate(),
          limitToday: s.limitDate === kstDate(),
          pagesToday: s.pagesDay?.date === kstDate() ? s.pagesDay.count : 0,
          maxPages: RULES.maxPagesPerDay,
          nextDueAt: s.nextDueAt || null,
          running: s.running || null,
          lastResult: s.lastResult || null,
          schedule: s.settingsCache?.schedule || null,
          targetCount: s.settingsCache?.targets?.length ?? null,
          latestVersion: s.settingsCache?.latestVersion || null,
          recent: (s.log || []).slice(-6),
        });
      }
      if (msg.type === "refreshSettings") { await loadSettings(); return reply({ ok: true }); }
      reply({ ok: false, error: "알 수 없는 요청" });
    } catch (e) {
      await addLog(`오류(${msg.type}): ${e.message || e}`);
      reply({ ok: false, error: String(e.message || e) });
    }
  })();
  return true;
});
