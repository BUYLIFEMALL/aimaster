// 🤖 AI 시세 요약 엔진·세부 실행 모델(2026-10-25 주인님 — 「쓰레드 콘텐츠 운영」 화면을 기준으로)
// 기준: threads-content-ops lib/personas.ts `ENGINES`(GPT·Claude·Gemini 엔진 카드 + 세부 실행 모델)를 그대로 가져옴. 모델 목록을 바꿀 땐 그쪽과 함께 본다.
// 맨 앞이 그 엔진의 「기본 추천」.
import type { AiProvider } from "@/lib/aiProviders";

export type AiModelOption = { value: string; label: string };

// role: 표의 「엔진 역할」 띠(2026-10-25 주인님 「모델별 모델이 하는 역할을 설명해준게 좋아」) — 셋 다 AI 시세 요약을 하고, 고른 엔진 하나만 쓴다
export const AI_ENGINES: { id: AiProvider; label: string; sub: string; icon: string; role: { title: string; text: string } }[] = [
  { id: "openai", label: "GPT", sub: "OpenAI", icon: "🤖", role: { title: "숫자로 짚는 시세 요약", text: "이번 주 매물 수·평균 호가·실거래 대비 변화를 숫자와 함께 한두 줄로 정리해요(기본 추천)." } },
  { id: "claude", label: "Claude", sub: "Anthropic", icon: "🧠", role: { title: "자연스러운 브리핑", text: "중개사가 직접 설명하듯 부드러운 한국어 문장으로 이번 주 흐름을 알려 줘요." } },
  { id: "gemini", label: "Gemini", sub: "Google", icon: "✨", role: { title: "빠르고 저렴한 요약", text: "하루 1번 요약에 비용 부담이 가장 적어요. 가볍게 흐름만 받아 볼 때 좋아요." } },
];

export const AI_MODELS: Record<AiProvider, AiModelOption[]> = {
  openai: [
    { value: "gpt-4.1", label: "🚀 GPT-4.1 (최신 세대 스마트 모델 · 기본 추천)" },
    { value: "gpt-6-luna", label: "⚡ GPT-6 Luna (최신 세대 · 가성비 초고속)" },
    { value: "gpt-6-sol", label: "🎯 GPT-6 Sol (최신 세대 · 균형형)" },
    { value: "gpt-6-astra", label: "💎 GPT-6 Astra (최신 세대 · 최고 품질 플래그십)" },
    { value: "gpt-5.6-luna", label: "⚡ GPT-5.6 Luna (가성비 초고속)" },
    { value: "gpt-5.6-terra", label: "🎯 GPT-5.6 Terra (균형형 자연스러운 어조)" },
    { value: "gpt-5.6-sol", label: "💎 GPT-5.6 Sol (최고 품질 플래그십)" },
    { value: "gpt-4o", label: "⚙️ GPT-4o (범용 표준 모델)" },
    { value: "gpt-4o-mini", label: "⚡ GPT-4o-mini (빠르고 저렴)" },
  ],
  claude: [
    { value: "claude-sonnet-5", label: "🎯 Claude Sonnet 5 (최신 세대 · 자연스러운 문체 · 기본 추천)" },
    { value: "claude-opus-5", label: "💎 Claude Opus 5 (고급형 복잡한 맥락 이해)" },
    { value: "claude-haiku-4-5", label: "⚡ Claude Haiku 4.5 (가성비 초고속)" },
  ],
  gemini: [
    { value: "gemini-3.7-flash", label: "⚡ Gemini 3.7 Flash (속도와 품질 균형 · 기본 추천)" },
    { value: "gemini-3.8-flash", label: "🚀 Gemini 3.8 Flash (최신 세대 · 최고 성능 Flash)" },
    { value: "gemini-3.5-flash-lite", label: "⚡ Gemini 3.5 Flash Lite (가장 빠르고 저렴)" },
    { value: "gemini-3.1-pro-preview", label: "💎 Gemini 3.1 Pro Preview (Google 최상위 플래그십)" },
    { value: "gemini-2.0-flash", label: "⚙️ Gemini 2.0 Flash (안정형)" },
  ],
};

export function defaultAiModel(provider: AiProvider): string {
  return AI_MODELS[provider][0].value;
}

/** 저장값이 목록에 없으면(옛 값·잘못된 값) 그 엔진의 기본 추천 */
export function resolveAiModel(provider: AiProvider, value: unknown): string {
  return AI_MODELS[provider].some((m) => m.value === value) ? String(value) : defaultAiModel(provider);
}

/** 화면 표시용 짧은 이름(이모지·괄호 설명 뺌) — 예: 「GPT-4.1」 */
export function aiModelShortName(provider: AiProvider, value: string): string {
  const label = AI_MODELS[provider].find((m) => m.value === value)?.label ?? value;
  return label.replace(/^\S+\s/, "").replace(/\s*\(.*$/, "");
}
