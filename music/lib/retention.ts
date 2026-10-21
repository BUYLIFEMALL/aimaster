// 생성 콘텐츠 30일 보관(최상위 규칙 — 회원 생성 데이터는 생성일 기준 30일 후 자동 삭제).
// 2026-10-21 주인님 결정: 기존 곡에도 적용하되 7일 유예 — 이미 30일이 지난 곡도 2026-10-28(한국 시간) 밤까지는 지우지 않는다.
// 화면의 「자동 삭제 D-n」 표시(서버·화면 공용)와 정리 작업(app/api/cron/cleanup)이 같은 규칙을 쓴다.
export const RETENTION_DAYS = 30;
export const RETENTION_GRACE_UNTIL = "2026-10-28T14:59:59Z"; // 2026-10-28 23:59:59 KST

/** 이 항목이 자동 삭제되는 시각(생성 + 30일, 단 유예 마감보다 앞서지 않음). */
export function retentionDeleteAt(createdAt: string): Date {
  const byAge = new Date(new Date(createdAt).getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const grace = new Date(RETENTION_GRACE_UNTIL);
  return byAge > grace ? byAge : grace;
}

/** 남은 일수(오늘 지워지면 0). */
export function retentionDaysLeft(createdAt: string, now = new Date()): number {
  return Math.max(0, Math.ceil((retentionDeleteAt(createdAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

/** 정리 작업이 지울 기준: 생성 시각이 이 값 이하인 행(유예 기간 중에는 null — 아무것도 지우지 않음). */
export function retentionCutoff(now = new Date()): Date | null {
  if (now <= new Date(RETENTION_GRACE_UNTIL)) return null;
  return new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
