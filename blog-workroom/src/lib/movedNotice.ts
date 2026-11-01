// 2026-11-01 블로그 9→5 정리: 기능을 다른 프로그램으로 옮긴 원본 화면 위 「이동 안내」 띠의 닫기 판단(작업실·콘텐츠 제작·올인원 공통 사본).
// 닫으면 이 브라우저에만 시각을 기억하고 7일 뒤 다시 보인다. 실행 시점 import 없음(시험 공용).
export const MOVED_NOTICE_KEY = "aimaster_moved_notice_hidden_at";
export const MOVED_NOTICE_HIDE_DAYS = 7;

export function isMovedNoticeHidden(hiddenAt: string | null, now: number = Date.now()): boolean {
  const at = Number(hiddenAt);
  return Number.isFinite(at) && at > 0 && at <= now && now - at < MOVED_NOTICE_HIDE_DAYS * 86_400_000;
}
