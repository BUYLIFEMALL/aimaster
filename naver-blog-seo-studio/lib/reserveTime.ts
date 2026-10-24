// 2026-10-24 예약 포스팅(블로그 핵심 지침 ③ⓒ): 네이버 예약 시각 규칙. naver-blog-agent `scheduleSlots.validateReservation`과 같은 규칙
// (10분 단위, 확장이 입력할 시간을 남기려고 지금부터 20분 이후). 외부 호출 없음.
export const RESERVE_STEP_MINUTES = 10;
export const RESERVE_MIN_LEAD_MINUTES = 20;
const STEP_MS = RESERVE_STEP_MINUTES * 60_000;

export function checkReserveTime(value: unknown, now: number = Date.now()): { ok: true; at: string } | { ok: false; error: string } {
  const time = typeof value === "string" ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(time)) return { ok: false, error: "예약 날짜와 시각을 확인해 주세요." };
  if (time % STEP_MS !== 0) return { ok: false, error: `예약 시각은 ${RESERVE_STEP_MINUTES}분 단위로 정해 주세요(예: 14:10, 14:20).` };
  if (time < now + RESERVE_MIN_LEAD_MINUTES * 60_000) return { ok: false, error: `예약 시각은 지금부터 ${RESERVE_MIN_LEAD_MINUTES}분 이후로 정해 주세요.` };
  return { ok: true, at: new Date(time).toISOString() };
}
