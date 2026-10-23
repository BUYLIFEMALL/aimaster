// v1.19 30일 자동 삭제(최상위 규칙: 회원 생성 데이터는 생성일 기준 30일 후 삭제) — 순수 계산(시험: tests/tmb.test.mjs).
// 정리 경로: /api/cron/cleanup(Vercel Cron 매일 03:50 KST). 이미지 저장 경로는 `<회원 id>/<프로젝트 id>/<a|b>-<uuid>.jpg`.

export const RETENTION_DAYS = 30;
/** 정리 결과 기록(usage_logs.action) — YOUTUBE Shots v1.37과 같은 이름이라 메인 관리자 화면이 함께 합산한다 */
export const CLEANUP_ACTION = "cleanup_expired";

export function retentionCutoff(now = Date.now()): string {
  return new Date(now - RETENTION_DAYS * 86_400_000).toISOString();
}

/** 프로젝트 이미지 폴더(기록에 없는 남은 파일까지 폴더째 지우기 위해) */
export function projectFolder(userId: string, projectId: string): string {
  return `${userId}/${projectId}`;
}

/** images_a/images_b(jsonb `{versions:[{path}]}`)에서 저장 경로만 — 이상한 값은 건너뜀 */
export function imagePathsOf(row: { images_a?: unknown; images_b?: unknown }): string[] {
  const out: string[] = [];
  for (const set of [row.images_a, row.images_b]) {
    const versions = (set && typeof set === "object" ? (set as { versions?: unknown }).versions : null);
    if (!Array.isArray(versions)) continue;
    for (const v of versions) {
      const p = v && typeof v === "object" ? (v as { path?: unknown }).path : null;
      if (typeof p === "string" && p) out.push(p);
    }
  }
  return out;
}

/** 회원별 지운 프로젝트·이미지 개수 */
export function cleanupByUser(items: { userId: string; images: number }[]): Record<string, { projects: number; images: number }> {
  const out: Record<string, { projects: number; images: number }> = {};
  for (const it of items) {
    const c = (out[it.userId] ??= { projects: 0, images: 0 });
    c.projects += 1;
    c.images += it.images;
  }
  return out;
}
