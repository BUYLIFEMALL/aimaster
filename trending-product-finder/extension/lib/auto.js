// 키워드 자동 검색의 규칙(브라우저·시험 공용). 쿠팡에는 판매량순 1페이지만 연다.

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

export function searchUrl(keyword) {
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
  if (record.stopped) return "⛔ 오늘 쿠팡 확인 화면이나 「검색결과 없음」이 나와 자동 검색을 멈췄습니다. 내일 다시 써 주세요.";
  const left = DAILY_LIMIT - record.count;
  if (left <= 0) return `오늘 자동 검색 상한(${DAILY_LIMIT}개)을 다 썼습니다. 내일 다시 써 주세요.`;
  if (keywords.length > left) return `오늘 남은 자동 검색은 ${left}개입니다. 키워드를 ${left}개 이하로 줄여 주세요.`;
  return null;
}

/** 다음 키워드까지 기다릴 분(3~5분 사이 불규칙). */
export function nextGapMinutes(random = Math.random()) {
  return MIN_GAP_MINUTES + random * (MAX_GAP_MINUTES - MIN_GAP_MINUTES);
}
