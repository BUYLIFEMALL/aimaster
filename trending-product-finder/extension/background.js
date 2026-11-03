// 키워드 자동 검색. 회원이 팝업에서 「시작」을 누르거나, 회원이 켠 「매일 예약」 시각에만 돈다(PC·크롬이 켜져 있을 때).
// 마켓(쿠팡·네이버 쇼핑) 탭 하나만 쓰고, 키워드마다 1페이지만 열어 읽는다. 차단 우회는 하지 않는다.
// 하루 상한과 거부 징후 일시정지는 두 마켓이 함께 쓴다(한쪽에서 징후가 보이면 둘 다 쉰다).
import { MARKETS, SCHEDULE_ALARM_PREFIX, SCHEDULE_RETRY_MINUTES, isSearchUrl, marketOf, migrateSchedules, kstDay, nextGapMinutes, nextScheduleAt, safetyMessage, searchUrl, startProblem, todayRecord, validTime } from "./lib/auto.js";
import { addToLocalList, readTab, saveToAccount } from "./lib/page.js";

const ALARM = "auto-next";
const LEGACY_SCHEDULE_ALARM = "auto-schedule"; // v1.34까지 하나짜리 예약
const LOAD_TIMEOUT_MS = 30_000;
const SETTLE_MS = 2_500;
const READ_TRIES = 8; // 최대 약 20초

async function getJob() {
  return (await chrome.storage.local.get("autoJob")).autoJob ?? null;
}

async function setJob(patch) {
  const job = { ...(await getJob()), ...patch };
  await chrome.storage.local.set({ autoJob: job });
  return job;
}

async function stopJob(message) {
  await chrome.alarms.clear(ALARM);
  await setJob({ running: false, nextAt: null, message });
}

/** 지난번 그 마켓 탭이 있으면 그 탭을, 없으면 지금 창의 그 마켓 탭을, 그것도 없으면 지금 창에 새 탭을 쓴다. */
async function marketTab(job, url) {
  const pattern = MARKETS[job.market].tabPattern;
  const prefix = pattern.slice(0, -1);
  if (job.tabId != null) {
    const tab = await chrome.tabs.get(job.tabId).catch(() => null);
    if (tab && String(tab.url ?? "").startsWith(prefix)) return chrome.tabs.update(tab.id, { url });
  }
  const win = await chrome.windows.getLastFocused().catch(() => null);
  const [existing] = await chrome.tabs.query({ url: pattern, ...(win ? { windowId: win.id } : {}) });
  if (existing) return chrome.tabs.update(existing.id, { url });
  return chrome.tabs.create({ url, active: false, ...(win ? { windowId: win.id } : {}) });
}

function waitForLoad(tabId) {
  return new Promise((resolve) => {
    const done = (ok) => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(ok);
    };
    const onUpdated = (id, info) => {
      if (id === tabId && info.status === "complete") done(true);
    };
    const timer = setTimeout(() => done(false), LOAD_TIMEOUT_MS);
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function countToday() {
  const { autoDaily } = await chrome.storage.local.get("autoDaily");
  const record = todayRecord(autoDaily);
  await chrome.storage.local.set({ autoDaily: { ...record, count: record.count + 1 } });
}

/** 쇼핑몰 거부 징후: 오늘 멈춤 + 회원이 다시 켤 때까지 자동 검색·예약 일시정지 + 아이콘 「!」 + 컴퓨터 알림. */
async function pauseForSafety(reason, keyword, market = "coupang") {
  const message = safetyMessage(reason, keyword, market);
  const { autoDaily } = await chrome.storage.local.get("autoDaily");
  await chrome.storage.local.set({ autoDaily: { ...todayRecord(autoDaily), stopped: true }, autoSafety: { reason, keyword, market, at: Date.now(), message } });
  await stopJob(message);
  await clearScheduleAlarms();
  await showSafetyBadge(true);
  chrome.notifications.create("coupang-safety", {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: `${MARKETS[marketOf(market)].name} 상품소싱기 — 자동 검색 일시정지`,
    message: `${message} 오늘은 쉬고, 확장 창을 열어 안내를 확인해 주세요.`,
    priority: 2,
  });
}

async function showSafetyBadge(on) {
  await chrome.action.setBadgeText({ text: on ? "!" : "" });
  if (on) await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
}

/** 키워드 하나를 처리하고 다음 차례를 예약한다. */
async function step() {
  const job = await getJob();
  if (!job?.running) return;
  const keyword = job.keywords[job.index];
  const market = marketOf(job.market);
  if (keyword == null) return stopJob(`✅ 키워드 ${job.keywords.length}개를 모두 읽었습니다.`);

  await setJob({ message: `「${keyword}」 검색 화면을 여는 중… (${job.index + 1}/${job.keywords.length})`, nextAt: null });
  const tab = await marketTab({ ...job, market }, searchUrl(keyword, market)).catch(() => null);
  if (!tab) return stopJob(`${MARKETS[market].name} 탭을 열지 못했습니다. 브라우저 창을 하나 연 뒤 다시 시작해 주세요.`);
  await setJob({ tabId: tab.id });
  const loaded = await waitForLoad(tab.id);
  // 뒤에 있는 탭은 상품 목록을 늦게 그린다(2026-11-03 실측: 다 읽힌 뒤 2.5초엔 0개, 잠시 뒤 60개).
  let read = null;
  for (let tries = 0; loaded && tries < READ_TRIES; tries++) {
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    if (!(await getJob())?.running) return; // 기다리는 사이 회원이 멈춤
    read = await readTab(tab.id, market);
    if (read && read.state !== "unknown") break;
  }
  await countToday();
  const after = await chrome.tabs.get(tab.id).catch(() => null);
  if (after && !isSearchUrl(after.url, market)) return pauseForSafety("redirect", keyword, market);
  if (!loaded) return pauseForSafety("load-fail", keyword, market);
  if (!read) return stopJob(`「${keyword}」 화면을 읽지 못해 멈췄습니다. ${MARKETS[market].name} 탭을 확인한 뒤 다시 시작해 주세요.`);
  if (read.state !== "ok") return pauseForSafety(read.state, keyword, market);

  const added = await addToLocalList(read.products);
  const saved = await saveToAccount(keyword, read.products, market);
  const results = [...(job.results ?? []), { keyword, count: read.products.length, added, saved }];
  const index = job.index + 1;
  if (index >= job.keywords.length) {
    await setJob({ index, results });
    return stopJob(`✅ 키워드 ${job.keywords.length}개를 모두 읽었습니다.`);
  }
  const minutes = nextGapMinutes();
  await chrome.alarms.create(ALARM, { delayInMinutes: minutes });
  await setJob({
    index,
    results,
    nextAt: Date.now() + minutes * 60_000,
    message: `「${keyword}」 상품 ${read.products.length}개를 읽었습니다. 다음 키워드까지 기다리는 중입니다.`,
  });
}

async function start(keywords, label = "", market = "coupang") {
  const { autoDaily } = await chrome.storage.local.get("autoDaily");
  const problem = startProblem(keywords, todayRecord(autoDaily));
  if (problem) return { ok: false, error: problem };
  const { autoSafety } = await chrome.storage.local.get("autoSafety");
  if (autoSafety) return { ok: false, error: "⛔ 쇼핑몰 거부 징후로 일시정지 중입니다. 확장 창의 안내를 읽고 「확인했고 다시 사용」을 먼저 눌러 주세요." };
  if ((await getJob())?.running) return { ok: false, error: "이미 자동 검색이 진행 중입니다." };
  const previous = await getJob();
  await chrome.storage.local.set({
    autoJob: { keywords, market: marketOf(market), index: 0, tabId: previous?.tabId ?? null, running: true, results: [], nextAt: null, message: `${label}${MARKETS[marketOf(market)].name} 자동 검색을 시작합니다…` },
  });
  step();
  return { ok: true };
}

/** 마켓별 예약 { coupang: {...}, naver: {...} }. 예전 하나짜리 예약은 처음 읽을 때 옮기고 지운다. */
async function getSchedules() {
  const { autoSchedules, autoSchedule } = await chrome.storage.local.get(["autoSchedules", "autoSchedule"]);
  if (autoSchedules) return autoSchedules;
  const migrated = migrateSchedules(null, autoSchedule);
  await chrome.storage.local.set({ autoSchedules: migrated });
  await chrome.storage.local.remove("autoSchedule");
  await chrome.alarms.clear(LEGACY_SCHEDULE_ALARM);
  return migrated;
}

async function clearScheduleAlarms() {
  await chrome.alarms.clear(LEGACY_SCHEDULE_ALARM);
  for (const market of Object.keys(MARKETS)) await chrome.alarms.clear(SCHEDULE_ALARM_PREFIX + market);
}

/** 매일 예약 알람을 마켓마다 다시 건다. catchUp은 크롬을 새로 켰을 때만(그 시각에 꺼져 있었으면 오늘 안에 한 번). only면 그 마켓만. */
async function armSchedule(catchUp = false, only = null) {
  const schedules = await getSchedules();
  const { autoSafety } = await chrome.storage.local.get("autoSafety");
  for (const market of Object.keys(MARKETS)) {
    if (only && only !== market) continue;
    await chrome.alarms.clear(SCHEDULE_ALARM_PREFIX + market);
    const schedule = schedules[market];
    if (!schedule) continue;
    if (autoSafety || !schedule.enabled || !validTime(schedule.time)) {
      schedules[market] = { ...schedule, nextAt: null };
      continue;
    }
    const when = nextScheduleAt(schedule.time, { lastRunDay: schedule.lastRunDay, catchUp });
    await chrome.alarms.create(SCHEDULE_ALARM_PREFIX + market, { when });
    schedules[market] = { ...schedule, nextAt: when };
  }
  await chrome.storage.local.set({ autoSchedules: schedules });
  return only ? schedules[only]?.nextAt ?? null : null;
}

async function runSchedule(market) {
  const schedules = await getSchedules();
  const schedule = schedules[market];
  if (!schedule?.enabled) return;
  // 다른 마켓 자동 검색(또는 직접 시작한 검색)이 도는 중이면 겹치지 않게 조금 뒤에 다시 시도한다.
  if ((await getJob())?.running) {
    await chrome.alarms.create(SCHEDULE_ALARM_PREFIX + market, { delayInMinutes: SCHEDULE_RETRY_MINUTES });
    await chrome.storage.local.set({ autoSchedules: { ...schedules, [market]: { ...schedule, nextAt: Date.now() + SCHEDULE_RETRY_MINUTES * 60_000 } } });
    return;
  }
  await chrome.storage.local.set({ autoSchedules: { ...schedules, [market]: { ...schedule, lastRunDay: kstDay() } } });
  const reply = await start(schedule.keywords ?? [], "⏰ 매일 예약 — ", market);
  if (!reply.ok && !(await getJob())?.running) await setJob({ running: false, nextAt: null, message: `⏰ ${MARKETS[market].name} 매일 예약을 시작하지 못했습니다: ${reply.error}` });
  await armSchedule(false, market);
}

async function saveSchedule({ enabled, time, keywords, market }) {
  if (enabled) {
    if (!validTime(time)) return { ok: false, error: "예약 시각을 다시 골라 주세요." };
    if (!keywords?.length) return { ok: false, error: "예약할 키워드를 한 줄에 하나씩 넣어 주세요." };
  }
  const key = marketOf(market);
  const schedules = await getSchedules();
  await chrome.storage.local.set({ autoSchedules: { ...schedules, [key]: { ...schedules[key], enabled: Boolean(enabled), time, keywords: keywords ?? [] } } });
  return { ok: true, nextAt: await armSchedule(false, key) };
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) step();
  if (alarm.name.startsWith(SCHEDULE_ALARM_PREFIX)) runSchedule(marketOf(alarm.name.slice(SCHEDULE_ALARM_PREFIX.length)));
  if (alarm.name === LEGACY_SCHEDULE_ALARM) getSchedules().then(() => armSchedule(true)); // 업데이트 전에 걸어 둔 알람
});

// 브라우저를 다시 켜거나 확장을 새로 고치면 예약 알람이 사라질 수 있어 다시 건다.
async function restoreBadge() {
  const { autoSafety } = await chrome.storage.local.get("autoSafety");
  await showSafetyBadge(Boolean(autoSafety));
}
chrome.runtime.onStartup.addListener(() => restoreBadge().then(() => armSchedule(true)));
chrome.runtime.onInstalled.addListener(() => restoreBadge().then(() => armSchedule(false)));

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  if (message?.type === "auto-start") {
    start(message.keywords, "", message.market).then(reply);
    return true;
  }
  if (message?.type === "schedule-save") {
    saveSchedule(message).then(reply);
    return true;
  }
  if (message?.type === "safety-pause") {
    pauseForSafety(message.reason, message.keyword, message.market).then(() => reply({ ok: true }));
    return true;
  }
  if (message?.type === "safety-resume") {
    chrome.storage.local.remove("autoSafety").then(() => showSafetyBadge(false)).then(() => armSchedule(false)).then(() => reply({ ok: true }));
    return true;
  }
  if (message?.type === "auto-stop") {
    stopJob("자동 검색을 멈췄습니다.").then(() => reply({ ok: true }));
    return true;
  }
});
