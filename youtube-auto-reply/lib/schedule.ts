// 예약 모니터링 주기 판정. real_estate_sales/src/lib/publicdata/schedule.ts의
// isCollectDue()와 동일한 패턴 — 단일 Vercel Cron이 5분마다 깨우고, 사용자별
// monitoring_interval_minutes/last_run_at을 보고 "이번엔 처리할 차례인가"를 여기서 거른다.

export const MONITORING_INTERVAL_OPTIONS = [
  { value: 5, label: "5분" },
  { value: 10, label: "10분" },
  { value: 30, label: "30분" },
  { value: 60, label: "1시간" },
  { value: 120, label: "2시간" },
  { value: 180, label: "3시간" },
  { value: 240, label: "4시간" },
  { value: 300, label: "5시간" },
  { value: 360, label: "6시간" },
  { value: 720, label: "12시간" },
  { value: 1440, label: "24시간(1일)" },
] as const;

export function isMonitoringDue(lastRunAt: string | null, intervalMinutes: number, now: Date = new Date()): boolean {
  if (!lastRunAt) return true;
  const elapsedMs = now.getTime() - new Date(lastRunAt).getTime();
  return elapsedMs >= intervalMinutes * 60 * 1000;
}
