// 멈춤 판정(인수인계 §3-3) · 예약 판정(웹 lib/schedule.ts와 같은 규칙, 한국 시간).
// 차단·확인 화면은 우회하지 않고 멈춘다.

export function isBlockedStatus(status) {
  return status === 401 || status === 403 || status === 429;
}

export const BLOCK_TEXT = /보안문자|자동입력 방지|자동 입력 방지|captcha|비정상적인 접근|로그인이 필요|일시적으로 제한/i;

export function isBlockedText(text) {
  return BLOCK_TEXT.test(String(text || ""));
}

/** 목록 응답이 수집 규칙과 다른 모양인지(네이버 변경 감지). */
export function isRuleMismatch(body, rules) {
  if (!body || typeof body !== "object") return true;
  const listKey = rules?.fields?.list || "articleList";
  if (!Array.isArray(body[listKey])) return true;
  const first = body[listKey][0];
  if (first && !("articleNo" in first)) return true;
  return false;
}

const KST = 9 * 60 * 60 * 1000;
export const kstHour = (now = Date.now()) => new Date(now + KST).getUTCHours();
export const kstDate = (now = Date.now()) => new Date(now + KST).toISOString().slice(0, 10);

export function isWithinActiveHours(hour, start, end) {
  if (start === null || start === undefined || end === null || end === undefined) return true;
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

export function isCollectDue(lastRunAt, intervalMinutes, now = Date.now()) {
  if (!lastRunAt) return true;
  return now - new Date(lastRunAt).getTime() >= intervalMinutes * 60 * 1000;
}

/**
 * 예약 회차를 돌릴지(전체 켜기·시간대·그날 멈춤·오늘 한도·차례). 밀린 회차는 몰아서 하지 않고 1번만(마지막 시각 기준).
 * nextDueAt: 지난 회차가 정한 다음 예정 시각(간격 ±10% 흔듦, 2026-10-25). 없으면 마지막 시각 + 간격.
 */
export function shouldRunScheduled({ schedule, lastRunAt, stoppedDate, limitDate, nextDueAt, now = Date.now() }) {
  if (!schedule?.enabled) return { run: false, why: "예약 꺼짐" };
  if (stoppedDate && stoppedDate === kstDate(now)) return { run: false, why: "오늘은 멈춤(확인 화면)" };
  if (limitDate && limitDate === kstDate(now)) return { run: false, why: "오늘 수집 한도 도달" };
  if (!isWithinActiveHours(kstHour(now), schedule.startHour, schedule.endHour)) return { run: false, why: "동작 시간대 밖" };
  if (nextDueAt && lastRunAt) return now >= new Date(nextDueAt).getTime() ? { run: true } : { run: false, why: "아직 차례 아님" };
  // 1시간 미만 간격은 받지 않는다(2026-10-25 주인님 지시) — 혹시 그런 값이 와도 1시간으로 올려 쓴다
  if (!isCollectDue(lastRunAt, Math.max(60, Number(schedule.intervalMinutes) || 180), now)) return { run: false, why: "아직 차례 아님" };
  return { run: true };
}

/** 다음 예정 시각 = 이번 시각 + 간격 × (1 ± jitter). 간격은 최소 1시간, 흔들어도 55분보다 짧아지지 않는다. */
export function computeNextDue(ranAtMs, intervalMinutes, jitter = 0.1, random = Math.random) {
  const base = Math.max(60, Number(intervalMinutes) || 180) * 60 * 1000;
  const j = Math.max(0, Math.min(0.3, Number(jitter) || 0));
  const ms = Math.max(55 * 60 * 1000, base * (1 + (random() * 2 - 1) * j));
  return new Date(ranAtMs + ms).toISOString();
}

/** 한 회차에 읽을 단지 고르기: 상한을 넘으면 지난번 다음부터 돌아가며(모든 단지가 차례로 읽히게). */
export function pickRunSlice(list, cap, cursor = 0) {
  if (!Array.isArray(list) || list.length <= cap) return { slice: list || [], nextCursor: 0 };
  const start = ((cursor % list.length) + list.length) % list.length;
  const slice = Array.from({ length: cap }, (_, i) => list[(start + i) % list.length]);
  return { slice, nextCursor: (start + cap) % list.length };
}

export function nextRunAt(lastRunAt, intervalMinutes) {
  if (!lastRunAt) return null;
  return new Date(new Date(lastRunAt).getTime() + intervalMinutes * 60 * 1000).toISOString();
}
