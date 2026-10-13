import type { OptionText, Strategy } from "./types";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** 코드펜스·앞뒤 설명을 걷어 내고 JSON을 읽는다. 실패하면 null */
export function parseJsonLoose(text: string | null | undefined): unknown {
  if (!text) return null;
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(t); } catch { /* 중괄호 구간을 찾는다 */ }
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; } }
  return null;
}

function option(raw: unknown, fallbackLabel: string): OptionText | null {
  if (!isObj(raw)) return null;
  const main = str(raw.hookMainText ?? raw.main, 60);
  if (!main) return null;
  return {
    label: str(raw.label, 30) || fallbackLabel,
    main,
    sub: str(raw.hookSubText ?? raw.sub, 80),
    styleHint: str(raw.textStyleSuggestion ?? raw.styleHint, 200),
  };
}

/** 모델 응답(또는 저장본)을 Strategy로 정리한다. 핵심 필드가 없으면 null */
export function normalizeStrategy(raw: unknown): Strategy | null {
  if (!isObj(raw)) return null;
  const a = option(raw.option1 ?? raw.a, "직관형");
  const b = option(raw.option2 ?? raw.b, "호기심형");
  const imagePrompt = str(raw.imagePrompt, 1500);
  if (!a || !b || !imagePrompt) return null;
  return {
    summary: str(raw.strategySummary ?? raw.summary, 600),
    imagePrompt,
    imagePromptKo: str(raw.imagePromptKo, 1500) || imagePrompt,
    a, b,
  };
}

/** 메인 문구가 길면 경고 문구를 돌려준다(3~5단어 권장) */
export function mainWarning(main: string): string | null {
  const t = main.trim();
  if (!t) return "메인 문구를 입력해 주세요.";
  const words = t.split(/\s+/).length;
  if (words > 6 || t.length > 28) return "메인 문구가 깁니다. 3~5단어로 줄이면 클릭률이 높아집니다.";
  return null;
}

export const responseSchema = {
  type: "OBJECT",
  properties: {
    strategySummary: { type: "STRING" },
    imagePrompt: { type: "STRING" },
    imagePromptKo: { type: "STRING" },
    option1: optionSchema(),
    option2: optionSchema(),
  },
  required: ["strategySummary", "imagePrompt", "imagePromptKo", "option1", "option2"],
};

function optionSchema() {
  return {
    type: "OBJECT",
    properties: {
      label: { type: "STRING" }, hookMainText: { type: "STRING" }, hookSubText: { type: "STRING" }, textStyleSuggestion: { type: "STRING" },
    },
    required: ["label", "hookMainText", "hookSubText", "textStyleSuggestion"],
  };
}
