// 글귀 생성 AI 모델(화면·서버 공용). 2026-11-18 주인님 「OpenAI(GPT) → Claude → Gemini 순서로 선택」(ECOM-20261118-01).
// 목록 기준: docs/AI_MODEL_CATALOG.md(2026-11-03 확인) 등급별 추천 및 실운용 모델 라인업(OpenAI·Claude·Gemini 4종씩 총 12개).
export type TextProvider = "openai" | "anthropic" | "gemini";

export const TEXT_PROVIDER_ORDER: TextProvider[] = ["openai", "anthropic", "gemini"];

export const TEXT_PROVIDER_LABEL: Record<TextProvider, string> = {
  openai: "OpenAI (GPT)",
  anthropic: "Claude (Anthropic)",
  gemini: "Google Gemini",
};

export const TEXT_MODELS = [
  // 1. OpenAI (GPT) 라인업 — 균형(추천) → 가성비 → 고품질 → 최고 품질
  { id: "gpt-6.1-terra", label: "균형 (추천) · GPT-6.1 Terra", provider: "openai" },
  { id: "gpt-6-luna", label: "가성비 · GPT-6 Luna", provider: "openai" },
  { id: "gpt-6.1-sol", label: "고품질 · GPT-6.1 Sol", provider: "openai" },
  { id: "gpt-6-astra", label: "최고 품질 · GPT-6 Astra (비용 높음)", provider: "openai" },

  // 2. Claude (Anthropic) 라인업 — 균형(추천) → 가성비 → 최고 품질 → 플래그십
  { id: "claude-sonnet-5-5", label: "균형 (추천) · Claude Sonnet 5.5", provider: "anthropic" },
  { id: "claude-haiku-5-5", label: "가성비 · Claude Haiku 5.5", provider: "anthropic" },
  { id: "claude-opus-5-5", label: "최고 품질 · Claude Opus 5.5", provider: "anthropic" },
  { id: "claude-fable-5-1", label: "플래그십 · Claude Fable 5.1 (최고 품질)", provider: "anthropic" },

  // 3. Google Gemini 라인업 — 균형(추천) → 가성비 → 최고 품질 → 플래그십
  { id: "gemini-3.8-flash", label: "균형 (추천) · Gemini 3.8 Flash", provider: "gemini" },
  { id: "gemini-3.5-flash-lite", label: "가성비 · Gemini 3.5 Flash-Lite", provider: "gemini" },
  { id: "gemini-4-argon", label: "최고 품질 · Gemini 4 Argon (결제 연결 키 필요)", provider: "gemini" },
  { id: "gemini-3.1-pro-preview", label: "플래그십 · Gemini 3.1 Pro Preview (미리보기)", provider: "gemini" },
] as const satisfies readonly { id: string; label: string; provider: TextProvider }[];

export const DEFAULT_TEXT_MODEL = "gpt-6.1-terra";

// 2026-11-03 종료되는 옛 글 모델(Gemini 2.5, 12-01) → 대체 모델. 저장된 원고·옛 화면이 보낸 값도 새 모델로 호출한다.
const RETIRED_TEXT_MODEL: Record<string, string> = {
  "gemini-2.5-flash": "gemini-3.8-flash",
  "gemini-2.5-pro": "gemini-3.8-flash",
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
  "gemini-1.5-flash": "gemini-3.8-flash",
  "gemini-1.5-pro": "gemini-3.8-flash",
  "gemini-3.7-flash": "gemini-3.8-flash",
};

export function isTextModel(id: unknown): boolean {
  return typeof id === "string" && TEXT_MODELS.some((m) => m.id === id);
}

/** 옛 모델 이름을 새 이름으로 바꾼다(목록에 없는 값은 그대로 돌려줘 서버 검사가 막게 한다). */
export function currentTextModel(id: unknown): unknown {
  return typeof id === "string" ? RETIRED_TEXT_MODEL[id] ?? id : id;
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
  return `글귀 생성에 고른 ${TEXT_PROVIDER_LABEL[provider]} 본인 API 키가 없습니다. 「API키등록·플랫폼연동」에 등록하거나, 키가 있는 다른 플랫폼 모델로 바꿔 주세요.`;
}
