// 클라이언트 컴포넌트에서도 안전하게 import할 수 있도록 모델 옵션만 분리
// (reply.ts는 "server-only"라 클라이언트 번들에 포함될 수 없음).
//
// real_estate_sales/src/lib/ai/models.ts와 동일한 최신 OpenAI 카탈로그(GPT-5.6 계열)를
// 재사용한다. gpt-4o-mini/gpt-4o처럼 구형 저가 모델은 2026-08 기준 카탈로그에서 빠질 수
// 있어 기본값을 GPT-5.6 Luna(가성비)로 바꿨다.
//
// Claude/Gemini 모델 ID는 2026-08-25 Anthropic/Google 공식 문서(platform.claude.com,
// ai.google.dev/gemini-api/docs/models)로 최신 라인업을 확인한 뒤, 문서만 믿지 않고
// 후보 전부를 실제 API로 직접 호출해 살아있는 모델만 남겼다. 그 과정에서
// gemini-2.5-flash-lite는 신규 사용자에게 이미 404("no longer available to new users")로
// 막혀 있는 걸 발견해 제외했고, gemini-2.5-flash도 구글이 더 신세대인 gemini-3.7-flash로
// 대체 안내하고 있어 최신 세대로 교체했다 — "가장 최신·실사용 가능한 모델만" 원칙.
export type ReplyModelProvider = "openai" | "anthropic" | "gemini";

export type ReplyModel =
  | "gpt-5.6-luna"
  | "gpt-5.6-terra"
  | "gpt-5.6-sol"
  | "gpt-4o"
  | "claude-haiku-4-5"
  | "claude-sonnet-5"
  | "claude-opus-5"
  | "claude-fable-5"
  | "gemini-3.5-flash-lite"
  | "gemini-3.6-flash"
  | "gemini-3.7-flash"
  | "gemini-2.5-pro"
  | "gemini-3.1-pro-preview";

export interface ReplyModelOption {
  value: ReplyModel;
  /** 셀렉트 박스 옵션에 쓰는 상세 설명 포함 라벨. */
  label: string;
  /** "지금 사용 중" 안내처럼 짧게 인용할 때 쓰는 모델명만 있는 라벨. */
  shortLabel: string;
  provider: ReplyModelProvider;
}

export const REPLY_MODEL_OPTIONS: ReplyModelOption[] = [
  { value: "gpt-5.6-luna", label: "가성비 (GPT-5.6 Luna, 빠르고 저렴 · 기본값)", shortLabel: "GPT-5.6 Luna", provider: "openai" },
  { value: "gpt-5.6-terra", label: "균형형 (GPT-5.6 Terra, 더 자연스러운 답변)", shortLabel: "GPT-5.6 Terra", provider: "openai" },
  { value: "gpt-5.6-sol", label: "최고 품질 (GPT-5.6 Sol, 가장 똑똑함 · 비용 높음)", shortLabel: "GPT-5.6 Sol", provider: "openai" },
  { value: "gpt-4o", label: "구형 범용형 (GPT-4o, 이전 세대)", shortLabel: "GPT-4o", provider: "openai" },
  { value: "claude-haiku-4-5", label: "가성비 (Claude Haiku 4.5, 빠르고 저렴)", shortLabel: "Claude Haiku 4.5", provider: "anthropic" },
  { value: "claude-sonnet-5", label: "균형형 (Claude Sonnet 5, 자연스러운 문체)", shortLabel: "Claude Sonnet 5", provider: "anthropic" },
  { value: "claude-opus-5", label: "고급형 (Claude Opus 5, 복잡한 맥락도 잘 이해함)", shortLabel: "Claude Opus 5", provider: "anthropic" },
  { value: "claude-fable-5", label: "플래그십 (Claude Fable 5, Anthropic 최상위 모델 · 비용 최고)", shortLabel: "Claude Fable 5", provider: "anthropic" },
  { value: "gemini-3.5-flash-lite", label: "가성비 (Gemini 3.5 Flash Lite, 가장 빠르고 저렴)", shortLabel: "Gemini 3.5 Flash Lite", provider: "gemini" },
  { value: "gemini-3.6-flash", label: "구형 균형형 (Gemini 3.6 Flash, 이전 세대)", shortLabel: "Gemini 3.6 Flash", provider: "gemini" },
  { value: "gemini-3.7-flash", label: "균형형 (Gemini 3.7 Flash, 최신 세대 · 속도와 품질 균형)", shortLabel: "Gemini 3.7 Flash", provider: "gemini" },
  { value: "gemini-2.5-pro", label: "고급형 (Gemini 2.5 Pro, 깊이 있는 추론)", shortLabel: "Gemini 2.5 Pro", provider: "gemini" },
  { value: "gemini-3.1-pro-preview", label: "플래그십 (Gemini 3.1 Pro Preview, Google 최상위 모델 · 비용 최고)", shortLabel: "Gemini 3.1 Pro Preview", provider: "gemini" },
];

export const DEFAULT_REPLY_MODEL: ReplyModel = "gpt-5.6-luna";

/** API 키 섹션 소제목처럼 provider 이름만 짧게 표시할 때 쓴다(PROVIDER_LABELS는 괄호 설명이 붙어 길다). */
export const REPLY_MODEL_PROVIDER_SHORT_LABELS: Record<ReplyModelProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  gemini: "Google Gemini",
};

/** 선택된 답글 모델을 실제로 호출하려면 이 provider의 API 키가 등록되어 있어야 한다. */
export function getReplyModelProvider(model: string | null | undefined): ReplyModelProvider {
  return REPLY_MODEL_OPTIONS.find((o) => o.value === model)?.provider ?? "openai";
}
