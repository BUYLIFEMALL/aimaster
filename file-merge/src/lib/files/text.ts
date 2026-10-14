// 텍스트 파일 합치기·나누기·문자 인코딩 — 순수 함수(브라우저·Node 공용, 테스트 대상).

export type Encoding = "auto" | "utf-8" | "euc-kr";

/**
 * 바이트를 글자로 바꾼다. auto는 BOM → UTF-8(엄격) → 실패하면 한국어 ANSI(EUC-KR/CP949) 순서로 시도한다.
 * 원본 앱은 UTF-8로만 읽어 메모장 ANSI로 저장한 한글 파일이 깨졌다.
 */
export function decodeText(bytes: Uint8Array, enc: Encoding = "auto"): { text: string; encoding: "utf-8" | "euc-kr" } {
  if (enc === "euc-kr") return { text: new TextDecoder("euc-kr").decode(bytes), encoding: "euc-kr" };
  if (enc === "utf-8") return { text: new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, ""), encoding: "utf-8" };
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { text: new TextDecoder("utf-8").decode(bytes.subarray(3)), encoding: "utf-8" };
  try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" }; }
  catch { return { text: new TextDecoder("euc-kr").decode(bytes), encoding: "euc-kr" }; }
}

/** 줄바꿈 표기 통일(\r\n·\r → \n) */
export const normalizeNewlines = (s: string) => s.replace(/\r\n?/g, "\n");

/** 구분자 입력의 \n·\t 표기를 실제 문자로 */
export const parseSeparator = (s: string) => s.replace(/\\n/g, "\n").replace(/\\t/g, "\t");

/** 여러 텍스트를 구분자로 잇는다. withName이면 각 덩어리 앞에 "[파일명]" 줄을 넣는다 */
export function joinTexts(items: { name: string; text: string }[], o: { separator: string; withName?: boolean }): string {
  return items.map((it) => (o.withName ? `[${it.name}]\n` : "") + normalizeNewlines(it.text).replace(/\n+$/, "")).join(o.separator);
}

/**
 * 문장 단위 조각: 마침표·물음표·느낌표·말줄임표(한글 "다." 포함)와 줄바꿈 뒤에서 끊는다. 이어 붙이면 원문과 같다.
 */
export function sentences(text: string): string[] {
  const out = text.match(/[^.!?…。\n]*(?:[.!?…。]+["'”’)\]]*\s*|\n+|$)/g) ?? [];
  return out.filter((s) => s.length > 0);
}

/**
 * 글자 수 기준으로 나눈다. 한 조각이 size를 넘지 않게 하되, 가능하면 문단(빈 줄) → 줄 → 문장 → 띄어쓰기 경계에서 자른다.
 * 경계를 못 찾으면(아주 긴 한 단어) size에서 그대로 자른다. 이어 붙이면 원문과 같다.
 */
export function splitByChars(text: string, size: number): string[] {
  const max = Math.max(50, Math.floor(size));
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const win = rest.slice(0, max);
    const min = Math.floor(max * 0.5); // 너무 짧은 조각을 만들지 않도록 뒤쪽 절반에서만 경계를 찾는다
    const cut = lastBoundary(win, /\n\s*\n/g, min) ?? lastBoundary(win, /\n/g, min) ?? lastBoundary(win, /[.!?…。]["'”’)\]]*\s/g, min) ?? lastBoundary(win, /\s/g, min) ?? max;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.length) out.push(rest);
  return out;
}

function lastBoundary(win: string, re: RegExp, min: number): number | null {
  let pos: number | null = null;
  for (const m of win.matchAll(re)) { const end = (m.index ?? 0) + m[0].length; if (end >= min) pos = end; }
  return pos;
}

/** 조각 수 기준: 전체 길이를 parts로 나눈 크기로 글자 수 분할(경계 보존이라 조각 수가 ±1 될 수 있다) */
export function splitIntoParts(text: string, parts: number): string[] {
  const n = Math.max(1, Math.floor(parts));
  if (n === 1 || !text) return [text];
  return splitByChars(text, Math.ceil(text.length / n));
}

/** 문장 수 기준: 문장을 parts 묶음으로 고르게 나눈다(앞 묶음부터 1개씩 더). 빈 조각은 만들지 않는다 */
export function splitBySentences(text: string, parts: number): string[] {
  const ss = sentences(text);
  const n = Math.max(1, Math.min(Math.floor(parts), ss.length || 1));
  const base = Math.floor(ss.length / n);
  const extra = ss.length % n;
  const out: string[] = [];
  let i = 0;
  for (let k = 0; k < n; k++) {
    const take = base + (k < extra ? 1 : 0);
    out.push(ss.slice(i, i + take).join(""));
    i += take;
  }
  return out.filter((s) => s.length > 0);
}
