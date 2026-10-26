// AIMaster 부동산 실시간 매물 알림 확장 — 수집 엔진(3단계, v1.03).
// 원칙(인수인계 §0): 네이버는 회원 PC·회원 본인 로그인으로만 읽고, 매물은 우리 서버로 보내지 않는다(확장 안에만 저장).
// 텔레그램은 회원 본인 봇으로 이 PC에서 바로 보낸다. 서버에는 숫자 상태만 보고한다. 차단·확인 화면이면 그날 멈춘다.
import { collectComplex, collectRegionComplexes, rand, sleep } from "./lib/collector.js";
import { complexNoFromUrl, extractPhones, isGenericName, matchesTarget, normalizeArticle, pickTopComplexes } from "./lib/listing.js";
import { compareComplex, filterEvents } from "./lib/compare.js";
import { computeNextDue, kstDate, pickRunSlice, shouldRunScheduled } from "./lib/guard.js";
import { COLUMNS, toCsv, toTable, toXlsx } from "./lib/sheet.js";
import { buildSummary, sendDocument, sendMessage } from "./lib/telegram.js";
import { buildKakaoText, buildMailHtml, buildMailSubject, kakaoButtonFor, kakaoLinkFor, sendKakaoMemo, sendResendMail } from "./lib/notify.js";
import { pickEvents, pushEvents, pushHistory, summarizeTable } from "./lib/stats.js";
import { compareToTrades, gapText } from "./lib/tradeCompare.js";
import { findBargains } from "./lib/bargain.js";
import { makeAiSummary } from "./lib/aiSummary.js";
import { findStale } from "./lib/stale.js";
import { WEEKLY_AI_MAX, WEEKLY_URL, buildWeeklyPrompt, buildWeeklyReport, shouldSendWeekly } from "./lib/weekly.js";

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
  maxComplexesPerRun: 20,
  maxPagesPerDay: 300,
  scheduleJitter: 0.1,
  // 중개사 번호(2026-10-25 주인님 결정 「사무실 + 휴대폰, 없으면 빈칸」): 새·가격 변동 매물만 상세를 읽는다. 서버에는 보내지 않는다.
  detail: {
    url: "https://new.land.naver.com/api/articles/{articleNo}?complexNo={complexNo}",
    office: ["realtorPhone", "representativeTelNo", "realtorTelNo"],
    mobile: ["cellPhoneNo", "realtorCellPhoneNo"],
    maxPerRun: 20,
    waitMs: [1000, 2000],
  },
  region: {
    pageUrl: "https://new.land.naver.com/complexes",
    listUrl: "https://new.land.naver.com/api/regions/complexes?cortarNo={cortarNo}&realEstateType=APT%3AABYG%3AJGC&order=",
    fields: { list: "complexList", no: "complexNo", name: "complexName", counts: ["dealCount", "leaseCount", "rentCount"] },
  },
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

// 하루 목록 페이지 수(한국 날짜 기준) — 상한을 넘으면 그날 쉰다(2026-10-25 주인님 지시 「문제 안 되게 상한선」)
async function pagesToday() {
  const { pagesDay } = await get("pagesDay");
  return pagesDay?.date === kstDate() ? pagesDay.count : 0;
}
// 하루 상한에 닿았나 — 시험 계정 예외(noDailyLimit)면 닿지 않음. 대신 300을 넘긴 첫 순간 기록에 경고를 남긴다(2026-10-26 주인님 「문제 여지가 있으면 바로 알려줘」)
let exemptWarned = false;
async function overDailyLimit(rules) {
  const max = rules.maxPagesPerDay || 300;
  const n = await pagesToday();
  if (!rules.noDailyLimit) return n >= max;
  if (n >= max && !exemptWarned) { exemptWarned = true; await addLog(`⚠ 시험 계정 예외로 하루 ${max}페이지를 넘겨 읽는 중(오늘 ${n}페이지) — 네이버 확인 화면이 뜨면 그날은 바로 멈춰요`); }
  return false;
}
async function addPages(n) {
  const today = kstDate();
  const { pagesDay } = await get("pagesDay");
  const count = (pagesDay?.date === today ? pagesDay.count : 0) + n;
  await set({ pagesDay: { date: today, count } });
  return count;
}

/** 수집 1회: 감시 대상 → 수집 → 거르기 → 비교 → 파일 → 텔레그램 → 상태 보고. trigger: "schedule" | "manual" */
async function runCollection(trigger) {
  if (busy) return { ok: false, error: "이미 수집 중이에요. 끝날 때까지 기다려 주세요." };
  busy = true;
  const startedAt = new Date().toISOString();
  await set({ running: { startedAt, trigger, done: 0, total: 0 } });
  try {
    const settings = await loadSettings();
    const rules = await loadRules();
    // 시험 계정 예외면 오늘 한도 기록을 지워 예약 수집도 다시 돈다
    exemptWarned = false;
    if (rules.noDailyLimit) await set({ limitDate: null });
    const targets = settings.targets || [];
    await addLog(`${trigger === "manual" ? "지금 수집" : "예약 수집"} 시작 · 감시 대상 ${targets.length}곳`);
    if (!targets.length) {
      await set({ lastRunAt: startedAt });
      return { ok: false, error: "켜진 감시 대상이 없어요. 웹 🎯 감시 대상에서 단지를 추가해 주세요." };
    }
    await set({ running: { startedAt, trigger, done: 0, total: targets.length } });

    const listKey = rules.fields?.list || "articleList";
    const { states = {} } = await get("states");
    const { phones = {} } = await get("phones"); // 매물 번호 → 중개사 번호(회원 PC에만, 2026-10-25)
    const { complexInfo = {} } = await get("complexInfo"); // 단지 번호 → 법정동 코드(공개 정보, 실거래가 비교용 v1.19)
    const tradeTargets = []; // 실거래 조회할 단지: { key: 단지 번호, name, lawd: 시·군·구 5자리 }
    const perTarget = [];
    const fileRows = [];
    let total = 0;
    let result = "ok";
    let errMsg = null;
    let limitHit = false; // 하루 페이지 한도에 닿음
    let detailLeft = rules.detail?.maxPerRun ?? 20; // 회차당 상세(중개사 번호) 최대 건수

    // 지역 대상은 그 동에서 매물 많은 단지 N곳으로 펼친다(2026-10-25). 단지 대상과 겹치는 단지는 한 번만 읽는다.
    const work = [];
    const seenNo = new Set();
    for (const t of targets) {
      if (t.target_type !== "region") {
        if (t.complex_no && !seenNo.has(t.complex_no)) { seenNo.add(t.complex_no); work.push(t); }
        continue;
      }
      if (await overDailyLimit(rules)) { limitHit = true; break; }
      const rg = await collectRegionComplexes(t.cortar_no, t.region_max_complexes || 5, rules, pickTopComplexes, addLog);
      await addPages(1);
      if (rg.status === "blocked") {
        result = "blocked";
        errMsg = rg.error;
        await set({ stoppedDate: kstDate() });
        break;
      }
      if (rg.status !== "ok") {
        if (result === "ok") { result = rg.status; errMsg = rg.error; }
        continue;
      }
      await addLog(`지역 ${t.region_name}: 단지 ${rg.complexes.length}곳 — ${rg.complexes.map((c) => `${c.complexName}(${c.count})`).join(", ")}`.slice(0, 300));
      for (const c of rg.complexes) {
        if (seenNo.has(c.complexNo)) continue;
        seenNo.add(c.complexNo);
        work.push({ ...t, target_type: "complex", complex_no: c.complexNo, complex_name: c.complexName, fromRegion: t.region_name });
      }
      const [a, b] = rules.betweenTargetsMs || [10000, 30000];
      await sleep(rand(a, b));
    }
    if (result === "blocked" || limitHit) work.length = 0; // 확인 화면·하루 한도면 아무 단지도 읽지 않음
    // 한 회차 단지 수 상한 — 넘으면 지난번 다음부터 돌아가며 읽어 모든 단지가 차례로 읽히게
    const cap = rules.maxComplexesPerRun || 20;
    if (work.length > cap) {
      const { runCursor = 0 } = await get("runCursor");
      const { slice, nextCursor } = pickRunSlice(work, cap, runCursor);
      await addLog(`이번 회차는 ${cap}곳만 읽어요(전체 ${work.length}곳 — 나머지는 다음 회차에 차례로)`);
      work.splice(0, work.length, ...slice);
      await set({ runCursor: nextCursor });
    }
    await set({ running: { startedAt, trigger, done: 0, total: work.length } });

    for (let i = 0; i < work.length; i++) {
      const t = work[i];
      if (i > 0) {
        const [a, b] = rules.betweenTargetsMs || [10000, 30000];
        await sleep(rand(a, b));
      }
      if (await overDailyLimit(rules)) { limitHit = true; await addLog(`오늘 수집 한도(${rules.maxPagesPerDay || 300}페이지)에 닿아 나머지는 쉬어요`); break; }
      // 매물 목록 → 정리(상세 대상 고르기와 아래 비교가 같은 방법을 쓰도록 함수로)
      const itemsOf = (bodies) => {
        const seen = new Set();
        return bodies
          .flatMap((b) => b[listKey] || [])
          .map((a) => normalizeArticle(a, t.complex_no, isGenericName(t.complex_name) ? "" : t.complex_name, rules.fields))
          .filter((it) => it.no && !seen.has(it.no) && seen.add(it.no))
          .filter((it) => matchesTarget(it, t));
      };
      // 상세(중개사 번호) 읽을 매물 고르기 — 회차 전체 상한(detailLeft) 안에서:
      // ① 새·가격 변동(알림 기준에 맞는 것) 먼저 ② 남는 여유로 번호를 아직 모르는 매물을 조금씩(2026-10-25 주인님 「진행해」 — 조금씩 채워 기억).
      // 한 번 읽은 번호는 phones(회원 PC chrome.storage)에 기억해 다시 읽지 않는다.
      const pickDetails = (bodies) => {
        if (detailLeft <= 0) return [];
        const list = itemsOf(bodies);
        const pre = compareComplex(states[t.complex_no], list, { complete: false });
        const changed = filterEvents(pre.events, settings.delivery).filter((e) => e.type !== "gone").map((e) => e.item.no);
        const unknown = list.map((it) => it.no).filter((no) => !phones[no] && !changed.includes(no));
        const nos = [...changed.filter((no) => !phones[no]), ...unknown].slice(0, detailLeft);
        detailLeft -= nos.length;
        return nos;
      };
      const needLocation = !t.cortar_no && !complexInfo[t.complex_no]?.cortarNo;
      const r = await collectComplex(t.complex_no, rules, addLog, { pickDetails, extract: (body) => extractPhones(body, rules.detail), needLocation });
      await addPages(Math.max(1, r.bodies?.length || 0) + (r.detailCount || 0) + (r.locateCount || 0));
      await set({ running: { startedAt, trigger, done: i + 1, total: work.length } });
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
      const items = itemsOf(r.bodies);
      // 이번에 읽은 번호를 기억하고(번호가 없던 매물도 「없음」으로 기억해 다시 읽지 않음), 기억한 번호를 붙인다(없으면 빈칸) — 회원 PC 파일·회원 알림에만, 서버로 보내지 않음
      const nowIso = new Date().toISOString();
      for (const [no, ph] of Object.entries(r.details || {})) phones[no] = { office: ph.office || "", mobile: ph.mobile || "", at: nowIso };
      for (const it of items) {
        const ph = phones[it.no];
        if (ph) { it.officeTel = ph.office || ""; it.mobileTel = ph.mobile || ""; }
      }
      const realName = r.bodies.flatMap((b) => b[listKey] || []).find((a) => a.articleName)?.articleName || "";
      const name = (!isGenericName(t.complex_name) && t.complex_name) || realName || `단지 ${t.complex_no}`;
      // 이름이 비었거나 탭 제목 같은 일반 이름이면 웹 감시 대상 이름을 실제 단지명으로 고친다(단지 번호·이름만 보냄)
      if (isGenericName(t.complex_name) && realName) {
        api("/api/extension/targets", { method: "POST", body: JSON.stringify({ complexNo: t.complex_no, complexName: realName, rename: true }) }).catch(() => {});
      }
      // 실거래가 비교 대상(지역 감시는 그 동 코드, 단지 감시는 단지 화면에서 읽은 코드)
      if (r.cortarNo) complexInfo[t.complex_no] = { cortarNo: r.cortarNo, at: nowIso };
      const lawdSrc = t.cortar_no || complexInfo[t.complex_no]?.cortarNo;
      if (lawdSrc) tradeTargets.push({ key: String(t.complex_no), name, lawd: String(lawdSrc).slice(0, 5) });
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

    await set({ complexInfo });
    await attachTradeGaps(fileRows, perTarget, tradeTargets);
    // 🔥 급매(v1.28): 같은 단지·같은 면적 매매 중간값보다 10% 이상 싼 매물 — 회원 PC 안에서만 계산
    const bargains = findBargains(fileRows.filter((r) => r.status !== "gone").map((r) => r.item));
    for (const row of fileRows) if (row.status !== "gone" && bargains[row.item.no]) row.item.bargain = bargains[row.item.no];
    for (const t of perTarget) for (const e of t.events || []) if (e.type !== "gone" && bargains[e.item.no]) e.item.bargain = bargains[e.item.no];
    const table = toTable(fileRows);
    if (limitHit) await set({ limitDate: kstDate() });
    const iv = settings.schedule?.intervalMinutes || 180;
    await set({ nextDueAt: computeNextDue(new Date(startedAt).getTime(), iv, rules.scheduleJitter ?? 0.1) });
    // 기억한 번호는 30일이 지나면 지운다(그 사이 다시 보이면 다시 읽음)
    const cut = Date.now() - 30 * 24 * 3600 * 1000;
    for (const [no, ph] of Object.entries(phones)) if (!ph?.at || new Date(ph.at).getTime() < cut) delete phones[no];
    await set({ phones });
    await set({ states, lastRunAt: startedAt, lastResult: { at: startedAt, trigger, result, error: errMsg, columns: COLUMNS, table, perTarget: perTarget.map((p) => ({ name: p.name, total: p.total, events: p.events.length, firstRun: p.firstRun })) } });
    // 통계·추이(2026-10-25): 회차마다 요약만 회원 PC에 쌓는다(90일) — 웹 「수집 결과」 대시보드가 확장에 물어 그린다
    if (table.length) {
      const { history = [], eventLog = [] } = await get(["history", "eventLog"]);
      // 변동 기록: 새 매물·가격 내림/오름·사라짐 줄만 따로 1년(중개사 전화번호도 그대로 — 주인님 「필요하면 중개사한테 전화해야 하니 없애면 안 된다」) — 「변동 기록」 탭용. 통계 요약도 1년(주인님 결정 2026-10-25)
      const nextHistory = pushHistory(history, summarizeTable(COLUMNS, table, startedAt));
      await set({ history: nextHistory, eventLog: pushEvents(eventLog, pickEvents(COLUMNS, table, startedAt)) });
      // 🤖 AI 시세 요약(v1.22): 켠 회원만, 그날 첫 수집 때 1번 — 회원 본인 AI 키로 회원 PC에서 직접 부른다(통계 숫자만 보냄). 실패해도 알림은 평소대로.
      if (settings.ai?.error) await addLog(`AI 요약: ${settings.ai.error}`);
      if (settings.ai?.apiKey) {
        const { aiSummary } = await get("aiSummary");
        if (aiSummary?.date !== kstDate()) {
          try {
            const text = await makeAiSummary(settings.ai, nextHistory);
            await set({ aiSummary: { text, at: new Date().toISOString(), date: kstDate(), provider: settings.ai.provider } });
            await addLog("AI 요약을 만들었어요.");
          } catch (e) { await addLog(`AI 요약 실패: ${e.message || e}`); }
        }
      }
    }

    await deliver({ settings, perTarget, table, result, errMsg, trigger, limitHit, maxPages: rules.maxPagesPerDay || 300 });
    if (result !== "blocked") await sendWeekly(settings, states).catch((e) => addLog(`주간 리포트 실패: ${e.message || e}`));
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
// 실거래가 비교(2026-10-25 v1.19): 서버에 「단지 이름 + 시·군·구 코드」만 보내 국토부 실거래 요약(면적대별 ㎡당 중간값)을 받고,
// 회원 PC에 하루 기억한다. 매매 매물마다 「실거래 대비 +8%」를 붙인다(엑셀·결과 표·알림). 회원 매물은 서버로 보내지 않는다.
async function attachTradeGaps(fileRows, perTarget, tradeTargets) {
  if (!tradeTargets.length) return;
  let lastTradeDiag = null;
  let lastMissed = null; // 진단 K: 못 찾은 단지별 비슷한 국토부 이름
  const DAY = 24 * 3600 * 1000;
  const now = Date.now();
  const { tradeCache = {} } = await get("tradeCache");
  // 2026-10-26: 못 맞춘 빈 결과를 하루 기억해 이름 규칙 보강(v1.29)이 하루 동안 안 쓰이던 문제 → 빈 결과는 3시간만, 규칙 버전이 바뀌면 바로 다시 묻는다
  const TRADE_RULE_V = 2;
  const stale = (c) => !c || c.v !== TRADE_RULE_V || now - new Date(c.at).getTime() > (c.bands?.length ? DAY : 3 * 3600 * 1000);
  const need = tradeTargets.filter((t) => stale(tradeCache[t.key]) || tradeCache[t.key].name !== t.name);
  if (need.length) {
    try {
      const r = await api("/api/extension/trades", { method: "POST", body: JSON.stringify({ targets: need }) });
      if (r?.error === "no_key") await addLog("실거래 비교: 공공데이터 키가 없어 건너뛰었어요(웹 「API키등록·플랫폼연동」에서 등록할 수 있어요)");
      for (const t of need) if (r?.results?.[t.key]) tradeCache[t.key] = { at: new Date().toISOString(), name: t.name, v: TRADE_RULE_V, ...r.results[t.key] };
      if (r?.errors?.length) await addLog(`실거래 비교 알림: ${r.errors.join(" / ")}`.slice(0, 200));
      lastTradeDiag = Array.isArray(r?.diag) ? r.diag : null;
      lastMissed = Array.isArray(r?.missed) ? r.missed : null;
    } catch (e) {
      await addLog(`실거래 비교 실패: ${e.message}`);
    }
  }
  for (const [k, v] of Object.entries(tradeCache)) if (now - new Date(v.at).getTime() > 30 * DAY) delete tradeCache[k];
  await set({ tradeCache });
  const gapOf = (it) => {
    if (it.tradeName !== "매매") return "";
    const c = tradeCache[String(it.complexNo)];
    const cmp = c ? compareToTrades(it.price, it.area, c.bands || []) : null;
    return cmp ? gapText(cmp.pct) : "";
  };
  let n = 0;
  for (const row of fileRows) { const g = gapOf(row.item); if (g) { row.item.tradeGap = g; n++; } }
  for (const t of perTarget) for (const e of t.events || []) { const g = gapOf(e.item); if (g) e.item.tradeGap = g; }
  const matched = tradeTargets.filter((t) => tradeCache[t.key]?.bands?.length).length;
  const missed = tradeTargets.filter((t) => !tradeCache[t.key]?.bands?.length).map((t) => t.name || t.key);
  await addLog(`실거래 비교: 단지 ${matched}/${tradeTargets.length}곳 자료 있음 · 매매 ${n}건에 「실거래 대비」${missed.length ? ` · 자료 없음: ${missed.join(", ")}` : ""}`.slice(0, 300));
  // 진단(2026-10-26): 못 맞춘 단지가 있으면 국토부 거래 수·단지 이름 예시를 남긴다(다음 보완용)
  if (matched < tradeTargets.length && lastTradeDiag?.length) await addLog(`실거래 진단: ${lastTradeDiag.map((d) => `지역 ${d.lawd} 국토부 거래 ${d.trades}건 · 예: ${(d.names || []).join(", ")}`).join(" / ")}`.slice(0, 300));
  for (const m of lastMissed || []) await addLog(`실거래 이름 후보: ${m.name} → ${m.similar?.length ? m.similar.join(", ") : "비슷한 이름 없음(최근 6개월 매매 신고가 없을 수 있어요)"}`.slice(0, 300));
}

async function deliver({ settings, perTarget, table, result, errMsg, trigger, limitHit = false, maxPages = 300 }) {
  // 채널별로 따로 보낸다(2026-10-25 카톡·이메일 추가) — 한 채널이 실패해도 다른 채널은 보낸다.
  const tg = settings.telegram;
  const kakao = settings.kakao?.accessToken ? settings.kakao : null;
  const email = settings.email?.apiKey ? settings.email : null;
  if (settings.kakao?.error) await addLog(`카톡 받기: ${settings.kakao.error}`);
  if (settings.email?.error) await addLog(`이메일 받기: ${settings.email.error}`);
  if (!tg && !kakao && !email) { await addLog("받는 곳(텔레그램·카톡·이메일)이 연결되지 않아 보내지 않았어요(웹 📨 받는 방법)."); return; }
  const d = settings.delivery || {};
  const { telegramFailed = false } = await get("telegramFailed");

  // 짧은 안내(차단·하루 한도)는 텔레그램·카톡으로
  async function notice(text) {
    if (tg) await sendMessage(tg.botToken, tg.chatId, text).catch((e) => addLog(`텔레그램 보내기 실패: ${e.message}`));
    if (kakao) await sendKakaoMemo(kakao.accessToken, text.slice(0, 200)).catch((e) => addLog(`카톡 보내기 실패: ${e.message}`));
  }
  if (result === "blocked") { await notice(`🏠 [매물 알림] ⛔ 네이버가 잠시 이용을 제한해 수집을 멈췄어요.\n${errMsg || ""}\n\n이렇게 해 주세요:\n1) 네이버 부동산을 직접 열어 보안 문자·본인 확인이 나오면 풀어 주세요.\n2) 제한은 보통 몇 시간~하루 지나면 풀려요. 오늘 예약 수집은 쉬고 내일 다시 시작해요.\n3) 자주 걸리면 예약 간격을 길게(2~3시간 이상), 감시 단지 수를 줄여 주세요.`); return; }
  if (limitHit) {
    const { limitNoticeDate } = await get("limitNoticeDate");
    if (limitNoticeDate !== kstDate()) {
      await notice(`🏠 [매물 알림] ⏸ 오늘 수집 한도(${maxPages}페이지)에 닿아 오늘은 더 수집하지 않아요. 네이버 이용 제한을 피하려는 안전장치예요. 내일 다시 시작해요.`);
      await set({ limitNoticeDate: kstDate() });
    }
  }
  const changed = perTarget.some((t) => t.events.length || t.firstRun);
  if (!changed && trigger !== "manual") return;

  // 🤖 AI 요약은 하루 1번만 텔레그램·메일 맨 위에 붙인다(카톡은 글자 수가 짧아 빼고, 결과 보기 화면에서 봄)
  const { aiSummary, aiSentDate } = await get(["aiSummary", "aiSentDate"]);
  const aiLine = settings.ai?.apiKey && aiSummary?.date === kstDate() && aiSentDate !== kstDate() ? aiSummary.text : "";
  const summary = (aiLine ? `🤖 AI 한 줄 요약
${aiLine}

` : "") + buildSummary(perTarget, { failedBefore: telegramFailed });
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const aiHtml = aiLine ? `<div style="background:#eef6ff;border:1px solid #cfe0ff;border-radius:10px;padding:10px 14px;margin:0 0 14px"><b>🤖 AI 한 줄 요약</b><br>${esc(aiLine)}</div>` : "";
  let file = null;
  if (d.deliverFile !== false && table.length) {
    const stamp = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})(\d{4})$/, "$1_$2");
    file = d.fileFormat === "csv"
      ? { bytes: new TextEncoder().encode(toCsv(table)), filename: `매물알림_${stamp}.csv`, mime: "text/csv" }
      : { bytes: toXlsx(table), filename: `매물알림_${stamp}.xlsx`, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  }

  if (tg) {
    try {
      if (d.deliverTelegram !== false) await sendMessage(tg.botToken, tg.chatId, summary);
      if (file) await sendDocument(tg.botToken, tg.chatId, file.bytes, file.filename, file.mime, "🏠 [매물 알림] 정리 파일");
      await set({ telegramFailed: false, ...(aiLine ? { aiSentDate: kstDate() } : {}) });
    } catch (e) {
      await set({ telegramFailed: true });
      await addLog(`텔레그램 보내기 실패: ${e.message}`);
    }
  }
  if (kakao) await sendKakaoMemo(kakao.accessToken, buildKakaoText(perTarget), kakaoLinkFor(perTarget), kakaoButtonFor(perTarget)).catch((e) => addLog(`카톡 보내기 실패: ${e.message}`));
  if (email) {
    if (aiLine) await set({ aiSentDate: kstDate() });
    await sendResendMail(email.apiKey, { to: email.to, subject: buildMailSubject(perTarget), text: summary, html: aiHtml + buildMailHtml(perTarget), file })
      .catch((e) => addLog(`이메일 보내기 실패: ${e.message}`));
  }
}

// 📅 주간 리포트(D, 2026-10-26): 고른 요일의 그날 첫 수집 뒤 1번(놓치면 그 주 다음 수집 때). 같은 주에는 다시 보내지 않는다.
async function sendWeekly(settings, states) {
  const { history = [], eventLog = [], weeklySentKey } = await get(["history", "eventLog", "weeklySentKey"]);
  const key = shouldSendWeekly(settings.weekly, weeklySentKey, history);
  if (!key) return;
  const tg = settings.telegram;
  const kakao = settings.kakao?.accessToken ? settings.kakao : null;
  const email = settings.email?.apiKey ? settings.email : null;
  if (!tg && !kakao && !email) return;
  let aiText = "";
  if (settings.ai?.apiKey) {
    try { aiText = await makeAiSummary(settings.ai, history, { buildPrompt: buildWeeklyPrompt, max: WEEKLY_AI_MAX }); }
    catch (e) { await addLog(`주간 AI 요약 실패: ${e.message || e}`); }
  }
  const names = Object.fromEntries((settings.targets || []).filter((t) => t.complex_no && !isGenericName(t.complex_name)).map((t) => [String(t.complex_no), t.complex_name]));
  const rep = buildWeeklyReport({ history, eventLog, states, names, aiText });
  if (!rep) return;
  let sent = false;
  if (tg) await sendMessage(tg.botToken, tg.chatId, rep.text).then(() => { sent = true; }).catch((e) => addLog(`주간 리포트 텔레그램 실패: ${e.message}`));
  if (kakao) await sendKakaoMemo(kakao.accessToken, rep.kakao, WEEKLY_URL, "주간 통계 보기").then(() => { sent = true; }).catch((e) => addLog(`주간 리포트 카톡 실패: ${e.message}`));
  if (email) await sendResendMail(email.apiKey, { to: email.to, subject: rep.subject, text: rep.text, html: rep.html }).then(() => { sent = true; }).catch((e) => addLog(`주간 리포트 이메일 실패: ${e.message}`));
  if (!sent) return; // 다 실패하면 다음 수집 때 다시 시도
  await set({ weeklySentKey: key, weeklyReport: { text: rep.text, at: rep.at, from: rep.from, to: rep.to } });
  await addLog(`📅 주간 리포트를 보냈어요(${rep.from}~${rep.to})`);
}

// ── 예약: 1분마다 깨어나 차례인지 본다(밀린 회차는 몰아서 하지 않고 1번만) ──
function ensureAlarm() {
  chrome.alarms.get("tick", (a) => { if (!a) chrome.alarms.create("tick", { periodInMinutes: 1 }); });
}
chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== "tick" || busy) return;
  const { extToken, consentAt, lastRunAt, stoppedDate, limitDate: savedLimit, nextDueAt, rulesCache } = await get(["extToken", "consentAt", "lastRunAt", "stoppedDate", "limitDate", "nextDueAt", "rulesCache"]);
  if (!extToken || !consentAt) return;
  const limitDate = rulesCache?.noDailyLimit ? null : savedLimit; // 시험 계정 예외(v1.31) — 확인 화면 멈춤(stoppedDate)은 그대로
  let settings;
  try { settings = await loadSettings(); } catch { return; }
  if (!shouldRunScheduled({ schedule: settings.schedule, lastRunAt, stoppedDate, limitDate, nextDueAt }).run) return;
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
        await set({ extToken: msg.token, connectedAt: new Date().toISOString(), connectedEmail: null });
        // 어느 계정에 연결됐는지 기억(웹 「시작하기」가 로그인 계정과 대조) — 이메일만
        api("/api/extension/whoami").then((w) => set({ connectedEmail: w.email || null })).catch(() => {});
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
        loadSettings().catch(() => {}); // 다음 확인·수집에 바로 반영
        // 어느 계정 목록에 넣었는지 함께 알려 준다(2026-10-25: 웹은 다른 계정으로 로그인돼 있어 안 보인다는 혼동)
        let { connectedEmail } = await get("connectedEmail");
        if (!connectedEmail) {
          connectedEmail = (await api("/api/extension/whoami").catch(() => null))?.email || null;
          if (connectedEmail) await set({ connectedEmail });
        }
        return reply({ ok: true, count: r.count, complexNo: no, email: connectedEmail });
      }
      if (msg.type === "whoami") {
        const { connectedEmail } = await get("connectedEmail");
        if (connectedEmail) return reply({ email: connectedEmail });
        const w = await api("/api/extension/whoami").catch(() => null);
        if (w?.email) await set({ connectedEmail: w.email });
        return reply({ email: w?.email || null });
      }
      if (msg.type === "stats") {
        // 웹 대시보드용 요약 기록(web-bridge가 같은 계정인지 확인한 뒤에만 부름). 기록이 아직 없으면 마지막 결과로 첫 요약을 만든다.
        const { history = [], eventLog = [], lastResult, aiSummary, states = {}, settingsCache, weeklyReport } = await get(["history", "eventLog", "lastResult", "aiSummary", "states", "settingsCache", "weeklyReport"]);
        const names = Object.fromEntries((settingsCache?.targets || []).filter((t) => t.complex_no && !isGenericName(t.complex_name)).map((t) => [String(t.complex_no), t.complex_name]));
        const cols = lastResult?.columns || COLUMNS;
        const hasLast = !!lastResult?.table?.length;
        return reply({
          ok: true,
          columns: eventLog.length || !hasLast ? COLUMNS : cols, // 변동 기록 줄의 열 순서
          history: history.length || !hasLast ? history : [summarizeTable(cols, lastResult.table, lastResult.at)],
          events: eventLog.length || !hasLast ? eventLog : pickEvents(cols, lastResult.table, lastResult.at),
          aiSummary: aiSummary || null, // 🤖 v1.22
          stale: findStale(states, names, { minDays: 30 }), // ⏳ 오래 안 팔린 매물(C-2)
          weeklyReport: weeklyReport || null, // 📅 지난 주간 리포트(D)
        });
      }
      if (msg.type === "isWatched") {
        // 네이버 화면 버튼용 — 웹 설정(1분 안이면 저장해 둔 값)에 그 단지가 있는지만 본다
        const { settingsCache, settingsAt } = await get(["settingsCache", "settingsAt"]);
        let s = settingsCache;
        if (!s || !settingsAt || Date.now() - new Date(settingsAt).getTime() > 60000) s = await loadSettings().catch(() => settingsCache);
        return reply({ watched: !!s?.targets?.some((t) => t.complex_no === String(msg.complexNo)) });
      }
      if (msg.type === "openResults") {
        await chrome.tabs.create({ url: chrome.runtime.getURL("result.html") });
        return reply({ ok: true });
      }
      if (msg.type === "state") {
        const s = await get(["extToken", "connectedEmail", "connectedAt", "consentAt", "lastRunAt", "stoppedDate", "limitDate", "nextDueAt", "pagesDay", "running", "lastResult", "settingsCache", "rulesCache", "log", "telegramFailed"]);
        // 끊긴 수집 정리(2026-10-26 v1.32): 수집 중 확장을 업데이트·새로고침하거나 크롬이 닫히면 「수집 중」 기록만 남아
        // 「지금 수집」이 영영 잠겼다. 이 서비스 워커에서 실제로 돌고 있지 않으면(busy=false) 남은 기록을 지운다.
        if (s.running && !busy) {
          s.running = null;
          await set({ running: null });
          await addLog("지난 수집이 중간에 끊겨(확장 업데이트·크롬 종료 등) 정리했어요. 「지금 수집」을 다시 눌러 주세요");
        }
        return reply({
          connected: !!s.extToken,
          connectedAt: s.connectedAt || null,
          connectedEmail: s.connectedEmail || null,
          consent: !!s.consentAt,
          lastRunAt: s.lastRunAt || null,
          stoppedToday: s.stoppedDate === kstDate(),
          limitToday: s.limitDate === kstDate(),
          pagesToday: s.pagesDay?.date === kstDate() ? s.pagesDay.count : 0,
          noDailyLimit: !!s.rulesCache?.noDailyLimit,
          nextDueAt: s.nextDueAt || null,
          running: s.running || null,
          lastResult: s.lastResult ? { at: s.lastResult.at, result: s.lastResult.result, error: s.lastResult.error, perTarget: s.lastResult.perTarget } : null,
          schedule: s.settingsCache?.schedule || null,
          targetCount: s.settingsCache?.targets?.length ?? null,
          telegramLinked: s.settingsCache ? !!s.settingsCache.telegram : null,
          latestVersion: s.settingsCache?.latestVersion || null,
          telegramFailed: !!s.telegramFailed,
          // 팝업 「최근 기록」은 쉬운 줄만(2026-10-26 주인님 — 「단지·지역 … 진단:」 개발용 줄이 중요한 줄을 밀어냄). 기록 자체는 그대로 남는다.
          recent: (s.log || []).filter((l) => !/(단지|지역) \S+ 진단:/.test(String(l))).slice(-6),
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
