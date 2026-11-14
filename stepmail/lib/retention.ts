// 2026-11-13: 생성 자료 30일 보관(루트 docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §0, 기준 구현 shop-detail-page/lib/retention.ts).
// 대상: 발송 기록(stepmail_send_log), 캠페인이 쓰지 않는 이메일 초안(stepmail_email_drafts), 초안이 쓰지 않는 stepmail-images 파일.
// 대상 아님: 리드(stepmail_leads — 회원이 직접 올린 연락처 명부, 2026-11-14 주인님 결정으로 예외·회원별 보관)·캠페인 설정·발송 계정·키.

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
