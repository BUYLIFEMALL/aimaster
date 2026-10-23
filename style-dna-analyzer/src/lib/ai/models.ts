// 이미지 분석·프롬프트 보정에 쓰는 모델 레지스트리(모두 이미지 입력 지원 모델) (docs/AI_MODEL_INTEGRATION_STANDARD.md).
// 모델 ID는 이미 운영 중인 naver-blog-agent 레지스트리(src/lib/ai/contentModels.ts)에서 쓰는 값만 옮겼다.
// Preview 모델은 이름에 표시하고 기본값으로 쓰지 않는다. 새 모델은 공식 문서를 확인한 뒤에만 추가한다.

export type AiProvider = "gemini" | "openai" | "anthropic";

export interface AiModelOption {
  value: string;
  label: string;
  /** 안정(stable) 또는 미리보기(preview) */
  lifecycle: "stable" | "preview";
}

export interface AiEngine {
  provider: AiProvider;
  label: string;
  models: AiModelOption[];
}

export const AI_ENGINES: AiEngine[] = [
  {
    provider: "gemini",
    label: "Google Gemini",
    models: [
      { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash (기본 추천)", lifecycle: "stable" },
      { value: "gemini-3.8-flash", label: "Gemini 3.8 Flash", lifecycle: "stable" },
      { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite (빠르고 저렴)", lifecycle: "stable" },
      { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)", lifecycle: "preview" },
    ],
  },
  {
    provider: "openai",
    label: "OpenAI GPT",
    models: [
      { value: "gpt-4.1", label: "GPT-4.1 (기본 추천)", lifecycle: "stable" },
      { value: "gpt-6-luna", label: "GPT-6 Luna (가성비)", lifecycle: "stable" },
      { value: "gpt-6-sol", label: "GPT-6 Sol (균형형)", lifecycle: "stable" },
      { value: "gpt-4o-mini", label: "GPT-4o mini (빠르고 저렴)", lifecycle: "stable" },
    ],
  },
  {
    provider: "anthropic",
    label: "Anthropic Claude",
    models: [
      { value: "claude-sonnet-5", label: "Claude Sonnet 5 (기본 추천)", lifecycle: "stable" },
      { value: "claude-opus-5", label: "Claude Opus 5 (고급형)", lifecycle: "stable" },
      { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 (빠르고 저렴)", lifecycle: "stable" },
    ],
  },
];

export function findEngine(provider: string): AiEngine | undefined {
  return AI_ENGINES.find((e) => e.provider === provider);
}

export function isKnownModel(provider: string, model: string): boolean {
  return !!findEngine(provider)?.models.some((m) => m.value === model);
}

export function defaultModel(provider: AiProvider): string {
  const engine = findEngine(provider);
  return (engine?.models.find((m) => m.lifecycle === "stable") ?? engine?.models[0])?.value ?? "";
}
