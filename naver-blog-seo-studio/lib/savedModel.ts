// v1.96 (2026-10-22): 마지막으로 고른 AI 회사·모델을 브라우저에 기억 — 저장값 검사(순수 함수, 시험에서 바로 import).
// 목록에 없는 모델(종료·교체)이나 깨진 값은 버리고 기본값으로 시작하게 null을 돌려준다.
import type { ContentModelOption, ContentProvider } from "./ai/contentModels";

export const SAVED_MODEL_KEY = "seo-content-model";

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
