// 한글→영문 변환에 쓰는 글 모델(화면·서버 공용).
// 목록 기준: docs/AI_MODEL_CATALOG.md(2026-11-03·11-19 확인)의 등급별 추천. 같은 이름을 emotion-writer/src/lib/studio/textModels.ts가 운영에서 쓰고 있다.
// 주인님 결정(2026-11-19): 기본은 가장 저렴한 등급. 등록된 키가 여러 개면 Claude 저가(claude-haiku-5-5). 선택 칸 순서는 OpenAI → Claude → Gemini.
// 변환은 단순 작업이라 최상급 모델은 넣지 않는다(플랫폼마다 저가·균형 두 가지).
export type ConvertProvider = "openai" | "anthropic" | "gemini";

export const CONVERT_PROVIDER_ORDER: ConvertProvider[] = ["openai", "anthropic", "gemini"];

export const CONVERT_PROVIDER_LABEL: Record<ConvertProvider, string> = {
  openai: "OpenAI (GPT)",
  anthropic: "Claude (Anthropic)",
  gemini: "Google Gemini",
};

export type ConvertModel = { id: string; provider: ConvertProvider; tier: "low" | "mid"; label: string };

export const CONVERT_MODELS: readonly ConvertModel[] = [
  { id: "gpt-6-luna", provider: "openai", tier: "low", label: "가성비 · GPT-6 Luna" },
  { id: "gpt-6.1-terra", provider: "openai", tier: "mid", label: "균형 · GPT-6.1 Terra" },
  { id: "claude-haiku-5-5", provider: "anthropic", tier: "low", label: "가성비 · Claude Haiku 5.5" },
  { id: "claude-sonnet-5-5", provider: "anthropic", tier: "mid", label: "균형 · Claude Sonnet 5.5" },
  { id: "gemini-3.5-flash-lite", provider: "gemini", tier: "low", label: "가성비 · Gemini 3.5 Flash-Lite" },
  { id: "gemini-3.8-flash", provider: "gemini", tier: "mid", label: "균형 · Gemini 3.8 Flash" },
];

export type KeyStatus = Record<ConvertProvider, boolean>;

export function findConvertModel(id: unknown): ConvertModel | null {
  return typeof id === "string" ? (CONVERT_MODELS.find((m) => m.id === id) ?? null) : null;
}

/**
 * 기본 모델: 등록된 키가 있는 플랫폼의 저가 모델. 키가 여러 개면 Claude 저가, Claude 키가 없으면 선택 칸 순서에서 처음 나오는 플랫폼.
 * 등록된 키가 하나도 없으면 null(변환을 켤 수 없다 — 등록 안내).
 */
export function pickDefaultModel(keys: KeyStatus): string | null {
  const have = CONVERT_PROVIDER_ORDER.filter((p) => keys[p] === true);
  if (!have.length) return null;
  const provider = have.length > 1 && have.includes("anthropic") ? "anthropic" : have[0];
  return CONVERT_MODELS.find((m) => m.provider === provider && m.tier === "low")!.id;
}

/** 키가 등록된 플랫폼의 모델만, 선택 칸 순서(OpenAI → Claude → Gemini)로 */
export function availableModels(keys: KeyStatus): ConvertModel[] {
  return CONVERT_PROVIDER_ORDER.flatMap((p) => (keys[p] === true ? CONVERT_MODELS.filter((m) => m.provider === p) : []));
}

/** 동의 창·버튼 옆에 보일 비용 안내. 정확한 금액이 아니라 등급별 어림값이다(가격은 플랫폼 사정으로 바뀐다). */
export function costHint(model: ConvertModel): string {
  return model.tier === "low" ? "한 묶음(24줄)에 대략 10원 안쪽" : "한 묶음(24줄)에 대략 수십 원";
}

export function missingKeyMessage(provider: ConvertProvider): string {
  return `${CONVERT_PROVIDER_LABEL[provider]} 본인 API 키가 등록돼 있지 않습니다. 메인 사이트의 「API 설정」에서 본인 키를 등록하거나, 키가 있는 다른 플랫폼의 모델을 골라 주세요.`;
}
