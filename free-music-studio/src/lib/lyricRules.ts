// 가사·연주곡 기획 규칙 — 원본 기능을 옮김(2026-11-03). 금지어 찾기, 목표 길이 설명, 연주곡 기획 결과 검사.
// 서버(AI 호출)와 화면이 같은 규칙을 쓴다. 순수 함수 — 시험 tests/lyricRules.test.mjs.

import { LIMITS } from "./songs";

/** ACE-Step은 가사 칸에 이 표기가 있으면 연주곡(보컬 없음)으로 만든다 */
export const INSTRUMENTAL_LYRICS = "[Instrumental]";
export const isInstrumentalLyrics = (lyrics: string) => lyrics.trim().toLowerCase() === INSTRUMENTAL_LYRICS.toLowerCase();

export const BANNED_LIMIT = 30;
export const PLAN_MAX = 10;

const fold = (text: string) => text.normalize("NFC").toLowerCase();

/** 금지어 목록 다듬기 — 빈 칸·중복(대소문자 무시) 빼고, 최대 30개 */
export function cleanBannedWords(words: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of Array.isArray(words) ? words : []) {
    const word = typeof w === "string" ? w.normalize("NFC").trim().slice(0, 30) : "";
    if (!word || seen.has(fold(word))) continue;
    seen.add(fold(word));
    out.push(word);
    if (out.length >= BANNED_LIMIT) break;
  }
  return out;
}

/** 회원이 쉼표·줄바꿈으로 적은 금지어 칸 → 목록 */
export function parseBannedInput(text: string): string[] {
  return cleanBannedWords(text.split(/[,\n]/));
}

/** 가사·제목에 들어 있는 금지어 — 붙은 조사까지 잡도록 부분 일치(불빛 → 불빛이). [Verse] 같은 구간 표기는 보지 않는다. */
export function findBannedWords(text: string, words: string[]): string[] {
  const value = fold(text.replace(/^\[[^\]\r\n]+\][ \t]*\r?$/gm, ""));
  return cleanBannedWords(words).filter((w) => value.includes(fold(w)));
}

/** AI에 알려 줄 목표 길이 — 정확한 길이가 아니라 기준 */
export function targetLengthText(seconds: number): string {
  return `about ${Math.round(seconds / 6) / 10} minutes (${seconds} s) — a reference length, not an exact one`;
}

export type PlannedTrack = { title: string; style: string; art: string };

/** 연주곡 기획 응답 검사 — 곡 수, 제목 겹침·금지어, 스타일 길이. 틀리면 한국어 오류를 던진다. */
export function parsePlan(raw: string, count: number, banned: string[] = []): PlannedTrack[] {
  let value: { tracks?: unknown };
  try {
    value = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new Error("연주곡 기획 응답을 읽지 못했습니다.");
  }
  const tracks = Array.isArray(value?.tracks) ? (value.tracks as Record<string, unknown>[]) : null;
  if (!tracks || tracks.length !== count) throw new Error(`연주곡 ${count}곡의 기획이 필요합니다(받은 수: ${tracks?.length ?? 0}).`);
  const seen = new Set<string>();
  return tracks.map((t, i) => {
    const title = typeof t?.title === "string" ? t.title.trim() : "";
    const style = typeof t?.style === "string" ? t.style.trim() : "";
    const art = typeof t?.art === "string" ? t.art.replace(/\s+/g, " ").trim() : "";
    if (!title || title.length > LIMITS.title || /[\r\n]/.test(title)) throw new Error(`${i + 1}번째 곡의 제목이 올바르지 않습니다.`);
    if (seen.has(fold(title))) throw new Error(`제목이 겹칩니다: ${title}`);
    const found = findBannedWords(title, banned);
    if (found.length) throw new Error(`제목에 금지어(${found.join(", ")})가 들어 있습니다: ${title}`);
    seen.add(fold(title));
    if (!style || style.length > LIMITS.style) throw new Error(`${i + 1}번째 곡의 스타일이 비었거나 ${LIMITS.style}자를 넘습니다.`);
    return { title, style, art };
  });
}
