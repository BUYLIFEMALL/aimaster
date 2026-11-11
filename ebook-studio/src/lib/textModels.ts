// 글 생성 모델(화면·서버 공용). v1.15(2026-11-11 주인님 지시): OpenAI → Claude → Gemini 순서로 플랫폼마다 최신 모델을 회원이 고른다.
// 목록 기준: docs/AI_MODEL_CATALOG.md 등급별 추천 3개(가성비·균형·최고 품질), 같은 목록을 쓰는 blog-neighbor-care/src/lib/analysis/models.ts.
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

export const DEFAULT_TEXT_MODEL = "gemini-3.8-flash";

// 브라우저에 저장된 옛 모델 값도 새 모델로 호출한다.
const RETIRED_TEXT_MODEL: Record<string, string> = {
  "gemini-2.5-flash": "gemini-3.8-flash",
  "gemini-2.5-pro": "gemini-3.8-flash",
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
  "gemini-1.5-flash": "gemini-3.8-flash",
  "gemini-1.5-pro": "gemini-3.8-flash",
  "gemini-3.7-flash": "gemini-3.8-flash",
};

/** 저장값·요청값을 지금 쓸 수 있는 모델로(옛 값은 대체 모델, 목록에 없으면 기본 모델). */
export function currentTextModel(model: unknown): string {
  const id = typeof model === "string" ? RETIRED_TEXT_MODEL[model] ?? model : "";
  return TEXT_MODELS.some((m) => m.id === id) ? id : DEFAULT_TEXT_MODEL;
}

/** 모델이 속한 플랫폼(목록에 없으면 기본 모델의 플랫폼). */
export function textModelProvider(model: unknown): TextProvider {
  const id = currentTextModel(model);
  return TEXT_MODELS.find((m) => m.id === id)?.provider ?? "gemini";
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
  return `${TEXT_PROVIDER_LABEL[provider]} API 키가 없습니다. 설정에서 본인 키를 등록하거나 메인 사이트 「API 키 설정」에 등록해 주세요.`;
}
