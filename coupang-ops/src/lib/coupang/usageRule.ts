// 쿠팡 호출 수 규칙(C9-1) — 계산만, 외부 호출 없음(tests/usage.test.mjs).
// 모든 호출이 운영자 Fixie를 거친다. 2026-10-31 확인 요금제 Tricycle 월 500회. 값은 환경변수로 바꿀 수 있다.
// 집계는 쿠팡 호출만이고 토스 연동은 들어가지 않으며, 달은 한국 달력 기준이라 Fixie 초기화 날짜와 다를 수 있다.

export const DEFAULT_MONTHLY_LIMIT = 500;
export const DEFAULT_DAILY_LIMIT = 100;
export const WARN_RATIO = 0.7;
export const STOP_RATIO = 0.95;

const KST_MS = 9 * 3_600_000;

export function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** 한국 날짜 yyyy-MM-dd */
export const kstDay = (nowMs: number) => new Date(nowMs + KST_MS).toISOString().slice(0, 10);
export const kstMonth = (nowMs: number) => kstDay(nowMs).slice(0, 7);
/** 한국 날짜 0시의 ISO 시각 */
export const kstDayStartIso = (nowMs: number) => new Date(`${kstDay(nowMs)}T00:00:00+09:00`).toISOString();
export const kstMonthStartIso = (nowMs: number) => new Date(`${kstMonth(nowMs)}-01T00:00:00+09:00`).toISOString();

export type UsageCounts = { today: number; month: number; dailyLimit: number; monthlyLimit: number };

/** 선택 조회를 막을 사유. 막지 않으면 빈 문자열. 전체 한도를 먼저 본다 */
export function budgetMessage(u: UsageCounts): string {
  if (u.month >= Math.floor(u.monthlyLimit * STOP_RATIO)) return "이번 달 쿠팡 호출 여유가 거의 없어 점검·목록 조회를 잠시 멈췄습니다. 주문·송장 처리는 계속 쓸 수 있습니다. 운영자에게 알려 주세요.";
  if (u.today >= u.dailyLimit) return `오늘 쓸 수 있는 쿠팡 호출 ${u.dailyLimit}회를 모두 썼습니다. 내일 다시 시도해 주세요. 주문·송장 처리는 계속 쓸 수 있습니다.`;
  return "";
}

export const reachedWarning = (month: number, monthlyLimit: number) => month >= Math.floor(monthlyLimit * WARN_RATIO);
export const warningTitle = (nowMs: number) => `쿠팡 운영 자동화: Fixie 호출 70% 도달(${kstMonth(nowMs)})`;
