// v1.96 (2026-10-22): 마지막으로 고른 AI 회사·모델을 브라우저에 기억 — 저장값 검사(순수 함수, 시험에서 바로 import).
// 목록에 없는 모델(종료·교체)이나 깨진 값은 버리고 기본값으로 시작하게 null을 돌려준다.
import type { ContentModelOption, ContentProvider } from "./ai/contentModels";

export const SAVED_MODEL_KEY = "seo-content-model";

// v1.97: 계정 저장값(user_metadata). 새 값이 없으면 예전 설정 화면의 OpenAI 모델을 기본 AI로 이어받는다.
export const ACCOUNT_MODEL_KEY = "naver_blog_seo_content_model";
export const LEGACY_OPENAI_MODEL_KEY = "naver_blog_seo_openai_model";

// 2026-11-03: 종료·자동 연결 모델의 옛 저장값을 대체 모델로 이어받는다 — lib/ai/openaiModels.ts RETIRED_MODEL과 같은 값.
// (시험이 이 파일을 .ts로 직접 불러와서 확장자 없는 import를 쓸 수 없어 따로 둔다)
const RETIRED_MODEL: Record<string, string> = { "gpt-5": "gpt-5.6-sol", "gemini-2.5-pro": "gemini-3.8-flash", "gemini-2.5-flash": "gemini-3.8-flash", "gemini-2.5-flash-lite": "gemini-3.5-flash-lite" };
const current = (value: unknown) => (typeof value === "string" ? RETIRED_MODEL[value] ?? value : value);

export function accountContentModel(meta: Record<string, unknown> | null | undefined, options: ContentModelOption[]): { provider: ContentProvider; model: string } | null {
  const chosen = meta?.[ACCOUNT_MODEL_KEY] as { provider?: unknown; model?: unknown } | undefined;
  const found = options.find((o) => o.provider === chosen?.provider && o.value === current(chosen?.model))
    ?? options.find((o) => o.provider === "openai" && o.value === current(meta?.[LEGACY_OPENAI_MODEL_KEY]));
  return found ? { provider: found.provider, model: found.value } : null;
}

export function parseSavedModel(raw: string | null, options: ContentModelOption[]): { provider: ContentProvider; model: string } | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { provider?: unknown; model?: unknown };
    const found = options.find((o) => o.provider === value?.provider && o.value === current(value?.model));
    return found ? { provider: found.provider, model: found.value } : null;
  } catch {
    return null;
  }
}
