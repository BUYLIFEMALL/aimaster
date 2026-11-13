// v1.52 (2026-11-13 주인님 지시: 「조금 더 디테일하게 곡을 만들 수 있게」「지금은 너무 단순해서 랜덤성이 강해」)
// 새 기획의 세부 설정 — 기획 표 music_plannings.plan_options(jsonb)에 저장하고 스타일·제목·가사 AI와 생성 콘솔이 함께 쓴다.
// 순수 함수(시험 tests/planOptions.test.mjs). 화면·서버 공용이라 server-only를 불러오지 않는다.
import {
  GENRE_OPTIONS,
  GENRE_MAX_SELECT,
  MOOD_OPTIONS,
  MOOD_MAX_SELECT,
  INSTRUMENT_OPTIONS,
  INSTRUMENT_MAX_SELECT,
  VOCAL_TONE_OPTIONS,
  VOCAL_TONE_MAX_SELECT,
  TEMPO_OPTIONS,
  TEMPO_MAX_SELECT,
  type TagOption,
} from "./constants";

export type SongLength = "short" | "normal" | "long";

export interface PlanOptions {
  genre: string[];
  mood: string[];
  instruments: string[];
  vocalTone: string[];
  tempo: string[];
  hook: string; // 후렴에 꼭 넣을 구절
  keywords: string; // 가사에 넣을 단어·이미지
  avoid: string; // 가사에 쓰지 말 단어
  length: SongLength;
}

export const LENGTH_OPTIONS: { value: SongLength; label: string; guide: string }[] = [
  {
    value: "short",
    label: "짧게 (2분대)",
    guide: "2분대 짧은 곡: [Verse 1] → [Chorus] → [Verse 2] → [Chorus] → [Outro] 정도로, Verse는 4줄 안팎.",
  },
  {
    value: "normal",
    label: "보통 (3분대)",
    guide: "3분대 곡: [Intro](선택) → [Verse 1] → [Pre-Chorus] → [Chorus] → [Verse 2] → [Pre-Chorus] → [Chorus] → [Bridge] → [Chorus] → [Outro].",
  },
  {
    value: "long",
    label: "길게 (4분대)",
    guide: "4분대 긴 곡: [Intro] → [Verse 1] → [Pre-Chorus] → [Chorus] → [Verse 2] → [Pre-Chorus] → [Chorus] → [Bridge] → [Chorus] → [Final Chorus] → [Outro], Verse는 6~8줄.",
  },
];

export const TEXT_LIMIT = { hook: 200, keywords: 300, avoid: 200 } as const;

export const EMPTY_PLAN_OPTIONS: PlanOptions = {
  genre: [],
  mood: [],
  instruments: [],
  vocalTone: [],
  tempo: [],
  hook: "",
  keywords: "",
  avoid: "",
  length: "normal",
};

function pick(raw: unknown, options: TagOption[], max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(options.map((o) => o.value));
  return Array.from(new Set(raw.filter((v): v is string => typeof v === "string" && allowed.has(v)))).slice(0, max);
}

function text(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** 화면·DB에서 온 값을 정리한다. 목록에 없는 칩·개수 초과·긴 글은 버린다. */
export function parsePlanOptions(raw: unknown): PlanOptions {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const length = LENGTH_OPTIONS.some((l) => l.value === o.length) ? (o.length as SongLength) : "normal";
  return {
    genre: pick(o.genre, GENRE_OPTIONS, GENRE_MAX_SELECT),
    mood: pick(o.mood, MOOD_OPTIONS, MOOD_MAX_SELECT),
    instruments: pick(o.instruments, INSTRUMENT_OPTIONS, INSTRUMENT_MAX_SELECT),
    vocalTone: pick(o.vocalTone, VOCAL_TONE_OPTIONS, VOCAL_TONE_MAX_SELECT),
    tempo: pick(o.tempo, TEMPO_OPTIONS, TEMPO_MAX_SELECT),
    hook: text(o.hook, TEXT_LIMIT.hook),
    keywords: text(o.keywords, TEXT_LIMIT.keywords),
    avoid: text(o.avoid, TEXT_LIMIT.avoid),
    length,
  };
}

/** 칩 다섯 묶음이 같은지(순서 무관) — 생성 콘솔이 기획 때 고른 칩을 그대로 두면 스타일을 다시 만들지 않는다. */
export function sameTags(a: PlanOptions, b: PlanOptions): boolean {
  const eq = (x: string[], y: string[]) => x.length === y.length && x.every((v) => y.includes(v));
  return (
    eq(a.genre, b.genre) &&
    eq(a.mood, b.mood) &&
    eq(a.instruments, b.instruments) &&
    eq(a.vocalTone, b.vocalTone) &&
    eq(a.tempo, b.tempo)
  );
}

/** 가사 AI에 붙일 지시문(빈 칸은 넣지 않는다). */
export function lyricsDirectives(o: PlanOptions): string {
  const lines: string[] = [];
  const len = LENGTH_OPTIONS.find((l) => l.value === o.length);
  if (len) lines.push(`곡 길이·구성(반드시 따름): ${len.guide}`);
  if (o.hook) lines.push(`후렴에 꼭 넣을 구절(그대로, [Chorus]마다 반복): "${o.hook}"`);
  if (o.keywords) lines.push(`가사에 녹일 단어·이미지: ${o.keywords}`);
  if (o.avoid) lines.push(`가사에 절대 쓰지 말 단어·표현: ${o.avoid}`);
  const feel = [...o.genre, ...o.mood, ...o.tempo].join(", ");
  if (feel) lines.push(`장르·분위기·템포(말투와 리듬에 반영): ${feel}`);
  return lines.join("\n");
}
