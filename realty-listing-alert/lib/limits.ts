// 수집량 상한(2026-10-25 주인님 지시: 「문제 안 되게 상한선을 두고 사용자에게 공지」). 웹 예상 요청량 표시·수집 규칙 파일이 같은 값을 쓴다.
// 확장은 수집 규칙(/api/extension/collect-rules)으로 받으므로, 값을 바꾸면 웹만 배포하면 된다.
export const MAX_COMPLEXES_PER_RUN = 20; // 한 회차에 읽는 단지 수(넘으면 다음 회차로 돌아가며)
export const MAX_PAGES_PER_DAY = 300; // 하루 목록 페이지 수(넘으면 그날 쉼)
export const SCHEDULE_JITTER = 0.1; // 예약 시각 ±10% 흔들기
// 시험 계정 예외(2026-10-26 주인님 지시 「테스트 계정과 관리자 계정은 기준 규칙에서 제외」): 하루 페이지 상한만 빼고,
// 차단 화면이면 그날 멈춤·페이지 사이 쉬는 간격은 그대로. 서버가 수집 규칙에 noDailyLimit를 붙여 준다(옛 확장은 몰라서 300 유지).
export const LIMIT_EXEMPT_EMAILS = ["buylifemall@gmail.com", "buylifemall@naver.com"];
export function isLimitExempt(email: string | null | undefined) {
  return LIMIT_EXEMPT_EMAILS.includes(String(email ?? "").trim().toLowerCase());
}
export const AVG_PAGES_PER_COMPLEX = 2; // 예상량 계산용 평균(단지당 1~3페이지)

/** 감시 대상과 예약 설정으로 예상 요청량을 계산한다(화면 안내용). */
export function estimateLoad(
  targets: { target_type?: string | null; region_max_complexes?: number | null; enabled?: boolean }[],
  intervalMinutes: number,
  startHour: number | null,
  endHour: number | null,
) {
  const on = targets.filter((t) => t.enabled !== false);
  const complexes = on.reduce((n, t) => n + (t.target_type === "region" ? t.region_max_complexes ?? 5 : 1), 0);
  const perRun = Math.min(complexes, MAX_COMPLEXES_PER_RUN);
  const activeHours = startHour == null || endHour == null || startHour === endHour ? 24 : (endHour - startHour + 24) % 24;
  const runsPerDay = Math.max(1, Math.floor((activeHours * 60) / Math.max(60, intervalMinutes)));
  const pagesPerRun = perRun * AVG_PAGES_PER_COMPLEX + on.filter((t) => t.target_type === "region").length;
  const pagesPerDay = Math.min(pagesPerRun * runsPerDay, MAX_PAGES_PER_DAY);
  return { complexes, perRun, runsPerDay, pagesPerRun, pagesPerDay, overRun: complexes > MAX_COMPLEXES_PER_RUN, overDay: pagesPerRun * runsPerDay > MAX_PAGES_PER_DAY };
}
