// 🤖 AI 시세 요약에서 고를 수 있는 AI(화면 순서 OpenAI → Claude → Gemini, 2026-10-25 주인님 지시 · 2026-10-25 주인님 「openai / Gemini / claude 3가지 사용할수 있게」) — 화면·서버가 함께 쓰는 이름·키 모양·키 만드는 곳
export type AiProvider = "gemini" | "openai" | "claude";
export const AI_PROVIDERS: { id: AiProvider; name: string; keyPattern: RegExp; placeholder: string; keyUrl: string; consoleUrl: string; keyHint: string }[] = [
  { id: "openai", name: "OpenAI", keyPattern: /^sk-[0-9A-Za-z_-]{20,}$/, placeholder: "sk-로 시작 (OpenAI → API keys)", keyUrl: "https://platform.openai.com/api-keys", consoleUrl: "https://platform.openai.com/signup", keyHint: "OpenAI 키는 sk-로 시작해요. OpenAI의 「API keys」에서 다시 복사해 주세요." },
  { id: "claude", name: "Claude", keyPattern: /^sk-ant-[0-9A-Za-z_-]{20,}$/, placeholder: "sk-ant-로 시작 (Anthropic Console → API Keys)", keyUrl: "https://console.anthropic.com/settings/keys", consoleUrl: "https://console.anthropic.com/", keyHint: "Claude 키는 sk-ant-로 시작해요. Anthropic Console의 「API Keys」에서 다시 복사해 주세요." },
  { id: "gemini", name: "Gemini", keyPattern: /^AIza[0-9A-Za-z_-]{20,}$/, placeholder: "AIza로 시작 (Google AI Studio → API 키)", keyUrl: "https://aistudio.google.com/apikey", consoleUrl: "https://aistudio.google.com/", keyHint: "Gemini 키는 AIza로 시작해요. Google AI Studio의 「API 키」에서 다시 복사해 주세요." },
];
export function toAiProvider(v: unknown): AiProvider {
  return v === "openai" || v === "claude" ? v : "gemini";
}
export function aiProviderInfo(id: AiProvider) {
  return AI_PROVIDERS.find((p) => p.id === id)!;
}
