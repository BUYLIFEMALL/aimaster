// kakao_auto_poster의 lib/schedule.ts와 동일한 판정 로직 — 서브프로젝트는 서로 자기완결적
//이어야 한다는 원칙에 따라 import 대신 복제했다. 이 프로젝트는 "동작 시간대" 제한까지는
// 요청받지 않아 주기(interval_minutes) 판정만 가져왔다.
export function isScheduleDue(lastRunAt: string | null, intervalMinutes: number, now: Date = new Date()): boolean {
  if (!lastRunAt) return true;
  const elapsedMs = now.getTime() - new Date(lastRunAt).getTime();
  return elapsedMs >= intervalMinutes * 60 * 1000;
}

export const SCHEDULE_INTERVAL_OPTIONS = [
  { value: 60, label: "1시간마다" },
  { value: 360, label: "6시간마다" },
  { value: 720, label: "12시간마다" },
  { value: 1440, label: "매일" },
  { value: 10080, label: "매주" },
] as const;
