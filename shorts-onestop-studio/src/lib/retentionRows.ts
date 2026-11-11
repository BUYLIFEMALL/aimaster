// 30일 자동 정리 대상 DB 행(2026-11-11 주인님 최종: 일반 회원은 발행 여부와 상관없이 30일, 관리자·시험·저장 구독 회원은 retention_exempt로 제외).
// 생성 콘텐츠(대본 project·발행 계획 plan)만 지운다. 프리셋·카테고리 지침·설정은 회원 설정이라 지우지 않는다.
// 기준은 마지막 수정일(updated_at) — 지금 고치고 있는 대본이 지워지지 않게.
export const EXPIRING_KINDS = ["project", "plan"] as const;
export const ROW_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** 이 시각보다 오래 손대지 않은 행이 정리 대상 */
export function rowCutoffIso(now: number): string {
  return new Date(now - ROW_TTL_MS).toISOString();
}
