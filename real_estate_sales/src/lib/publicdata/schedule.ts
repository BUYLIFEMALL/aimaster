// 실시간 모니터링 주기/활성 시간대 판정 (한국 시간 기준).
// external cron(사용자가 등록한 무료 스케줄러)이 짧은 간격으로 dispatch를 계속 호출해도,
// 여기서 "이번엔 처리할 차례인가"를 걸러내서 실제 수집/분석/텔레그램 빈도를 제어한다.

export const COLLECT_INTERVAL_OPTIONS = [
  { value: 30, label: "30분마다" },
  { value: 60, label: "1시간마다" },
  { value: 180, label: "3시간마다" },
  { value: 360, label: "6시간마다" },
  { value: 720, label: "12시간마다" },
  { value: 1440, label: "24시간마다" },
] as const;

export type CollectIntervalMinutes = (typeof COLLECT_INTERVAL_OPTIONS)[number]["value"];

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function currentKstHour(now: Date = new Date()): number {
  return new Date(now.getTime() + KST_OFFSET_MS).getUTCHours();
}

export function isWithinActiveHours(
  kstHour: number,
  startHour: number | null,
  endHour: number | null,
): boolean {
  if (startHour === null || endHour === null) return true;
  if (startHour === endHour) return true; // 00~24, 사실상 종일
  if (startHour < endHour) {
    return kstHour >= startHour && kstHour < endHour;
  }
  // 자정을 넘기는 경우 (예: 22시~6시)
  return kstHour >= startHour || kstHour < endHour;
}

export function isCollectDue(
  lastRunAt: string | null,
  intervalMinutes: number,
  now: Date = new Date(),
): boolean {
  if (!lastRunAt) return true;
  const elapsedMs = now.getTime() - new Date(lastRunAt).getTime();
  return elapsedMs >= intervalMinutes * 60 * 1000;
}
