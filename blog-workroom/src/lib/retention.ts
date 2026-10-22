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

/** 2026-10-23: 공개 주소에서 이 회원·이 작업 폴더의 저장 경로만 꺼낸다(다른 회원·다른 버킷 주소면 null) — 이미지를 다시 만들 때 옛 파일 삭제용 */
export function jobImagePath(url: string | null | undefined, bucket: string, userId: string, jobId: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const at = url.indexOf(marker);
  if (at < 0) return null;
  const path = decodeURIComponent(url.slice(at + marker.length).split("?")[0]);
  return path.startsWith(`${userId}/${jobId}/`) && !path.includes("..") ? path : null;
}
