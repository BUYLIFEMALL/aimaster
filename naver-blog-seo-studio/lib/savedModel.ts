// v1.96 (2026-10-22): 마지막으로 고른 AI 회사·모델을 브라우저에 기억 — 저장값 검사(순수 함수, 시험에서 바로 import).
// 목록에 없는 모델(종료·교체)이나 깨진 값은 버리고 기본값으로 시작하게 null을 돌려준다.
import type { ContentModelOption, ContentProvider } from "./ai/contentModels";

export const SAVED_MODEL_KEY = "seo-content-model";

// v1.97: 계정 저장값(user_metadata). 새 값이 없으면 예전 설정 화면의 OpenAI 모델을 기본 AI로 이어받는다.
export const ACCOUNT_MODEL_KEY = "naver_blog_seo_content_model";
export const LEGACY_OPENAI_MODEL_KEY = "naver_blog_seo_openai_model";

// 2026-11-03: 종료·자동 연결 모델의 옛 저장값을 대체 모델로 이어받는다 — lib/ai/openaiModels.ts RETIRED_MODEL과 같은 값.
// (시험이 이 파일을 .ts로 직접 불러와서 확장자 없는 import를 쓸 수 없어 따로 둔다)
// 2026-11-19: 목록에서 뺀 모델 추가(openaiModels.ts RETIRED_MODEL과 같은 값 — 생성 경로와 같은 해석).
const RETIRED_MODEL: Record<string, string> = {
  "gpt-5": "gpt-5.6-sol", "gemini-2.5-pro": "gemini-3.8-flash", "gemini-2.5-flash": "gemini-3.8-flash", "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
  "gpt-4.1": "gpt-6.1-terra", "gpt-4o": "gpt-6.1-terra", "gpt-4o-mini": "gpt-6-luna",
  "claude-haiku-4-5": "claude-haiku-5-5", "claude-haiku-4-5-20251001": "claude-haiku-5-5", "claude-fable-5": "claude-fable-5-2",
  "gemini-3.5-flash": "gemini-3.6-flash", "gemini-3.7-flash": "gemini-3.8-flash",
};
const current = (value: unknown) => (typeof value === "string" ? RETIRED_MODEL[value] ?? value : value);

type Chosen = { provider: ContentProvider; model: string };
/** 플랫폼 기본 모델(호출하는 쪽이 contentModels.getDefaultContentModel을 넘김 — 화면·서버가 같은 기본값). 없으면 그 플랫폼 첫 항목. */
export type DefaultModelFor = (provider: ContentProvider) => string;

// 2026-11-19 (Master msg_841a78cd076a): 저장된 플랫폼은 보존한다 — 모델이 목록에 없으면(종료·교체) 대체 모델,
// 대체도 없으면 「같은 플랫폼의 기본값」으로 복구한다. 플랫폼 자체가 목록에 없거나 모델이 문자열이 아니면 null(기본 시작).
function restore(value: { provider?: unknown; model?: unknown } | undefined, options: ContentModelOption[], defaultFor?: DefaultModelFor): Chosen | null {
  const provider = value?.provider;
  if (typeof value?.model !== "string" || !value.model) return null;
  const inProvider = options.filter((o) => o.provider === provider);
  if (!inProvider.length) return null;
  const p = inProvider[0].provider;
  // 목록에 그대로 있으면 그 값, 없을 때만 대체표 적용
  const exact = inProvider.find((o) => o.value === value.model) ?? inProvider.find((o) => o.value === current(value.model));
  if (exact) return { provider: p, model: exact.value };
  const fallback = defaultFor?.(p);
  const model = inProvider.some((o) => o.value === fallback) ? fallback! : inProvider[0].value;
  return { provider: p, model };
}

export function accountContentModel(meta: Record<string, unknown> | null | undefined, options: ContentModelOption[], defaultFor?: DefaultModelFor): Chosen | null {
  const chosen = meta?.[ACCOUNT_MODEL_KEY] as { provider?: unknown; model?: unknown } | undefined;
  // 새 계정 저장값이 있으면 그 플랫폼을 우선(옛 OpenAI 설정으로 플랫폼이 바뀌지 않게)
  return restore(chosen, options, defaultFor)
    ?? restore({ provider: "openai", model: meta?.[LEGACY_OPENAI_MODEL_KEY] as unknown }, options, defaultFor);
}

export function parseSavedModel(raw: string | null, options: ContentModelOption[], defaultFor?: DefaultModelFor): Chosen | null {
  if (!raw) return null;
  try {
    return restore(JSON.parse(raw) as { provider?: unknown; model?: unknown }, options, defaultFor);
  } catch {
    return null;
  }
}
