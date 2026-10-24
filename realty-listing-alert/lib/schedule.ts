// 수집 간격·동작 시간대 판정(한국 시간) — 기준: real_estate_sales/src/lib/publicdata/schedule.ts 함수 그대로.
// 간격 목록만 주인님 결정(인수인계 D7)대로: 10·20·30·40·50분, 1~24시간. 3단계 확장 타이머도 같은 판정을 쓴다.

export const SHORT_INTERVALS = [10, 20, 30, 40, 50] as const;

export const COLLECT_INTERVAL_OPTIONS: { value: number; label: string }[] = [
  ...SHORT_INTERVALS.map((m) => ({ value: m, label: `${m}분` })),
  ...Array.from({ length: 24 }, (_, i) => ({ value: (i + 1) * 60, label: `${i + 1}시간` })),
];

export const DEFAULT_INTERVAL_MINUTES = 180;

export function isValidInterval(minutes: number): boolean {
  return COLLECT_INTERVAL_OPTIONS.some((o) => o.value === minutes);
}

/** 10~50분은 네이버 확인 화면·계정 일시 제한 위험 경고 대상(D7). */
export function isShortInterval(minutes: number): boolean {
  return minutes < 60;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function currentKstHour(now: Date = new Date()): number {
  return new Date(now.getTime() + KST_OFFSET_MS).getUTCHours();
}

export function isWithinActiveHours(kstHour: number, startHour: number | null, endHour: number | null): boolean {
  if (startHour === null || endHour === null) return true;
  if (startHour === endHour) return true; // 사실상 종일
  if (startHour < endHour) return kstHour >= startHour && kstHour < endHour;
  return kstHour >= startHour || kstHour < endHour; // 자정을 넘기는 경우(예: 22시~6시)
}

export function isCollectDue(lastRunAt: string | null, intervalMinutes: number, now: Date = new Date()): boolean {
  if (!lastRunAt) return true;
  return now.getTime() - new Date(lastRunAt).getTime() >= intervalMinutes * 60 * 1000;
}
