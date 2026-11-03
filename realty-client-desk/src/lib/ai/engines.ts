// AI 초안 엔진 3가지(2026-11-03 주인님 「플랫폼 3개와 각각의 모델을 선택」「해당 기능을 사용하는 곳에서」「다른 부동산 자동화 참고」).
// 모양은 상가 프로그램 `commercial-land-trade-alert/src/lib/aiEngines.ts`·매물 알림 `lib/aiModels.ts`(엔진 카드 + 세부 모델)와 같게.
// 모델은 docs/AI_MODEL_CATALOG.md(2026-11-03 확인) 플랫폼별 추천 3개 — 맨 앞이 기본(중가 균형). 화면·서버가 함께 쓴다(서버 전용 코드 없음).
export type AiProvider = "openai" | "claude" | "gemini";

export const AI_ENGINES: {
  id: AiProvider; name: string; icon: string; keyProvider: "openai" | "anthropic" | "gemini";
  keyPattern: RegExp; keyHint: string; signupUrl: string; keyUrl: string; models: { value: string; label: string }[];
}[] = [
  {
    id: "openai", name: "OpenAI", icon: "🤖", keyProvider: "openai",
    keyPattern: /^sk-[0-9A-Za-z_-]{20,}$/, keyHint: "OpenAI 키는 sk-로 시작해요. OpenAI의 「API keys」에서 다시 복사해 주세요.",
    signupUrl: "https://platform.openai.com/signup", keyUrl: "https://platform.openai.com/api-keys",
    models: [
      { value: "gpt-6.1-terra", label: "🎯 GPT-6.1 Terra (균형 · 기본 추천)" },
      { value: "gpt-6-luna", label: "⚡ GPT-6 Luna (가성비 · 가장 저렴)" },
      { value: "gpt-6-astra", label: "💎 GPT-6 Astra (최고 품질 · 비쌈)" },
    ],
  },
  {
    id: "claude", name: "Claude", icon: "🧠", keyProvider: "anthropic",
    keyPattern: /^sk-ant-[0-9A-Za-z_-]{20,}$/, keyHint: "Claude 키는 sk-ant-로 시작해요. Anthropic Console의 「API Keys」에서 다시 복사해 주세요.",
    signupUrl: "https://console.anthropic.com/", keyUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { value: "claude-sonnet-5-5", label: "🎯 Claude Sonnet 5.5 (자연스러운 문체 · 기본 추천)" },
      { value: "claude-haiku-5-5", label: "⚡ Claude Haiku 5.5 (가성비 · 빠름)" },
      { value: "claude-opus-5-5", label: "💎 Claude Opus 5.5 (최고 품질)" },
    ],
  },
  {
    id: "gemini", name: "Gemini", icon: "✨", keyProvider: "gemini",
    keyPattern: /^AIza[0-9A-Za-z_-]{20,}$/, keyHint: "Gemini 키는 AIza로 시작해요. Google AI Studio의 「API 키」에서 다시 복사해 주세요.",
    signupUrl: "https://aistudio.google.com/", keyUrl: "https://aistudio.google.com/apikey",
    models: [
      { value: "gemini-3.8-flash", label: "🎯 Gemini 3.8 Flash (균형 · 기본 추천 · 무료 등급 있음)" },
      { value: "gemini-3.5-flash-lite", label: "⚡ Gemini 3.5 Flash Lite (가장 저렴)" },
      { value: "gemini-4-argon", label: "💎 Gemini 4 Argon (최고 품질)" },
    ],
  },
];

export const toAiProvider = (v: unknown): AiProvider => (v === "openai" || v === "gemini" ? v : "claude");
export const aiEngine = (id: AiProvider) => AI_ENGINES.find((e) => e.id === id)!;
/** 목록에 없는 모델은 그 엔진의 기본 추천 */
export const resolveAiModel = (id: AiProvider, v: unknown) => (aiEngine(id).models.some((m) => m.value === v) ? String(v) : aiEngine(id).models[0].value);
export const aiModelName = (id: AiProvider, v: string) => (aiEngine(id).models.find((m) => m.value === v)?.label ?? v).replace(/^\S+\s/, "").replace(/\s*\(.*$/, "");
