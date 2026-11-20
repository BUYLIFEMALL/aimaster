// v1.30 레퍼런스 문장 베끼기 방지(순수 함수) — 「🎬 레퍼런스 쇼츠에서 대본 따기」(v1.29)가 참고 자료에 넣은 블록만 대상.
// 사실(숫자·고유명사)은 같아도 되지만, 연속 n어절 이상 같은 표현은 베낀 것으로 본다.

// 2026-11-20(MOV-ONESTOP-HANDOFF-UNICODE): 대사·보낸 곳 이름 자르기(같은 함수가 productShorts.ts에도 있음 — 확장자 없는 import를 피하려고 각 파일에 둠)
// JS slice는 UTF-16 단위라 이모지 한가운데서 자르면 반쪽(U+D800~U+DBFF)이 남고, 그대로 encodeURIComponent하면 URIError로 멈춘다.
// → 자른 끝이 반쪽 글자면 그 한 칸을 뺀다(제한 길이 값은 그대로).
// A2(맥미니 P2): 입력 안의 짝 없는 반쪽도 자르기 전에 모두 뺀다(정상 쌍은 그대로) — productShorts.ts dropLoneSurrogates와 같은 동작
function dropLoneSurrogates(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const n = s.charCodeAt(i + 1);
      if (n >= 0xdc00 && n <= 0xdfff) { out += s[i] + s[i + 1]; i++; }
      continue;
    }
    if (c >= 0xdc00 && c <= 0xdfff) continue;
    out += s[i];
  }
  return out;
}
function cutText(s: string, max: number): string {
  const t = dropLoneSurrogates(s).slice(0, Math.max(0, max));
  const last = t.charCodeAt(t.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? t.slice(0, -1) : t;
}

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

/** words()와 같은 어절 나누기 + 각 어절의 원문 위치(구절을 원래 글자 그대로 돌려주기 위해) */
function wordSpans(text: string): { w: string; start: number; end: number }[] {
  return [...text.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => ({ w: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
}

/** 대본 문장들 중 레퍼런스와 연속 n어절 이상 같은 구절(겹치는 구간을 이어 붙여 하나로, 최대 10개).
 *  판정은 문장 부호를 뺀 어절로, 돌려주는 구절은 원문 글자 그대로(예: 「S&P500」) */
export function copiedPhrases(texts: string[], ref: string, n = COPY_WORDS): string[] {
  const rw = words(ref);
  if (rw.length < n) return [];
  const grams = new Set<string>();
  for (let i = 0; i + n <= rw.length; i++) grams.add(rw.slice(i, i + n).join(" "));
  const out: string[] = [];
  for (const t of texts) {
    const spans = wordSpans(t);
    const w = spans.map((s) => s.w);
    let i = 0;
    while (i + n <= w.length) {
      if (!grams.has(w.slice(i, i + n).join(" "))) { i++; continue; }
      let end = i + n; // 겹치는 구간을 끝까지 늘린다
      while (end < w.length && grams.has(w.slice(end - n + 1, end + 1).join(" "))) end++;
      const phrase = t.slice(spans[i].start, spans[end - 1].end);
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

/** v1.34 보낸 프로그램 이름(받는 쪽 화면 표시용) — 대사는 encodeURIComponent라 & 가 섞이지 않는다 */
export const REF_FROM = "ref-from";
const REF_FROM_MAX = 40;

export function refHandoffHash(transcript: string, from?: string): string {
  const name = cleanFrom(from ?? "");
  return `#${REF_HASH}=${encodeURIComponent(cutText(transcript.trim(), REF_HANDOFF_MAX))}${name ? `&${REF_FROM}=${encodeURIComponent(name)}` : ""}`;
}

function cleanFrom(name: string): string {
  return cutText(name.replace(/[\s\[\]「」]+/g, " ").trim(), REF_FROM_MAX);
}

function handoffPart(hash: string, key: string): string {
  if (!hash.startsWith(`#${REF_HASH}=`)) return "";
  const part = hash.slice(1).split("&").find((p) => p.startsWith(`${key}=`));
  if (!part) return "";
  try {
    return decodeURIComponent(part.slice(key.length + 1));
  } catch {
    return "";
  }
}

export function readRefHandoff(hash: string): string {
  return cutText(handoffPart(hash, REF_HASH).trim(), REF_HANDOFF_MAX);
}

/** 보낸 프로그램 이름(없으면 빈 문자열 — 이름 없는 옛 주소도 대사는 그대로 받음) */
export function readRefHandoffFrom(hash: string): string {
  return cleanFrom(handoffPart(hash, REF_FROM));
}
