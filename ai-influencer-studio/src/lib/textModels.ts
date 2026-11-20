// 글 생성 모델 목록(화면·서버 공용) — 2026-11-20, 주인님 지시 「글 모델 선택(최고성능/중간/가성비)」.
// 목록 기준: 루트 docs/AI_MODEL_CATALOG.md 1절 등급별 추천 3개 × 3사(마지막 확인 2026-11-19). 모델을 바꿀 때는 그 문서부터 본다.
// 참고 구현: ebook-studio/src/lib/textModels.ts(같은 목록) — 여기에는 등급 칸을 더했다.
// ★ 아직 어느 화면·라우트도 이 파일을 읽지 않는다(1단계). 지금 실제 호출은 src/lib/gemini.ts의 TEXT_MODEL 하나다.
export type TextProvider = "gemini" | "openai" | "anthropic";
export type TextTier = "balanced" | "value" | "top";

/** 화면에 보이는 회사 순서 — 지금 회원이 가진 키(Gemini)가 먼저 */
export const TEXT_PROVIDER_ORDER: TextProvider[] = ["gemini", "openai", "anthropic"];

export const TEXT_PROVIDER_LABEL: Record<TextProvider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI (GPT)",
  anthropic: "Claude (Anthropic)",
};

export const TEXT_TIER_LABEL: Record<TextTier, string> = {
  balanced: "균형 (추천)",
  value: "가성비",
  top: "최고 품질",
};

export type TextModel = { id: string; name: string; provider: TextProvider; tier: TextTier; note?: string };

/** 회사마다 균형 → 가성비 → 최고 품질 순서 */
export const TEXT_MODELS: readonly TextModel[] = [
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", provider: "gemini", tier: "balanced" },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", provider: "gemini", tier: "value" },
  { id: "gemini-4-argon", name: "Gemini 4 Argon", provider: "gemini", tier: "top", note: "결제 연결 키 필요" },
  { id: "gpt-6.1-terra", name: "GPT-6.1 Terra", provider: "openai", tier: "balanced" },
  { id: "gpt-6-luna", name: "GPT-6 Luna", provider: "openai", tier: "value" },
  { id: "gpt-6-astra", name: "GPT-6 Astra", provider: "openai", tier: "top", note: "비용 높음" },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", provider: "anthropic", tier: "balanced" },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", provider: "anthropic", tier: "value" },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "anthropic", tier: "top" },
];

/** 아무것도 고르지 않은 회원의 모델 — 지금 쓰는 Gemini 키로 그대로 동작한다 */
export const DEFAULT_TEXT_MODEL = "gemini-3.8-flash";

/** 브라우저에 남아 있을 수 있는 옛 값 → 지금 모델 */
const RETIRED_TEXT_MODEL: Record<string, string> = {
  "gemini-3-flash-preview": "gemini-3.8-flash",
};

/** 저장값·요청값을 지금 쓸 수 있는 모델 번호로(옛 값은 대체 모델, 목록에 없거나 글자가 아니면 기본 모델) */
export function currentTextModel(model: unknown): string {
  if (typeof model !== "string") return DEFAULT_TEXT_MODEL;
  const id = Object.hasOwn(RETIRED_TEXT_MODEL, model) ? RETIRED_TEXT_MODEL[model] : model;
  return TEXT_MODELS.some((m) => m.id === id) ? id : DEFAULT_TEXT_MODEL;
}

/** 그 모델의 회사(목록에 없으면 기본 모델의 회사) */
export function textModelProvider(model: unknown): TextProvider {
  const id = currentTextModel(model);
  return TEXT_MODELS.find((m) => m.id === id)!.provider;
}

/** 화면 표시: 「균형 (추천) · Gemini 3.8 Flash」 「최고 품질 · Gemini 4 Argon (결제 연결 키 필요)」 */
export function textModelLabel(m: TextModel): string {
  return `${TEXT_TIER_LABEL[m.tier]} · ${m.name}${m.note ? ` (${m.note})` : ""}`;
}

/** 회사 순서대로 묶은 목록(선택 칸의 묶음용) */
export function textModelGroups() {
  return TEXT_PROVIDER_ORDER.map((provider) => ({
    provider,
    label: TEXT_PROVIDER_LABEL[provider],
    models: TEXT_MODELS.filter((m) => m.provider === provider),
  }));
}

/** 회사를 바꿨을 때 고를 모델 — 그 회사의 균형 모델 */
export function defaultModelOf(provider: TextProvider): string {
  return TEXT_MODELS.find((m) => m.provider === provider && m.tier === "balanced")!.id;
}

/** 고른 회사의 키가 없을 때의 안내(다른 회사 키로 대신하지 않는다) */
export function missingTextKeyMessage(provider: TextProvider): string {
  return `${TEXT_PROVIDER_LABEL[provider]} API 키가 등록되어 있지 않습니다. 「API키등록·플랫폼연동」에서 본인 키를 등록해 주세요.`;
}
