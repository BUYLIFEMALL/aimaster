// 키워드 자동 검색. 회원이 팝업에서 「시작」을 눌렀을 때만 돌고, 예약은 없다.
// 쿠팡 탭 하나만 쓰고, 키워드마다 판매량순 1페이지만 열어 읽는다. 차단 우회는 하지 않는다.
import { nextGapMinutes, searchUrl, startProblem, todayRecord } from "./lib/auto.js";
import { addToLocalList, readTab, saveToAccount } from "./lib/page.js";

const ALARM = "auto-next";
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

/** 지난번 쿠팡 탭이 있으면 그 탭을, 없으면 지금 창의 쿠팡 탭을, 그것도 없으면 지금 창에 새 탭을 쓴다. */
async function coupangTab(job, url) {
  if (job.tabId != null) {
    const tab = await chrome.tabs.get(job.tabId).catch(() => null);
    if (tab) return chrome.tabs.update(tab.id, { url });
  }
  const win = await chrome.windows.getLastFocused().catch(() => null);
  const [existing] = await chrome.tabs.query({ url: "https://www.coupang.com/*", ...(win ? { windowId: win.id } : {}) });
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

async function stopForToday(message) {
  const { autoDaily } = await chrome.storage.local.get("autoDaily");
  await chrome.storage.local.set({ autoDaily: { ...todayRecord(autoDaily), stopped: true } });
  await stopJob(message);
}

/** 키워드 하나를 처리하고 다음 차례를 예약한다. */
async function step() {
  const job = await getJob();
  if (!job?.running) return;
  const keyword = job.keywords[job.index];
  if (keyword == null) return stopJob(`✅ 키워드 ${job.keywords.length}개를 모두 읽었습니다.`);

  await setJob({ message: `「${keyword}」 검색 화면을 여는 중… (${job.index + 1}/${job.keywords.length})`, nextAt: null });
  const tab = await coupangTab(job, searchUrl(keyword)).catch(() => null);
  if (!tab) return stopJob("쿠팡 탭을 열지 못했습니다. 브라우저 창을 하나 연 뒤 다시 시작해 주세요.");
  await setJob({ tabId: tab.id });
  const loaded = await waitForLoad(tab.id);
  // 뒤에 있는 탭은 상품 목록을 늦게 그린다(2026-11-03 실측: 다 읽힌 뒤 2.5초엔 0개, 잠시 뒤 60개).
  let read = null;
  for (let tries = 0; loaded && tries < READ_TRIES; tries++) {
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    if (!(await getJob())?.running) return; // 기다리는 사이 회원이 멈춤
    read = await readTab(tab.id);
    if (read && read.state !== "unknown") break;
  }
  await countToday();
  if (!read) return stopJob(`「${keyword}」 화면을 읽지 못해 멈췄습니다. 쿠팡 탭을 확인한 뒤 다시 시작해 주세요.`);
  if (read.state === "blocked") return stopForToday("⛔ 쿠팡 확인 화면이 떠서 자동 검색을 멈췄습니다. 오늘은 더 읽지 말고 쉬어 주세요.");
  if (read.state === "no-result") {
    return stopForToday(`「${keyword}」에서 검색 결과가 없다고 나와 오늘 자동 검색을 멈췄습니다. 상품이 있는 검색어라면 쿠팡이 제한했을 수 있습니다.`);
  }
  if (read.state === "unknown") return stopJob("상품을 찾지 못해 멈췄습니다. 쿠팡 화면이 바뀌었을 수 있습니다.");

  const added = await addToLocalList(read.products);
  const saved = await saveToAccount(keyword, read.products);
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

async function start(keywords) {
  const { autoDaily } = await chrome.storage.local.get("autoDaily");
  const problem = startProblem(keywords, todayRecord(autoDaily));
  if (problem) return { ok: false, error: problem };
  if ((await getJob())?.running) return { ok: false, error: "이미 자동 검색이 진행 중입니다." };
  const previous = await getJob();
  await chrome.storage.local.set({
    autoJob: { keywords, index: 0, tabId: previous?.tabId ?? null, running: true, results: [], nextAt: null, message: "시작합니다…" },
  });
  step();
  return { ok: true };
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) step();
});

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  if (message?.type === "auto-start") {
    start(message.keywords).then(reply);
    return true;
  }
  if (message?.type === "auto-stop") {
    stopJob("자동 검색을 멈췄습니다.").then(() => reply({ ok: true }));
    return true;
  }
});
