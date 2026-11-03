// 키워드 자동 검색의 규칙(브라우저·시험 공용). 쿠팡은 판매량순, 네이버 쇼핑은 랭킹순 1페이지만 연다.
import { isNaverSearchUrl, naverSearchUrl } from "./naver.js";

export const MAX_KEYWORDS = 10;
export const DAILY_LIMIT = 30;
export const MIN_GAP_MINUTES = 3;
export const MAX_GAP_MINUTES = 5;

/** 줄바꿈·쉼표로 나누고 앞뒤 공백·중복·빈 칸을 뺀다. 최대 10개. */
export function parseKeywords(text) {
  const seen = new Set();
  const list = [];
  for (const raw of String(text ?? "").split(/[\n,]/)) {
    const keyword = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    list.push(keyword);
  }
  return list.slice(0, MAX_KEYWORDS);
}

/** 자동 검색이 쓰는 마켓. 마켓 값이 없으면 쿠팡(예전 저장분·예약). */
export const MARKETS = {
  coupang: { name: "쿠팡", tabPattern: "https://www.coupang.com/*" },
  naver: { name: "네이버 쇼핑", tabPattern: "https://search.shopping.naver.com/*" },
};

export function marketOf(value) {
  return value === "naver" ? "naver" : "coupang";
}

export function searchUrl(keyword, market = "coupang") {
  if (marketOf(market) === "naver") return naverSearchUrl(keyword);
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}&sorter=saleCountDesc`;
}

/** 한국 시간 날짜(YYYY-MM-DD). 하루 상한과 「오늘은 중단」을 이 날짜로 나눈다. */
export function kstDay(now = Date.now()) {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 오늘 기록. 날짜가 바뀌었으면 새로 시작한다. */
export function todayRecord(stored, now = Date.now()) {
  const day = kstDay(now);
  return stored?.day === day ? { day, count: stored.count ?? 0, stopped: Boolean(stored.stopped) } : { day, count: 0, stopped: false };
}

/** 시작해도 되는지. 막히면 이유 문장을 돌려준다. */
export function startProblem(keywords, record) {
  if (!keywords.length) return "검색할 키워드를 한 줄에 하나씩 넣어 주세요.";
  if (record.stopped) return "⛔ 오늘 쇼핑몰 확인 화면이나 「검색결과 없음」이 나와 자동 검색을 멈췄습니다. 내일 다시 써 주세요.";
  const left = DAILY_LIMIT - record.count;
  if (left <= 0) return `오늘 자동 검색 상한(${DAILY_LIMIT}개)을 다 썼습니다. 내일 다시 써 주세요.`;
  if (keywords.length > left) return `오늘 남은 자동 검색은 ${left}개입니다. 키워드를 ${left}개 이하로 줄여 주세요.`;
  return null;
}

/** 다음 키워드까지 기다릴 분(3~5분 사이 불규칙). */
export function nextGapMinutes(random = Math.random()) {
  return MIN_GAP_MINUTES + random * (MAX_GAP_MINUTES - MIN_GAP_MINUTES);
}

/** 「HH:MM」(24시간) 형식인지. */
export function validTime(time) {
  const match = String(time ?? "").match(/^(\d{2}):(\d{2})$/);
  return Boolean(match) && Number(match[1]) < 24 && Number(match[2]) < 60;
}

/**
 * 매일 예약의 다음 시작 시각(이 PC 시계 기준).
 * 오늘 시각이 아직이면 오늘, 지났으면 내일. catchUp이면(크롬을 다시 켰을 때) 오늘 아직 안 돌았으면 1분 뒤.
 */
export function nextScheduleAt(time, { now = Date.now(), lastRunDay = null, catchUp = false } = {}) {
  const [hour, minute] = time.split(":").map(Number);
  const base = new Date(now);
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute).getTime();
  if (today > now) return today;
  if (catchUp && lastRunDay !== kstDay(now)) return now + 60_000;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1, hour, minute).getTime();
}

/** 매일 예약은 마켓마다 따로(2026-11-03 v1.35). 예전 하나짜리 예약(autoSchedule)은 그 마켓 칸으로 옮긴다. */
export function migrateSchedules(schedules, legacy) {
  if (schedules && typeof schedules === "object") return schedules;
  if (!legacy) return {};
  const { market, ...rest } = legacy;
  return { [marketOf(market)]: rest };
}

/** 예약 하나가 걸리는 대략의 시간(분): 키워드마다 최대 5분. */
export function scheduleMinutes(keywordCount) {
  return Math.max(1, keywordCount) * MAX_GAP_MINUTES;
}

/** 새 예약 시각이 다른 마켓 예약이 도는 동안이면 그 마켓 예약이 끝날 때까지 기다린다는 뜻으로 true. 막지는 않는다. 하루를 넘기는 경우(자정 근처)도 본다. */
export function scheduleOverlaps(time, other) {
  if (!other?.enabled || !validTime(time) || !validTime(other.time)) return false;
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const diff = (toMin(time) - toMin(other.time) + 1440) % 1440;
  return diff < scheduleMinutes(other.keywords?.length ?? 0);
}

/** 「v1.36」이 「v1.35」보다 새것인지. 형식이 틀리면 false(알림을 띄우지 않음). */
export function isNewerVersion(latest, current) {
  const parse = (v) => String(v ?? "").match(/^v(\d+)\.(\d{2})$/)?.slice(1).map(Number) ?? null;
  const a = parse(latest);
  const b = parse(current);
  if (!a || !b) return false;
  return a[0] !== b[0] ? a[0] > b[0] : a[1] > b[1];
}

export const SCHEDULE_ALARM_PREFIX = "auto-schedule-";
/** 다른 마켓 자동 검색이 도는 중에 예약 시각이 오면 이만큼 뒤에 다시 시도한다. */
export const SCHEDULE_RETRY_MINUTES = 10;

/** 쇼핑몰이 거부하는 징후. 하나라도 보이면 자동 검색과 매일 예약(두 마켓 모두)을 일시정지한다. */
export const SAFETY_TEXT = {
  blocked: (name) => `${name}이 사람인지 확인하는 화면을 띄웠습니다`,
  "no-result": () => "상품이 있을 검색어인데 「검색결과 없음」이 나왔습니다",
  redirect: () => "검색 화면이 아닌 다른 화면으로 넘어갔습니다",
  "load-fail": (name) => `${name} 화면이 30초 안에 열리지 않았습니다`,
  unknown: () => "화면에 상품이 하나도 보이지 않았습니다",
};

export function isSearchUrl(url, market = "coupang") {
  if (marketOf(market) === "naver") return isNaverSearchUrl(url);
  return /^https:\/\/www\.coupang\.com\/np\/search\?/.test(String(url ?? ""));
}

export function safetyMessage(reason, keyword, market = "coupang") {
  const name = MARKETS[marketOf(market)].name;
  const what = SAFETY_TEXT[reason]?.(name) ?? "이상한 화면이 나왔습니다";
  return `⛔ ${name} 「${keyword}」 검색 중 ${what}. ${name}이 접속을 거부하는 징후일 수 있어 자동 검색과 매일 예약을 일시정지했습니다.`;
}
