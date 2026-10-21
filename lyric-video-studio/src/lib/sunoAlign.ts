// v1.05 Suno 시간 가사(get-timestamped-lyrics의 alignedWords) → 줄 단위 가사 시간표.
// 단어 안에 줄바꿈(\n)과 구간 표시([Verse 1])가 섞여 온다(2026-10-21 실제 응답 확인: "[Verse 1]\n비 ", "서서\n").
// 시험(node --test)이 이 파일을 바로 읽으므로 다른 파일을 불러오지 않는다.
export interface SunoWord { word: string; startS: number; endS: number; success?: boolean }
export interface TimedLine { id: string; start: number; end: number; text: string }

let seq = 0;
const newId = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;
const TAG = /\[[^\]\n]*\]/g; // [Verse 1] · [Chorus] 같은 구간 표시
const MAX_LINES = 400;

/** 단어 목록을 줄로 묶는다. 줄 시작 = 그 줄 첫 단어 시작, 끝 = 마지막 단어 끝. 글자가 없는 줄(구간 표시만)은 버린다 */
export function linesFromAlignedWords(words: SunoWord[]): TimedLine[] {
  const out: TimedLine[] = [];
  let text = "", start = -1, end = -1;
  const close = () => {
    const t = text.replace(TAG, "").replace(/\s+/g, " ").trim();
    if (t && start >= 0) out.push({ id: newId(), start, end: Math.max(end, start + 0.2), text: t });
    text = ""; start = -1; end = -1;
  };
  for (const w of words) {
    if (typeof w?.word !== "string" || !Number.isFinite(w.startS) || !Number.isFinite(w.endS)) continue;
    const parts = w.word.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) close(); // 줄바꿈마다 앞 줄을 닫는다
      if (part.replace(TAG, "").trim()) {
        if (start < 0) start = w.startS;
        end = w.endS;
      }
      text += part;
    });
  }
  close();
  out.sort((a, b) => a.start - b.start);
  return out.slice(0, MAX_LINES);
}

/** 시간 가사를 받지 못했을 때 쓰는 가사 글 — 구간 표시 줄·빈 줄을 뺀다(시간은 싱크 화면에서 맞춤) */
export function plainSunoLyrics(prompt: string): string {
  return prompt.split(/\r?\n/).map((l) => l.replace(TAG, "").trim()).filter(Boolean).join("\n");
}
