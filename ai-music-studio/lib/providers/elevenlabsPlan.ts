// ElevenLabs Eleven Music v2/v2.5 작곡 계획(composition_plan) — 2026-10-23 공식 문서(api-reference/music/compose) 기준.
// { chunks: [{ text, duration_ms(3000~120000), positive_styles, negative_styles? }] }, text는 「[구간]\n가사 줄」(최대 30줄, 줄당 200자).
// 가사 구간([Verse]·[Chorus] …)마다 청크 하나, 전체 길이는 가사 줄 수에 비례해 나눈다. 순수 함수(서버·시험 공용).

export interface PlanChunk { text: string; duration_ms: number; positive_styles: string[]; negative_styles: string[] }
export interface CompositionPlan { chunks: PlanChunk[] }

const TAG = /^\s*\[([^\]]{1,100})\]\s*$/;
const MIN_MS = 3000, MAX_MS = 120_000, MAX_CHUNKS = 16;

/** 곡 설명을 짧은 스타일 문구 목록으로(쉼표·마침표 기준, 최대 6개) */
export function stylesFrom(prompt: string): string[] {
  const parts = prompt.split(/[,，、.\n]/).map((s) => s.trim()).filter((s) => s.length >= 2).map((s) => s.slice(0, 60));
  return (parts.length ? parts : [prompt.trim().slice(0, 60) || "pop"]).slice(0, 6);
}

/** 가사에 구간 표시가 하나 이상 있고 가사 줄이 있으면 작곡 계획을 만든다. 아니면 null(설명 방식으로 보냄) */
export function buildCompositionPlan(lyrics: string, prompt: string, totalSeconds: number): CompositionPlan | null {
  const rows = lyrics.replace(/\r\n/g, "\n").split("\n");
  if (!rows.some((r) => TAG.test(r))) return null;
  const sections: { tag: string; lines: string[] }[] = [];
  for (const row of rows) {
    const m = TAG.exec(row);
    if (m) { sections.push({ tag: m[1].trim(), lines: [] }); continue; }
    const line = row.trim();
    if (!line) continue;
    if (!sections.length) sections.push({ tag: "Verse", lines: [] });
    sections[sections.length - 1].lines.push(line.slice(0, 200));
  }
  const used = sections.slice(0, MAX_CHUNKS).map((s) => ({ ...s, lines: s.lines.slice(0, 30) }));
  if (!used.some((s) => s.lines.length)) return null;

  // 가사 없는 구간([Intro]·[Outro] 연주)은 줄 2개 무게로 친다
  const weight = (s: { lines: string[] }) => Math.max(2, s.lines.length);
  const totalW = used.reduce((a, s) => a + weight(s), 0);
  const totalMs = Math.max(MIN_MS * used.length, Math.round(totalSeconds * 1000));
  const styles = stylesFrom(prompt);
  return {
    chunks: used.map((s) => ({
      text: [`[${s.tag}]`, ...s.lines].join("\n"),
      duration_ms: Math.min(MAX_MS, Math.max(MIN_MS, Math.round((totalMs * weight(s)) / totalW))),
      positive_styles: styles,
      negative_styles: [],
    })),
  };
}

export const planSeconds = (plan: CompositionPlan) => Math.round(plan.chunks.reduce((a, c) => a + c.duration_ms, 0) / 1000);
