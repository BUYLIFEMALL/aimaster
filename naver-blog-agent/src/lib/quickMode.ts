// E-3 간편 모드(2026-10-24, Maepsi M1 참고 — 코드·지시문 미사용): 주제 하나로 키워드·화자를 추천받아
// 기존 작성 화면의 생성 흐름(기획·작성·윤문 → 이미지 → 저장)을 그대로 자동 실행한다. 외부 호출 없음(서버·화면·시험 공용).

export const QUICK_START_KEY = "nba_quick_start";
export const QUICK_START_TTL_MS = 10 * 60_000;
export const QUICK_CUSTOM_PERSONA_ID = "custom";

export interface QuickPersona { id: string; name: string; desc: string }
export interface QuickSuggestion { mainKeyword: string; subKeywords: string[]; category: string; purpose: string; persona: QuickPersona }
export interface QuickStart { topic: string; keywords: string; category: string; purpose: string; persona: QuickPersona; imageCount: number; at: number }

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** AI 응답 → 추천값. 핵심 키워드가 없으면 null. 화자는 기본 화자 id면 그대로, 아니면 직접 입력 화자(이름 20자·설명 200자). */
export function readQuickSuggestion(raw: unknown, presetIds: string[]): QuickSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const mainKeyword = text(r.mainKeyword, 40);
  if (!mainKeyword) return null;
  const subs = Array.isArray(r.subKeywords) ? r.subKeywords.map((s) => text(s, 40)).filter(Boolean) : [];
  const subKeywords = [...new Set(subs.filter((s) => s !== mainKeyword))].slice(0, 5);
  const p = (r.persona && typeof r.persona === "object" ? r.persona : {}) as Record<string, unknown>;
  const pid = text(p.id, 40);
  const persona: QuickPersona = presetIds.includes(pid)
    ? { id: pid, name: "", desc: "" }
    : { id: QUICK_CUSTOM_PERSONA_ID, name: text(p.name, 20), desc: text(p.desc, 200) };
  if (persona.id === QUICK_CUSTOM_PERSONA_ID && (!persona.name || !persona.desc)) persona.id = presetIds[0] ?? QUICK_CUSTOM_PERSONA_ID;
  return { mainKeyword, subKeywords, category: text(r.category, 20) || "일반", purpose: text(r.purpose, 200), persona };
}

/** 작성 화면의 「검색 키워드」 칸 형식(핵심 먼저, 쉼표로). */
export function quickKeywords(s: Pick<QuickSuggestion, "mainKeyword" | "subKeywords">): string {
  return [s.mainKeyword, ...s.subKeywords].filter(Boolean).join(", ");
}

/** 간편 모드 → 작성 화면 넘겨받기(sessionStorage). 형식이 틀리거나 10분이 지나면 null(자동 생성하지 않음). */
export function readQuickStart(raw: string | null, now = Date.now()): QuickStart | null {
  if (!raw) return null;
  let v: Record<string, unknown>;
  try { v = JSON.parse(raw); } catch { return null; }
  if (!v || typeof v !== "object") return null;
  const at = Number(v.at);
  if (!Number.isFinite(at) || now - at < 0 || now - at > QUICK_START_TTL_MS) return null;
  const topic = text(v.topic, 300);
  const imageCount = Number(v.imageCount);
  const p = (v.persona && typeof v.persona === "object" ? v.persona : {}) as Record<string, unknown>;
  const persona = { id: text(p.id, 40), name: text(p.name, 20), desc: text(p.desc, 200) };
  if (!topic || !persona.id || !Number.isInteger(imageCount) || imageCount < 1 || imageCount > 5) return null;
  if (persona.id === QUICK_CUSTOM_PERSONA_ID && (!persona.name || !persona.desc)) return null;
  return { topic, keywords: text(v.keywords, 300), category: text(v.category, 20) || "일반", purpose: text(v.purpose, 200), persona, imageCount, at };
}
