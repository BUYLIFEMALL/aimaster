// 클라이언트 컴포넌트에서도 안전하게 import할 수 있도록 모델 옵션만 분리한 파일.
//
// threads-comment-reply/lib/ai/models.ts와 동일한 카탈로그(2026-08-25 Anthropic/Google
// 공식 문서 확인 + 실제 API 호출로 생존 여부까지 검증된 최신 라인업)를 openai/anthropic/
// gemini 3종에 그대로 재사용한다. 이 프로그램은 추가로 perplexity(4번째 provider)를 쓰므로
// sonar/sonar-pro 2단계를 더했다.
//
// 답글 생성(threads-comment-reply)과 달리 이 프로그램은 "페이지 HTML에서 셀렉터 뽑기"라는
// 훨씬 가벼운 구조화 작업이라, 기본값은 각 provider의 가장 저렴/빠른 모델로 둔다 — 페이지
// 구조가 복잡해서 잘 못 찾는 경우에만 더 상위 모델로 바꿔보라고 안내한다.
export type AiModelProvider = "openai" | "anthropic" | "gemini" | "perplexity";

export type AiModel =
  | "gpt-5.6-luna"
  | "gpt-5.6-terra"
  | "gpt-5.6-sol"
  | "gpt-4o-mini"
  | "claude-haiku-4-5"
  | "claude-sonnet-5"
  | "claude-opus-5"
  | "gemini-3.5-flash-lite"
  | "gemini-3.7-flash"
  | "gemini-2.5-pro"
  | "sonar"
  | "sonar-pro";

export interface AiModelOption {
  value: AiModel;
  /** 셀렉트 박스 옵션에 쓰는 상세 설명 포함 라벨. */
  label: string;
  provider: AiModelProvider;
}

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  { value: "gpt-5.6-luna", label: "가성비 (GPT-5.6 Luna, 빠르고 저렴 · 추천)", provider: "openai" },
  { value: "gpt-5.6-terra", label: "균형형 (GPT-5.6 Terra)", provider: "openai" },
  { value: "gpt-5.6-sol", label: "고급형 (GPT-5.6 Sol, 복잡한 페이지 구조에 강함)", provider: "openai" },
  { value: "gpt-4o-mini", label: "구형 가성비 (GPT-4o mini, 이전 세대)", provider: "openai" },

  { value: "claude-haiku-4-5", label: "가성비 (Claude Haiku 4.5, 빠르고 저렴 · 추천)", provider: "anthropic" },
  { value: "claude-sonnet-5", label: "균형형 (Claude Sonnet 5)", provider: "anthropic" },
  { value: "claude-opus-5", label: "고급형 (Claude Opus 5, 복잡한 페이지 구조에 강함)", provider: "anthropic" },

  { value: "gemini-3.5-flash-lite", label: "가성비 (Gemini 3.5 Flash Lite, 가장 빠르고 저렴 · 추천)", provider: "gemini" },
  { value: "gemini-3.7-flash", label: "균형형 (Gemini 3.7 Flash)", provider: "gemini" },
  { value: "gemini-2.5-pro", label: "고급형 (Gemini 2.5 Pro, 복잡한 페이지 구조에 강함)", provider: "gemini" },

  { value: "sonar", label: "가성비 (Sonar, 빠르고 저렴 · 추천)", provider: "perplexity" },
  { value: "sonar-pro", label: "고급형 (Sonar Pro)", provider: "perplexity" },
];

/** provider별 기본 선택 모델 — 전부 가장 저렴/빠른 티어. */
export const DEFAULT_MODEL_BY_PROVIDER: Record<AiModelProvider, AiModel> = {
  openai: "gpt-5.6-luna",
  anthropic: "claude-haiku-4-5",
  gemini: "gemini-3.5-flash-lite",
  perplexity: "sonar",
};

/** optgroup 라벨처럼 provider 이름만 짧게 표시할 때 쓴다. */
export const AI_MODEL_PROVIDER_SHORT_LABELS: Record<AiModelProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  gemini: "Google Gemini",
  perplexity: "Perplexity",
};

export const AI_MODEL_PROVIDER_ORDER: AiModelProvider[] = ["openai", "anthropic", "gemini", "perplexity"];

/** 선택된 모델을 실제로 호출하려면 이 provider의 API 키가 등록되어 있어야 한다. */
export function getAiModelProvider(model: string | null | undefined): AiModelProvider {
  return AI_MODEL_OPTIONS.find((o) => o.value === model)?.provider ?? "openai";
}
