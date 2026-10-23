import type { Lang, MediaType, ModelLevel, Options, PromptLength } from "./types";
import { DEFAULT_OPTIONS, TARGETS, defaultTarget } from "./types";

export const MEMO_MAX = 300;

/** 클라이언트가 보낸 옵션을 안전한 값으로 정리한다(종류에 없는 대상 도구는 기본값으로) */
export function cleanOptions(raw: unknown, media: MediaType): Options {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lang: Lang = r.lang === "en" ? "en" : "ko";
  const model: ModelLevel = r.model === "pro" ? "pro" : DEFAULT_OPTIONS.model;
  const length: PromptLength = r.length === "short" || r.length === "detailed" ? r.length : "standard";
  const target = TARGETS[media].some((t) => t.id === r.target) ? String(r.target) : defaultTarget(media);
  const memo = typeof r.memo === "string" ? r.memo.replace(/\s+/g, " ").trim().slice(0, MEMO_MAX) : "";
  return { lang, model, target, length, memo };
}

export function cleanTitle(v: unknown, fallback = "제목 없는 분석"): string {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  return s || fallback;
}
