// V2 언어판(2026-11-06): 영상 합치기 장면의 자막·내레이션을 회원 본인 AI 키로 다른 언어로 옮긴다(순수 함수 — 프롬프트·응답 검사).
// 번역 호출은 lib/clip/clipServer.ts askJson(Claude → Gemini → OpenAI 순, 재시도 없음).
import { EDIT_LANG_NAMES, type EditLang } from "./timeline";

export const MAX_TRANSLATE_ITEMS = 20;
export type TranslateItem = { id: string; caption: string; narration: string };

const TARGET: Record<EditLang, string> = { ko: "Korean", en: "English", ja: "Japanese", zh: "Simplified Chinese", vi: "Vietnamese" };

export function translatePrompt(lang: EditLang, items: TranslateItem[]): { system: string; prompt: string } {
  const system = [
    `You translate short-video scene captions and narration into ${TARGET[lang]} (${EDIT_LANG_NAMES[lang]}).`,
    "Rules: keep meaning and tone; captions stay short (on-screen subtitles); narration reads naturally when spoken aloud.",
    "Keep numbers, prices, brand and product names as they are. Do not add, remove or merge items. Do not add quotation marks or explanations.",
    `Answer with JSON only: {"items":[{"id":"...","caption":"...","narration":"..."}]} — same ids and same count as the input. Empty strings stay empty.`,
  ].join("\n");
  const prompt = JSON.stringify({ items: items.map((it) => ({ id: it.id, caption: it.caption, narration: it.narration })) });
  return { system, prompt };
}

/** 화면에서 보낸 장면 목록 검사(최대 20개, 자막 200자·내레이션 1000자) */
export function readTranslateItems(raw: unknown): TranslateItem[] {
  if (!Array.isArray(raw)) return [];
  const out: TranslateItem[] = [];
  for (const r of raw.slice(0, MAX_TRANSLATE_ITEMS)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.slice(0, 64) : "";
    const caption = typeof o.caption === "string" ? o.caption.replace(/\s+/g, " ").trim().slice(0, 200) : "";
    const narration = typeof o.narration === "string" ? o.narration.replace(/\s+/g, " ").trim().slice(0, 1000) : "";
    if (id && (caption || narration)) out.push({ id, caption, narration });
  }
  return out;
}

/** AI 응답을 입력 순서·번호대로 맞춘다. 빠진 장면은 원문 그대로 둔다. 하나도 못 옮겼으면 null */
export function parseTranslation(json: unknown, items: TranslateItem[]): TranslateItem[] | null {
  const list = json && typeof json === "object" && Array.isArray((json as { items?: unknown }).items) ? ((json as { items: unknown[] }).items) : [];
  const byId = new Map<string, { caption: string; narration: string }>();
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.id !== "string") continue;
    byId.set(o.id, {
      caption: typeof o.caption === "string" ? o.caption.trim().slice(0, 200) : "",
      narration: typeof o.narration === "string" ? o.narration.trim().slice(0, 1000) : "",
    });
  }
  let translated = 0;
  const out = items.map((it) => {
    const t = byId.get(it.id);
    if (!t) return it;
    const caption = it.caption ? (t.caption || it.caption) : "";
    const narration = it.narration ? (t.narration || it.narration) : "";
    if (caption !== it.caption || narration !== it.narration) translated++;
    return { id: it.id, caption, narration };
  });
  return translated ? out : null;
}
