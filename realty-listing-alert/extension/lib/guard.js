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

/** 예약 회차를 돌릴지(전체 켜기·시간대·그날 중지·차례). 밀린 회차는 몰아서 하지 않고 1번만(마지막 시각 기준). */
export function shouldRunScheduled({ schedule, lastRunAt, stoppedDate, now = Date.now() }) {
  if (!schedule?.enabled) return { run: false, why: "예약 꺼짐" };
  if (stoppedDate && stoppedDate === kstDate(now)) return { run: false, why: "오늘은 멈춤(확인 화면)" };
  if (!isWithinActiveHours(kstHour(now), schedule.startHour, schedule.endHour)) return { run: false, why: "동작 시간대 밖" };
  // 1시간 미만 간격은 받지 않는다(2026-10-25 주인님 지시) — 혹시 그런 값이 와도 1시간으로 올려 쓴다
  if (!isCollectDue(lastRunAt, Math.max(60, Number(schedule.intervalMinutes) || 180), now)) return { run: false, why: "아직 차례 아님" };
  return { run: true };
}

export function nextRunAt(lastRunAt, intervalMinutes) {
  if (!lastRunAt) return null;
  return new Date(new Date(lastRunAt).getTime() + intervalMinutes * 60 * 1000).toISOString();
}
