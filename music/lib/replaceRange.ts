// 구간 다시 만들기(2026-10-21 Suno V6 2차 ④) 구간 검사. sunoapi.org /generate/replace-section 규칙:
// 시작 < 끝, 길이 10초 이상, 원곡 길이의 50% 이하, 소수 2자리.
export const REPLACE_MIN_SECONDS = 10;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function checkReplaceRange(start: number, end: number, duration: number | null): string | null {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "시작·끝 시간을 숫자로 입력해 주세요.";
  if (start < 0) return "시작 시간은 0초 이상이어야 합니다.";
  if (end <= start) return "끝 시간이 시작 시간보다 뒤여야 합니다.";
  if (end - start < REPLACE_MIN_SECONDS) return `구간은 ${REPLACE_MIN_SECONDS}초 이상이어야 합니다.`;
  if (duration) {
    if (end > duration) return `끝 시간이 곡 길이(${Math.floor(duration)}초)를 넘습니다.`;
    if (end - start > duration / 2) return `구간은 곡 길이의 절반(${Math.floor(duration / 2)}초) 이하여야 합니다.`;
  }
  return null;
}

/** 0:00 형식 표시 */
export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}
