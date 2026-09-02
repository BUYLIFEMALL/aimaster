// 예약 소싱 알림(Phase 12) 주기 판정 — real_estate_sales의 lib/publicdata/schedule.ts와
// 동일한 패턴. Vercel Cron이 5분마다 깨워도, 실제로 발송할 차례인지는 여기서 각 관심
// 키워드별 sourcing_alert_interval_minutes/sourcing_alert_last_run_at을 보고 판단한다.

export const ALERT_INTERVAL_OPTIONS = [
  { value: 60, label: "1시간마다" },
  { value: 180, label: "3시간마다" },
  { value: 360, label: "6시간마다" },
  { value: 720, label: "12시간마다" },
  { value: 1440, label: "매일" },
] as const;

export type AlertIntervalMinutes = (typeof ALERT_INTERVAL_OPTIONS)[number]["value"];

export function isAlertDue(lastRunAt: string | null, intervalMinutes: number, now: Date = new Date()): boolean {
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
