// BC-05 (2026-10-22): 보관함 글·이미지 30일 보관 규칙 — 순수 함수(서버·시험 공용).
// 글(aio_posts)은 만든 지 30일 뒤 삭제하고, 이미지 파일은 30일이 지났고 남은 글 어디에도 쓰이지 않으면 삭제한다.
// 카테고리(aio_categories)는 설정이라 보관한다.
export const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function retentionCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - RETENTION_DAYS * DAY_MS).toISOString();
}

export function isExpired(createdAt: string | null | undefined, now: Date = new Date()): boolean {
  const created = new Date(createdAt ?? "").getTime();
  return Number.isFinite(created) && now.getTime() - created >= RETENTION_DAYS * DAY_MS;
}

/** 지울 이미지 파일: 30일이 지났고 남은 글이 쓰지 않는 것만(올린 시각을 모르면 지우지 않음) */
export function expiredOrphanFiles(files: { path: string; createdAt: string | null | undefined }[], usedPaths: Set<string>, now: Date = new Date()): string[] {
  return files.filter((f) => !usedPaths.has(f.path) && isExpired(f.createdAt, now)).map((f) => f.path);
}
