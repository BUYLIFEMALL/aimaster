// v1.12 (BC-05, 2026-10-22): 회원 생성물 30일 보관 규칙 — 순수 함수(서버·시험 공용).
// 설정(settings)·내 블로그와 문체(blog)는 생성물이 아니라 보관한다. 나머지(키워드·자료·초안·최종본·이미지 작업 등)는 만든 지 30일 뒤 삭제.
export const RETENTION_DAYS = 30;
export const KEEP_KINDS = ["settings", "blog"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export function retentionCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - RETENTION_DAYS * DAY_MS).toISOString();
}

export const isKeptKind = (kind: string) => (KEEP_KINDS as readonly string[]).includes(kind);

/** 보관 중이면 true — 보관 종류이거나 만든 지 30일 안 */
export function isRetained(item: { kind: string; created_at: string }, now: Date = new Date()): boolean {
  if (isKeptKind(item.kind)) return true;
  const created = new Date(item.created_at).getTime();
  return Number.isFinite(created) && now.getTime() - created < RETENTION_DAYS * DAY_MS;
}

/** Supabase 조회 조건: 보관 종류이거나 30일 안 */
export function retainedFilter(now: Date = new Date()): string {
  return `kind.in.(${KEEP_KINDS.join(",")}),created_at.gt.${retentionCutoff(now)}`;
}

/** 이미지 폴더(회원/작업번호) 중 남아 있는 이미지 작업이 없는 것만 고른다 */
export function orphanJobFolders(folders: string[], liveJobIds: Set<string>): string[] {
  return folders.filter((folder) => !liveJobIds.has(folder));
}
