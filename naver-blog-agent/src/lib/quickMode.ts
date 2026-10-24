// E-3 간편 모드(2026-10-24, Maepsi M1 참고 — 코드·지시문 미사용): 주제 하나로 키워드·화자를 추천받아
// 에이전트 생성 API(기획·작성·윤문)를 그대로 불러 원고를 만든다(E-4부터 간편 화면 안에서 결과까지). 외부 호출 없음(서버·화면·시험 공용).

export const QUICK_CUSTOM_PERSONA_ID = "custom";

export interface QuickPersona { id: string; name: string; desc: string }
export interface QuickSuggestion { mainKeyword: string; subKeywords: string[]; category: string; purpose: string; persona: QuickPersona }

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

/** E-4: 간편 모드로 만든 원고 표시(`research_summary.mode`). 간편 범위 회원은 이 원고만 보고·고치고·입력한다. */
export const QUICK_POST_MODE = "quick";
export function isQuickPost(row: { research_summary?: unknown } | null | undefined): boolean {
  const s = row?.research_summary;
  return Boolean(s && typeof s === "object" && (s as Record<string, unknown>).mode === QUICK_POST_MODE);
}
/** 간편 범위면 간편 원고만 허용. 전체 범위는 항상 허용. */
export function scopeAllowsPost(scope: "full" | "quick", row: { research_summary?: unknown } | null | undefined): boolean {
  return scope === "full" || isQuickPost(row);
}
