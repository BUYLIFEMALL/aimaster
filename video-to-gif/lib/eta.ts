// v1.28: 변환 남은 시간 어림(화면과 무관한 순수 함수). 시작 뒤 걸린 시간 × (남은 % ÷ 끝난 %).
// 처음 3초·5% 전에는 값이 크게 흔들려 보여 주지 않는다.

/** 남은 초(올림). 아직 어림하기 이르면 null */
export function etaSeconds(startedAt: number | undefined, progress: number, now: number): number | null {
  if (!startedAt || progress < 5 || progress >= 100) return null;
  const elapsed = (now - startedAt) / 1000;
  if (elapsed < 3) return null;
  return Math.max(1, Math.ceil((elapsed * (100 - progress)) / progress));
}

/** 「약 12초」「약 1분 5초」 — null이면 「계산 중」 */
export function etaText(seconds: number | null): string {
  if (seconds == null) return "남은 시간 계산 중";
  if (seconds < 60) return `약 ${seconds}초 남음`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `약 ${m}분 ${s}초 남음` : `약 ${m}분 남음`;
}
