// 2026-11-13: 생성 자료 30일 보관(루트 docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §0, 기준 구현 shop-detail-page/lib/retention.ts).
// 대상: 게시글 기록(ncafe_posts)과 그 글이 가리키던 post-images 파일, 게시글 후보(ncafe_candidates).
// 대상 아님: 네이버 연결 계정·게시판(ncafe_targets)·카테고리·정기 수집 설정, 키·연동 정보.

export const RETENTION_DAYS = 30;

// 정리 작업을 처음 켜므로 기존 자료는 바로 지우지 않고 약 30일 유예한다. 이 시각 전에는 아무것도 지우지 않는다.
export const RETENTION_GRACE_END = "2026-12-14T00:00:00+09:00";
export const RETENTION_GRACE_END_LABEL = "2026년 12월 14일";

export function isInRetentionGrace(now: Date = new Date()): boolean {
  return now.getTime() < new Date(RETENTION_GRACE_END).getTime();
}

/** 이 시각보다 먼저 만든 생성 자료는 정리 작업이 지운다 */
export function retentionCutoff(now: Date = new Date(), days: number = RETENTION_DAYS): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}
