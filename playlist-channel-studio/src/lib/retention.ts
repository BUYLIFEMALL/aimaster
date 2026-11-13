// v1.41 생성 자료 30일 보관(최상위 규칙 — 회원 생성 데이터는 만든 날로부터 30일 뒤 자동 삭제, 발행 여부와 상관없음).
// 정리 작업(app/api/cron/cleanup)과 화면 안내가 같은 규칙을 쓴다. 관리자·시험 계정(profiles.retention_exempt)은 정리 라우트에서 뺀다.
// 플랜: docs/PLAN_20261113_RETENTION_30D.md
export const RETENTION_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

/** 정리 작업이 지울 기준: 이 시각 이하에 만든 자료 */
export function retentionCutoff(now = new Date()): Date {
  return new Date(now.getTime() - RETENTION_DAYS * DAY);
}

/** 프로젝트 썸네일 저장 경로(lib/projects.ts thumbPath와 같은 규칙 — 정리 라우트에서 server-only 없이 쓰려고 따로 둠) */
export function projectThumbPaths(rows: { id: string; user_id: string; thumb_path: string | null }[]): string[] {
  const paths = new Set<string>();
  for (const r of rows) {
    paths.add(`${r.user_id}/${r.id}/thumb.jpg`);
    if (r.thumb_path) paths.add(r.thumb_path);
  }
  return Array.from(paths);
}
