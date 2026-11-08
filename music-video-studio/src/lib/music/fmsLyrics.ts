// AI 무료음악 자동화 가사 시간(lyric_timing.cues) → 줄 시간(가사 영상 v1.13 `src/lib/fmsLyrics.ts` 사본, 플레이리스트 v1.35·뮤직비디오 v1.28 D-1, 외부 호출 없음)
export type FmsCue = { text?: string; start?: number | null; end?: number | null };
export interface FmsTimedLine { start: number; end: number; text: string }

/** 시각이 있는 줄만 — 끝 시각이 없으면 다음 줄 시작(마지막 줄은 곡 길이, 그것도 없으면 4초 뒤)까지 */
export function fmsTimedLines(timing: { cues?: FmsCue[] } | null | undefined, duration: number | null): FmsTimedLine[] | null {
  const cues = (timing?.cues ?? []).filter((c) => typeof c.text === "string" && c.text.trim() && typeof c.start === "number" && Number.isFinite(c.start));
  if (!cues.length) return null;
  return cues.map((c, i) => {
    const start = c.start as number;
    const next = cues[i + 1]?.start;
    const fallback = typeof next === "number" ? next : duration && duration > start ? duration : start + 4;
    const end = typeof c.end === "number" && c.end > start ? c.end : fallback;
    return { start, end, text: (c.text as string).trim() };
  });
}
