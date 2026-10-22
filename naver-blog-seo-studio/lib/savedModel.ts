// v1.96 (2026-10-22): 마지막으로 고른 AI 회사·모델을 브라우저에 기억 — 저장값 검사(순수 함수, 시험에서 바로 import).
// 목록에 없는 모델(종료·교체)이나 깨진 값은 버리고 기본값으로 시작하게 null을 돌려준다.
import type { ContentModelOption, ContentProvider } from "./ai/contentModels";

export const SAVED_MODEL_KEY = "seo-content-model";

// v1.97: 계정 저장값(user_metadata). 새 값이 없으면 예전 설정 화면의 OpenAI 모델을 기본 AI로 이어받는다.
export const ACCOUNT_MODEL_KEY = "naver_blog_seo_content_model";
export const LEGACY_OPENAI_MODEL_KEY = "naver_blog_seo_openai_model";

export function accountContentModel(meta: Record<string, unknown> | null | undefined, options: ContentModelOption[]): { provider: ContentProvider; model: string } | null {
  const chosen = meta?.[ACCOUNT_MODEL_KEY] as { provider?: unknown; model?: unknown } | undefined;
  const found = options.find((o) => o.provider === chosen?.provider && o.value === chosen?.model)
    ?? options.find((o) => o.provider === "openai" && o.value === meta?.[LEGACY_OPENAI_MODEL_KEY]);
  return found ? { provider: found.provider, model: found.value } : null;
}

export function parseSavedModel(raw: string | null, options: ContentModelOption[]): { provider: ContentProvider; model: string } | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { provider?: unknown; model?: unknown };
    const found = options.find((o) => o.provider === value?.provider && o.value === value?.model);
    return found ? { provider: found.provider, model: found.value } : null;
  } catch {
    return null;
  }
}
