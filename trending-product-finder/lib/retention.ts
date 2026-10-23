// v1.13: 생성 자료 30일 보관(루트 docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §0). 2026-10-17 주인님 승인.
// 대상: AI 리포트·쇼핑인사이트 스냅샷·11번가 경쟁 수집 결과(삭제), 소싱 알림 비교 캐시(값만 비움).
// 대상 아님: 관심 키워드·알림 설정(trend_watchlist 행), ⭐ 관심 상품(sourcing_saved_products — 회원이 고른 찜 목록, A안), 계정·키·연동.

export const RETENTION_DAYS = 30;

/** 이 시각보다 오래된 생성 자료는 만료(화면에서 숨기고 정리 작업이 지운다) */
export function retentionCutoff(now: Date = new Date(), days: number = RETENTION_DAYS): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}
