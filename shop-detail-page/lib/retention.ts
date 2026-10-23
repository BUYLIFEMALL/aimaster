// v1.15(2026-10-21, 이커머스 병합 E0): 생성 자료 30일 보관(루트 docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §0).
// 대상: 상품(분석 결과)·섹션 이미지·긴 PNG 기록 행과 그 저장소 파일, 상품 없이 남은 업로드 파일.
// 대상 아님: 회원이 만든 프롬프트 템플릿(shop_prompt_templates — 설정), 계정·키.

export const RETENTION_DAYS = 30;

// 정리 작업을 처음 켜는 v1.15 이전에 만든 자료(2026-09 작성분)는 바로 지우지 않고 30일 유예한다
// (2026-10-21 주인님 결정). 이 시각 전에는 정리 작업이 아무것도 지우지 않는다.
export const RETENTION_GRACE_END = "2026-11-21T00:00:00+09:00";
export const RETENTION_GRACE_END_LABEL = "2026년 11월 21일";

export function isInRetentionGrace(now: Date = new Date()): boolean {
  return now.getTime() < new Date(RETENTION_GRACE_END).getTime();
}

/** 이 시각보다 먼저 만든 생성 자료는 정리 작업이 지운다 */
export function retentionCutoff(now: Date = new Date(), days: number = RETENTION_DAYS): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}
