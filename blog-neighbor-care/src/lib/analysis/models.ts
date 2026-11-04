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
  | "gpt-6.1-terra"
  | "gpt-6-luna"
  | "gpt-6-astra"
  | "claude-sonnet-5-5"
  | "claude-haiku-5-5"
  | "claude-opus-5-5"
  | "gemini-3.5-flash-lite"
  | "gemini-3.8-flash"
  | "gemini-4-argon"
  | "sonar"
  | "sonar-pro";

export interface AiModelOption {
  value: AiModel;
  /** 셀렉트 박스 옵션에 쓰는 상세 설명 포함 라벨. */
  label: string;
  provider: AiModelProvider;
}

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  // docs/AI_MODEL_CATALOG.md 등급별 추천 3개씩(OpenAI·Claude 2026-11-04 v1.17, Gemini v1.16) — 기본은 중가 균형.
  { value: "gpt-6.1-terra", label: "균형형 (GPT-6.1 Terra · 기본 추천)", provider: "openai" },
  { value: "gpt-6-luna", label: "가성비 (GPT-6 Luna, 빠르고 저렴)", provider: "openai" },
  { value: "gpt-6-astra", label: "최고급 (GPT-6 Astra, 비용 높음)", provider: "openai" },

  { value: "claude-sonnet-5-5", label: "균형형 (Claude Sonnet 5.5 · 기본 추천)", provider: "anthropic" },
  { value: "claude-haiku-5-5", label: "가성비 (Claude Haiku 5.5, 빠르고 저렴)", provider: "anthropic" },
  { value: "claude-opus-5-5", label: "최고급 (Claude Opus 5.5)", provider: "anthropic" },

  { value: "gemini-3.8-flash", label: "균형형 (Gemini 3.8 Flash · 기본 추천)", provider: "gemini" },
  { value: "gemini-3.5-flash-lite", label: "가성비 (Gemini 3.5 Flash Lite, 가장 빠르고 저렴)", provider: "gemini" },
  { value: "gemini-4-argon", label: "최고급 (Gemini 4 Argon · 무료 등급 없음, 결제 연결 키 필요)", provider: "gemini" },

  { value: "sonar", label: "가성비 (Sonar, 빠르고 저렴 · 추천)", provider: "perplexity" },
  { value: "sonar-pro", label: "고급형 (Sonar Pro)", provider: "perplexity" },
];

/** provider별 기본 선택 모델 — 모델 선택표의 중가 균형(기본값). */
export const DEFAULT_MODEL_BY_PROVIDER: Record<AiModelProvider, AiModel> = {
  openai: "gpt-6.1-terra",
  anthropic: "claude-sonnet-5-5",
  gemini: "gemini-3.8-flash",
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

/** 종료·자동 연결되는 옛 모델 → 대체 모델(2026-12-01 Gemini 2.5 종료). 저장된 작업의 옛 값도 새 모델로 호출한다. */
const RETIRED_AI_MODEL: Record<string, AiModel> = {
  // v1.17: 이전 세대 OpenAI·Claude 저장값은 같은 등급의 선택표 모델로.
  "gpt-5.6-luna": "gpt-6-luna",
  "gpt-5.6-terra": "gpt-6.1-terra",
  "gpt-5.6-sol": "gpt-6-astra",
  "gpt-4.1": "gpt-6.1-terra",
  "claude-haiku-4-5": "claude-haiku-5-5",
  "claude-sonnet-5": "claude-sonnet-5-5",
  "claude-opus-5": "claude-opus-5-5",
  "gemini-2.5-pro": "gemini-3.8-flash",
  "gemini-2.5-flash": "gemini-3.8-flash",
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
  "gemini-3.7-flash": "gemini-3.8-flash",
};

/** 저장된 모델 값을 지금 쓸 수 있는 값으로(옛 값은 대체 모델). */
export function currentAiModel(model: string): string {
  return RETIRED_AI_MODEL[model] ?? model;
}

/** 선택된 모델을 실제로 호출하려면 이 provider의 API 키가 등록되어 있어야 한다. */
export function getAiModelProvider(model: string | null | undefined): AiModelProvider {
  const current = model ? currentAiModel(model) : model;
  return AI_MODEL_OPTIONS.find((o) => o.value === current)?.provider ?? "openai";
}
