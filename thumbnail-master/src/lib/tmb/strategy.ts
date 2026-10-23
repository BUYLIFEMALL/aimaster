import type { ImageVersion, OptionText, Ratio, Strategy } from "./types";

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
export function mainWarning(main: string, ratio: Ratio = "16:9"): string | null {
  const t = main.trim();
  if (!t) return "메인 문구를 입력해 주세요.";
  const words = t.split(/\s+/).length;
  if (ratio === "9:16" && (words > 4 || noSpaceLen(t) > 12)) return "세로 표지는 폭이 좁습니다. 메인 문구를 2~4단어로 줄이면 잘 보입니다.";
  if (words > 6 || t.length > 28) return "메인 문구가 깁니다. 3~5단어로 줄이면 클릭률이 높아집니다.";
  return null;
}

/** v1.15 세로 9:16만 서브 문구 길이 안내(가로는 기존처럼 안내 없음) */
export function subWarning(sub: string, ratio: Ratio): string | null {
  if (ratio !== "9:16") return null;
  return noSpaceLen(sub.trim()) > 10 ? "세로 표지는 서브 문구를 10자 이내(띄어쓰기 제외)로 줄이면 잘 보입니다." : null;
}

/** v1.15 이미지를 만든 문구와 지금 문구가 다른가(문구 기록이 없는 예전 이미지는 false) */
export function textChanged(ver: ImageVersion | undefined, now: { main: string; sub: string }): boolean {
  if (!ver || ver.main === undefined) return false;
  return ver.main.trim() !== now.main.trim() || (ver.sub ?? "").trim() !== now.sub.trim();
}

/** v1.16 결과 칸에 보여 줄 「이미지 문구 → 지금」 한 줄(문구 기록이 없으면 빈 글) */
export function changedTextLine(ver: ImageVersion | undefined, now: { main: string; sub: string }): string {
  if (!textChanged(ver, now) || !ver) return "";
  const pair = (m: string, s: string) => (s.trim() ? `${m.trim()} / ${s.trim()}` : m.trim());
  return `이미지 문구: ${pair(ver.main ?? "", ver.sub ?? "")} → 지금: ${pair(now.main, now.sub)}`;
}

/** v1.16 「2종 생성」 전에 세로 길이 안내가 있으면 물어볼 문장(없으면 빈 글) */
export function lengthConfirmText(opts: { main: string; sub: string }[], ratio: Ratio): string {
  if (ratio !== "9:16") return "";
  const long = opts.some((o) => mainWarning(o.main, ratio) || subWarning(o.sub, ratio));
  return long ? "문구가 세로 표지 기준보다 깁니다(메인 2~4단어, 서브 10자 이내 권장). 그대로 만들까요?" : "";
}

function noSpaceLen(s: string): number { return s.replace(/\s+/g, "").length; }

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
