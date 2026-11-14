// 리포트 글 정리 모델(화면·서버 공용). 2026-11-14 주인님 「OpenAI / Claude / Gemini 사용자별로 플랫폼과 모델을 직접 선택」.
// 목록 기준: docs/AI_MODEL_CATALOG.md(2026-11-03 확인) 등급별 추천 3개, 같은 목록 ebook-studio/src/lib/textModels.ts.
// 이 프로그램은 예전에 OpenAI(gpt-4o-mini) 하나만 썼으므로 기본값은 OpenAI 균형 모델로 둔다(기존 회원 동작 유지).
export type TextProvider = "openai" | "anthropic" | "gemini";

export const TEXT_PROVIDER_ORDER: TextProvider[] = ["openai", "anthropic", "gemini"];

export const TEXT_PROVIDER_LABEL: Record<TextProvider, string> = {
  openai: "OpenAI (GPT)",
  anthropic: "Claude (Anthropic)",
  gemini: "Google Gemini",
};

export const TEXT_MODELS = [
  { id: "gpt-6.1-terra", label: "균형 (추천) · GPT-6.1 Terra", provider: "openai" },
  { id: "gpt-6-luna", label: "가성비 · GPT-6 Luna", provider: "openai" },
  { id: "gpt-6-astra", label: "최고 품질 · GPT-6 Astra (비용 높음)", provider: "openai" },
  { id: "claude-sonnet-5-5", label: "균형 (추천) · Claude Sonnet 5.5", provider: "anthropic" },
  { id: "claude-haiku-5-5", label: "가성비 · Claude Haiku 5.5", provider: "anthropic" },
  { id: "claude-opus-5-5", label: "최고 품질 · Claude Opus 5.5", provider: "anthropic" },
  { id: "gemini-3.8-flash", label: "균형 (추천) · Gemini 3.8 Flash", provider: "gemini" },
  { id: "gemini-3.5-flash-lite", label: "가성비 · Gemini 3.5 Flash-Lite", provider: "gemini" },
  { id: "gemini-4-argon", label: "최고 품질 · Gemini 4 Argon (결제 연결 키 필요)", provider: "gemini" },
] as const satisfies readonly { id: string; label: string; provider: TextProvider }[];

export const DEFAULT_TEXT_MODEL = "gpt-6.1-terra";

/** 저장값을 지금 쓸 수 있는 모델로(비었거나 목록에 없으면 기본 모델). */
export function currentTextModel(model: unknown): string {
  return typeof model === "string" && TEXT_MODELS.some((m) => m.id === model) ? model : DEFAULT_TEXT_MODEL;
}

/** 모델이 속한 플랫폼(목록에 없으면 기본 모델의 플랫폼). */
export function textModelProvider(model: unknown): TextProvider {
  const id = currentTextModel(model);
  return TEXT_MODELS.find((m) => m.id === id)?.provider ?? "openai";
}

/** 플랫폼 순서대로 묶은 모델 목록(선택 칸 optgroup용). */
export function textModelGroups() {
  return TEXT_PROVIDER_ORDER.map((provider) => ({
    provider,
    label: TEXT_PROVIDER_LABEL[provider],
    models: TEXT_MODELS.filter((m) => m.provider === provider),
  }));
}

export function missingTextKeyMessage(provider: TextProvider): string {
  return `${TEXT_PROVIDER_LABEL[provider]} API 키가 없습니다. 이 주제의 「AI 모델」에 고른 플랫폼의 본인 키를 설정 > API 키 설정에 등록하거나, 키가 있는 다른 플랫폼 모델로 바꿔 주세요.`;
}
