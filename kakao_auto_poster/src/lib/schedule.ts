// 예약(정기 자동 생성) 주기 판정 — trending-product-finder의 lib/schedule.ts와 동일한 패턴.
// Vercel Cron이 5분마다 깨워도(app/api/cron/generate-reports), 실제로 생성할 차례인지는
// 각 주제의 interval_minutes/last_run_at을 보고 이 함수로 판단한다.

// trending-product-finder의 ALERT_INTERVAL_OPTIONS(예약 소싱 알림)와 동일한 목록으로
// 맞췄다 — 두 프로젝트의 예약 주기 선택지가 서로 다르면 혼란스럽다는 피드백 반영.
export const SCHEDULE_INTERVAL_OPTIONS = [
  { value: 60, label: "1시간마다" },
  { value: 180, label: "3시간마다" },
  { value: 360, label: "6시간마다" },
  { value: 720, label: "12시간마다" },
  { value: 1440, label: "매일" },
] as const;

// trending-product-finder의 ALERT_CHANNEL_OPTIONS와 동일한 성격의 "알림 채널 칩". 카카오톡을
// 켜면 리포트 생성 즉시 검토 없이 바로 카카오로 발행된다(사용자 명시 지시, 2026-09-08 —
// 처음엔 "카카오는 승인 필요 액션이라 제외"로 설계했으나, 채널로 명시적으로 켜고 끄고 싶다는
// 요청에 따라 포함시킴). 텔레그램/이메일은 그대로 순수 알림.
export const NOTIFY_CHANNEL_OPTIONS = [
  { value: "kakao", label: "💬 카카오톡" },
  { value: "telegram", label: "📨 텔레그램" },
  { value: "email", label: "📧 이메일" },
] as const;

export type NotifyChannel = (typeof NOTIFY_CHANNEL_OPTIONS)[number]["value"];

export function isScheduleDue(lastRunAt: string | null, intervalMinutes: number, now: Date = new Date()): boolean {
  if (!lastRunAt) return true;
  const elapsedMs = now.getTime() - new Date(lastRunAt).getTime();
  return elapsedMs >= intervalMinutes * 60 * 1000;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function currentKstHour(now: Date = new Date()): number {
  return new Date(now.getTime() + KST_OFFSET_MS).getUTCHours();
}

/** real_estate_sales의 "동작 시간대" 판정과 동일한 규칙(자정을 넘기는 구간도 지원). */
export function isWithinActiveHours(kstHour: number, startHour: number | null, endHour: number | null): boolean {
  if (startHour === null || endHour === null) return true;
  if (startHour === endHour) return true; // 00~24, 사실상 종일
  if (startHour < endHour) return kstHour >= startHour && kstHour < endHour;
  return kstHour >= startHour || kstHour < endHour; // 자정을 넘기는 경우 (예: 22시~6시)
}
