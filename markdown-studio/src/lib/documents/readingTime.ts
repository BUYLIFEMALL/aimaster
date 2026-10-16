// 2026-10-17 v1.12: 예상 읽기 시간 — 한국어 평균 약 500자/분(공백 제외 글자 기준), 1분 미만은 1분.
export const READ_CHARS_PER_MINUTE = 500;

export function readingMinutes(markdown: string): number {
  const chars = markdown.replace(/\s/g, "").length;
  return chars === 0 ? 0 : Math.max(1, Math.ceil(chars / READ_CHARS_PER_MINUTE));
}

export function readingLabel(markdown: string): string {
  const m = readingMinutes(markdown);
  return m === 0 ? "읽기 0분" : `약 ${m}분 소요`;
}
