import type { TrackMeta } from "./types";

/** MP-07(2026-10-17): 이 비율 이상이면 "저장 공간이 거의 찼어요" 경고 */
export const STORAGE_WARN_RATIO = 0.8;

/** 브라우저 저장 사용 비율(0~100, 정수). 알 수 없으면 null */
export function usagePercent(usage: { usage: number; quota: number } | null): number | null {
  if (!usage || !(usage.quota > 0) || !(usage.usage >= 0)) return null;
  return Math.min(100, Math.round((usage.usage / usage.quota) * 100));
}

export function isStorageNearlyFull(usage: { usage: number; quota: number } | null): boolean {
  const p = usagePercent(usage);
  return p !== null && p >= STORAGE_WARN_RATIO * 100;
}

/** 용량이 큰 곡부터 n개(같은 크기면 먼저 추가한 곡 먼저). 크기를 모르는 곡(0)은 제외 */
export function largestTracks(tracks: TrackMeta[], n = 5): TrackMeta[] {
  return tracks
    .filter((t) => t.size > 0)
    .slice()
    .sort((a, b) => b.size - a.size || a.addedAt - b.addedAt)
    .slice(0, n);
}
