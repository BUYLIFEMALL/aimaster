// AI 요약 엔진 3가지. 기준: realty-listing-alert/lib/aiProviders.ts·aiModels.ts. Claude는 최신 세대로 맞췄다. 맨 앞이 기본 추천.
export type AiProvider = "openai" | "claude" | "gemini";

export const AI_ENGINES: { id: AiProvider; name: string; icon: string; role: string; roleText: string; keyProvider: string; keyPattern: RegExp; keyHint: string; keyUrl: string; models: { value: string; label: string }[] }[] = [
  {
    id: "openai", name: "OpenAI", icon: "🤖", role: "숫자 요약", roleText: "매물 수·호가·시세 대비를 숫자로 정리", keyProvider: "openai",
    keyPattern: /^sk-[0-9A-Za-z_-]{20,}$/, keyHint: "OpenAI 키는 sk-로 시작해요. OpenAI의 「API keys」에서 다시 복사해 주세요.", keyUrl: "https://platform.openai.com/api-keys",
    models: [
      { value: "gpt-4.1", label: "🚀 GPT-4.1 (최신 세대 스마트 모델 · 기본 추천)" },
      { value: "gpt-6-luna", label: "⚡ GPT-6 Luna (최신 세대 · 가성비 초고속)" },
      { value: "gpt-6-sol", label: "🎯 GPT-6 Sol (최신 세대 · 균형형)" },
      { value: "gpt-6-astra", label: "💎 GPT-6 Astra (최신 세대 · 최고 품질 플래그십)" },
      { value: "gpt-4o-mini", label: "⚡ GPT-4o-mini (빠르고 저렴)" },
    ],
  },
  {
    id: "claude", name: "Claude", icon: "🧠", role: "자연스러운 브리핑", roleText: "중개사가 설명하듯 부드러운 문장", keyProvider: "anthropic",
    keyPattern: /^sk-ant-[0-9A-Za-z_-]{20,}$/, keyHint: "Claude 키는 sk-ant-로 시작해요. Anthropic Console의 「API Keys」에서 다시 복사해 주세요.", keyUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { value: "claude-opus-5-5", label: "💎 Claude Opus 5.5 (복잡한 맥락 이해 · 기본 추천)" },
      { value: "claude-sonnet-5-5", label: "🎯 Claude Sonnet 5.5 (균형형)" },
      { value: "claude-haiku-5-5", label: "⚡ Claude Haiku 5.5 (가성비 초고속)" },
    ],
  },
  {
    id: "gemini", name: "Gemini", icon: "✨", role: "빠르고 저렴", roleText: "비용 부담이 적은 가벼운 요약", keyProvider: "gemini",
    keyPattern: /^AIza[0-9A-Za-z_-]{20,}$/, keyHint: "Gemini 키는 AIza로 시작해요. Google AI Studio의 「API 키」에서 다시 복사해 주세요.", keyUrl: "https://aistudio.google.com/apikey",
    models: [
      { value: "gemini-3.7-flash", label: "⚡ Gemini 3.7 Flash (속도와 품질 균형 · 기본 추천)" },
      { value: "gemini-3.8-flash", label: "🚀 Gemini 3.8 Flash (최신 세대 · 최고 성능 Flash)" },
      { value: "gemini-3.5-flash-lite", label: "⚡ Gemini 3.5 Flash Lite (가장 빠르고 저렴)" },
      { value: "gemini-3.1-pro-preview", label: "💎 Gemini 3.1 Pro Preview (Google 최상위)" },
    ],
  },
];

export const toAiProvider = (v: unknown): AiProvider => (v === "openai" || v === "gemini" ? v : "claude");
export const aiEngine = (id: AiProvider) => AI_ENGINES.find((e) => e.id === id)!;
