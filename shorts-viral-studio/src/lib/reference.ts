// v1.30 레퍼런스 문장 베끼기 방지(순수 함수) — 「🎬 레퍼런스 쇼츠에서 대본 따기」(v1.29)가 참고 자료에 넣은 블록만 대상.
// 사실(숫자·고유명사)은 같아도 되지만, 연속 n어절 이상 같은 표현은 베낀 것으로 본다.

export const REF_MARK = "[레퍼런스 쇼츠 대본";
export const COPY_WORDS = 6;

/** 참고 자료에서 레퍼런스 쇼츠 블록의 본문(첫 줄 표시 다음부터 다음 블록 전까지)만 모은다 */
export function referenceBlocks(reference: string): string {
  return reference
    .split(/\n\n(?=\[)/)
    .filter((b) => b.trimStart().startsWith(REF_MARK))
    .map((b) => b.split("\n").slice(1).join("\n").trim())
    .filter(Boolean)
    .join("\n");
}

/** 어절 단위로 — 문장 부호를 걷어내고 공백으로 나눈다 */
export function words(text: string): string[] {
  return text.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
}

/** 대본 문장들 중 레퍼런스와 연속 n어절 이상 같은 구절(겹치는 구간을 이어 붙여 하나로, 최대 10개) */
export function copiedPhrases(texts: string[], ref: string, n = COPY_WORDS): string[] {
  const rw = words(ref);
  if (rw.length < n) return [];
  const grams = new Set<string>();
  for (let i = 0; i + n <= rw.length; i++) grams.add(rw.slice(i, i + n).join(" "));
  const out: string[] = [];
  for (const t of texts) {
    const w = words(t);
    let i = 0;
    while (i + n <= w.length) {
      if (!grams.has(w.slice(i, i + n).join(" "))) { i++; continue; }
      let end = i + n; // 겹치는 구간을 끝까지 늘린다
      while (end < w.length && grams.has(w.slice(end - n + 1, end + 1).join(" "))) end++;
      const phrase = w.slice(i, end).join(" ");
      if (!out.includes(phrase)) out.push(phrase);
      i = end;
    }
  }
  return out.slice(0, 10);
}

/** v1.31 검사 대상 — 기본은 레퍼런스 쇼츠 블록만, all이면 참고 자료 전체(블록 첫 줄의 표시 문구는 뺌) */
export function guardText(reference: string, all = false): string {
  if (!all) return referenceBlocks(reference);
  return reference.split("\n").filter((l) => !l.trimStart().startsWith(REF_MARK)).join("\n").trim();
}

/** v1.31 한 장면 글에 검사 대상과 겹치는 구절이 있는지(화면 노란 테두리용) */
export function hasCopy(text: string, ref: string): boolean {
  return !!ref && copiedPhrases([text], ref).length > 0;
}

/** v1.32 다른 프로그램(INSTA 떡상 리메이크)이 원스톱 주제 화면에 넘기는 레퍼런스 대사 — 주소 # 뒤에 실어 서버로 보내지 않는다 */
export const REF_HASH = "ref-transcript";
export const REF_HANDOFF_MAX = 12000;

export function refHandoffHash(transcript: string): string {
  return `#${REF_HASH}=${encodeURIComponent(transcript.trim().slice(0, REF_HANDOFF_MAX))}`;
}

export function readRefHandoff(hash: string): string {
  const prefix = `#${REF_HASH}=`;
  if (!hash.startsWith(prefix)) return "";
  try {
    return decodeURIComponent(hash.slice(prefix.length)).trim().slice(0, REF_HANDOFF_MAX);
  } catch {
    return "";
  }
}
