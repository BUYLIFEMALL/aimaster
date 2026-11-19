// 2026-11-19 주인님 지시(최신 모델순·같은 기준): 플랫폼마다 최신 모델을 위로, 종료 예정·자동 연결 모델은 빼고 저장값은 대체 모델로 읽는다. 근거: 공식 모델 문서 + 실제 호출 확인(docs/AI_MODEL_CATALOG.md 0-1절).
export const OPENAI_CONTENT_MODELS = [
  { value: "gpt-6.2-astra", label: "GPT-6.2 Astra · 최신 · 최상위 품질 (느림·비쌈)" },
  { value: "gpt-6.2-sol", label: "GPT-6.2 Sol · 최신 · 일상 작업 고품질" },
  { value: "gpt-6.1-terra", label: "GPT-6.1 Terra · 성능과 비용의 균형 (기본)" },
  { value: "gpt-6.1-sol", label: "GPT-6.1 Sol · 한 단계 높은 품질" },
  { value: "gpt-6-astra", label: "GPT-6 Astra · 최상위 품질 (느림)" },
  { value: "gpt-6-luna", label: "GPT-6 Luna · 빠르고 경제적" },
  { value: "gpt-5.6-sol", label: "GPT-5.6 Sol · 이전 세대 · 복잡한 콘텐츠" },
  { value: "gpt-5.6-terra", label: "GPT-5.6 Terra · 이전 세대 · 균형" },
  { value: "gpt-5.6-luna", label: "GPT-5.6 Luna · 이전 세대 · 경제적" },
] as const;

// 종료·자동 연결되는 모델(2026-11-03, docs/PLAN_20261103_MODEL_MIGRATION_DEC.md): 계정·브라우저에 저장된 옛 이름을 공식 대체 모델로 바꿔 읽는다.
// gpt-5는 2026-12-11 종료, gemini-2.5는 2026-12-01부터 새 모델로 자동 연결.
const RETIRED_MODEL: Record<string, string> = {
  "gpt-5": "gpt-5.6-sol",
  // 2026-11-19 목록에서 뺀 모델 → 대체(OpenAI 2027-01-14 종료·Claude 이전 세대·Gemini 자동 연결)
  "gpt-4.1": "gpt-6.1-terra",
  "gpt-4o": "gpt-6.1-terra",
  "gpt-4o-mini": "gpt-6-luna",
  "claude-haiku-4-5": "claude-haiku-5-5",
  "claude-haiku-4-5-20251001": "claude-haiku-5-5",
  "claude-fable-5": "claude-fable-5-2",
  "gemini-3.5-flash": "gemini-3.6-flash",
  "gemini-3.7-flash": "gemini-3.8-flash",
  "gemini-2.5-pro": "gemini-3.8-flash",
  "gemini-2.5-flash": "gemini-3.8-flash",
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
};

export function currentModelName(value: unknown): unknown {
  return typeof value === "string" ? RETIRED_MODEL[value] ?? value : value;
}

export type OpenAIContentModel = (typeof OPENAI_CONTENT_MODELS)[number]["value"];
export const DEFAULT_OPENAI_CONTENT_MODEL: OpenAIContentModel = "gpt-6.1-terra";

export function isOpenAIContentModel(value: unknown): value is OpenAIContentModel {
  return OPENAI_CONTENT_MODELS.some((model) => model.value === value);
}

export function resolveOpenAIContentModel(value: unknown): OpenAIContentModel {
  const current = currentModelName(value);
  return isOpenAIContentModel(current) ? current : DEFAULT_OPENAI_CONTENT_MODEL;
}

// v1.97: OpenAI 전용 기능(제목 추천·기존 글 분석/최적화·본문 이미지 고르기)의 모델.
// 글쓰기 기본 AI(naver_blog_seo_content_model)가 OpenAI면 그 모델, 아니면 「OpenAI 전용 기능 모델」(naver_blog_seo_openai_model), 없으면 기본값.
// v1.98: requested = 화면이 보낸 지금 적용 중인 OpenAI 모델(계정 저장 전에 눌러도 맞게). 목록에 없으면 무시.
export function getUserOpenAIContentModel(userMetadata: Record<string, unknown> | null | undefined, requested?: unknown) {
  const req = currentModelName(requested);
  if (isOpenAIContentModel(req)) return req;
  const chosen = userMetadata?.naver_blog_seo_content_model as { provider?: unknown; model?: unknown } | undefined;
  const chosenModel = currentModelName(chosen?.model);
  if (chosen?.provider === "openai" && isOpenAIContentModel(chosenModel)) return chosenModel;
  return resolveOpenAIContentModel(userMetadata?.naver_blog_seo_openai_model);
}
