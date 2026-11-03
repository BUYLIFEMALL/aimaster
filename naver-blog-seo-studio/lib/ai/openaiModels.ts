export const OPENAI_CONTENT_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o mini · 빠르고 경제적인 기본 모델" },
  { value: "gpt-4o", label: "GPT-4o · 균형 잡힌 글쓰기" },
  { value: "gpt-4.1", label: "GPT-4.1 · 긴 문맥과 지시사항에 강함" },
  { value: "gpt-5.6-luna", label: "GPT-5.6 Luna · 빠르고 저렴한 최신 모델" },
  { value: "gpt-5.6-terra", label: "GPT-5.6 Terra · 성능과 비용의 균형" },
  { value: "gpt-5.6-sol", label: "GPT-5.6 Sol · 복잡한 콘텐츠에 강한 고급 모델" },
  { value: "gpt-6-astra", label: "GPT-6 Astra · 최고 성능 플래그십 모델" },
] as const;

// 종료·자동 연결되는 모델(2026-11-03, docs/PLAN_20261103_MODEL_MIGRATION_DEC.md): 계정·브라우저에 저장된 옛 이름을 공식 대체 모델로 바꿔 읽는다.
// gpt-5는 2026-12-11 종료, gemini-2.5는 2026-12-01부터 새 모델로 자동 연결.
const RETIRED_MODEL: Record<string, string> = {
  "gpt-5": "gpt-5.6-sol",
  "gemini-2.5-pro": "gemini-3.8-flash",
  "gemini-2.5-flash": "gemini-3.8-flash",
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
};

export function currentModelName(value: unknown): unknown {
  return typeof value === "string" ? RETIRED_MODEL[value] ?? value : value;
}

export type OpenAIContentModel = (typeof OPENAI_CONTENT_MODELS)[number]["value"];
export const DEFAULT_OPENAI_CONTENT_MODEL: OpenAIContentModel = "gpt-4.1";

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
