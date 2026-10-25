// 🤖 AI 시세 요약 모델 목록(2026-10-25 주인님 「각각 플랫폼의 최신 모델에서 가성비 모델까지 사용자가 선택」 · 「블로그쪽 봐봐」)
// 기준: naver-blog-seo-studio lib/ai/contentModels.ts·openaiModels.ts(블로그 글쓰기 모델 목록)를 그대로 가져옴. 목록을 바꿀 땐 블로그 쪽과 함께 본다.
// 맨 앞이 가성비 기본값(요약은 200자라 저렴한 모델로 충분).
import type { AiProvider } from "@/lib/aiProviders";

export type AiModelOption = { value: string; label: string };

export const AI_MODELS: Record<AiProvider, AiModelOption[]> = {
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o mini · 빠르고 경제적인 기본 모델" },
    { value: "gpt-5.6-luna", label: "GPT-5.6 Luna · 빠르고 저렴한 최신 모델" },
    { value: "gpt-4o", label: "GPT-4o · 균형 잡힌 글쓰기" },
    { value: "gpt-4.1", label: "GPT-4.1 · 긴 문맥과 지시사항에 강함" },
    { value: "gpt-5", label: "GPT-5 · 고품질 콘텐츠 생성" },
    { value: "gpt-5.6-terra", label: "GPT-5.6 Terra · 성능과 비용의 균형" },
    { value: "gpt-5.6-sol", label: "GPT-5.6 Sol · 복잡한 콘텐츠에 강한 고급 모델" },
    { value: "gpt-6-astra", label: "GPT-6 Astra · 최고 성능 플래그십 모델" },
  ],
  claude: [
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 · 빠르고 경제적인 기본 모델" },
    { value: "claude-sonnet-5", label: "Claude Sonnet 5 · 자연스러운 장문 콘텐츠" },
    { value: "claude-opus-5", label: "Claude Opus 5 · 복잡한 맥락과 고품질 글" },
    { value: "claude-fable-5", label: "Claude Fable 5 · 최신 고성능 장문 콘텐츠" },
  ],
  gemini: [
    { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite · 빠르고 경제적인 기본 모델" },
    { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash · 일상적인 본문 생성 균형형" },
    { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash · 속도와 품질을 강화한 본문 모델" },
    { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash · 속도와 품질의 균형" },
    { value: "gemini-3.8-flash", label: "Gemini 3.8 Flash · 최신 고성능 Flash 모델" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro · 깊이 있는 분석과 장문" },
    { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview · 고품질 콘텐츠" },
  ],
};

export function defaultAiModel(provider: AiProvider): string {
  return AI_MODELS[provider][0].value;
}

/** 저장값이 목록에 없으면(옛 값·잘못된 값) 그 AI의 가성비 기본값 */
export function resolveAiModel(provider: AiProvider, value: unknown): string {
  return AI_MODELS[provider].some((m) => m.value === value) ? String(value) : defaultAiModel(provider);
}
