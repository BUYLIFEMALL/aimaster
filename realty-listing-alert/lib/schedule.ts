// 수집 간격·동작 시간대 판정(한국 시간) — 기준: real_estate_sales/src/lib/publicdata/schedule.ts 함수 그대로.
// 간격 목록: 1~24시간(2026-10-25 주인님 지시로 10~50분 선택을 없앰 — 네이버 확인 화면·계정 제한 위험을 줄이려고.
// 원래 인수인계 D7은 10·20·30·40·50분 포함이었다). 확장 타이머도 같은 판정을 쓰고, 1시간 미만 값이 오면 1시간으로 올려 쓴다.

export const MIN_INTERVAL_MINUTES = 60;

export const COLLECT_INTERVAL_OPTIONS: { value: number; label: string }[] = Array.from({ length: 24 }, (_, i) => ({ value: (i + 1) * 60, label: `${i + 1}시간` }));

export const DEFAULT_INTERVAL_MINUTES = 180;

export function isValidInterval(minutes: number): boolean {
  return COLLECT_INTERVAL_OPTIONS.some((o) => o.value === minutes);
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
