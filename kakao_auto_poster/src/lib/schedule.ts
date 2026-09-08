// 예약(정기 자동 생성) 주기 판정 — trending-product-finder의 lib/schedule.ts와 동일한 패턴.
// Vercel Cron이 5분마다 깨워도(app/api/cron/generate-reports), 실제로 생성할 차례인지는
// 각 주제의 interval_minutes/last_run_at을 보고 이 함수로 판단한다.

export const SCHEDULE_INTERVAL_OPTIONS = [
  { value: 60, label: "1시간마다" },
  { value: 360, label: "6시간마다" },
  { value: 720, label: "12시간마다" },
  { value: 1440, label: "매일" },
  { value: 4320, label: "3일마다" },
  { value: 10080, label: "매주" },
] as const;

export function isScheduleDue(lastRunAt: string | null, intervalMinutes: number, now: Date = new Date()): boolean {
  if (!lastRunAt) return true;
  const elapsedMs = now.getTime() - new Date(lastRunAt).getTime();
  return elapsedMs >= intervalMinutes * 60 * 1000;
}
