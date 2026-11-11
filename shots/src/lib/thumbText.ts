// v1.49 썸네일 제목 줄나누기(화면과 무관한 순수 함수) — 최대 2줄, 띄어쓰기 기준으로 두 줄 길이가 가장 비슷하게.
// 시험: tests/thumbText.test.mjs

export const THUMB_MAX_CHARS = 30;

export function splitThumbTitle(title: string): string[] {
  const t = title.replace(/\s+/g, " ").trim().slice(0, THUMB_MAX_CHARS);
  if (!t) return [];
  const words = t.split(" ");
  if (t.length <= 12 || words.length < 2) return [t];
  let best: string[] = [t];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) { bestDiff = diff; best = [a, b]; }
  }
  return best;
}
