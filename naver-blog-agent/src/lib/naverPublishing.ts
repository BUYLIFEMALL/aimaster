export interface NaverCategory { id: string; name: string }
export type NaverExecutionMode = "prepare" | "publish";
export function parseNaverExecutionMode(value: unknown): NaverExecutionMode {
  if (value !== "prepare" && value !== "publish") throw new Error("진행 방식을 선택해 주세요.");
  return value;
}

export function parseNaverCategory(value: unknown): NaverCategory | null {
  if (value === null) return null;
  if (!value || typeof value !== "object") throw new Error("네이버 카테고리 형식이 올바르지 않습니다.");
  const item = value as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  const name = typeof item.name === "string" ? item.name.normalize("NFC").trim() : "";
  if (!/^\d{1,12}$/.test(id) || !name || name.length > 120) throw new Error("실제 네이버 카테고리 목록에서 선택해 주세요.");
  return { id, name };
}

export function normalizeNaverTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.filter((tag): tag is string => typeof tag === "string")
    .map(tag => tag.normalize("NFC").replace(/[#\s\u200b\ufeff]/gu, "").trim())
    .filter(tag => tag && tag.length <= 100))].slice(0, 10);
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));

export function readNaverCategory(summary: unknown, blogId: string): NaverCategory | null {
  const prefs = isRecord(summary) && isRecord(summary.naver_publishing) ? summary.naver_publishing : null;
  if (prefs?.blog_id !== blogId) return null;
  try { return parseNaverCategory(prefs.category); } catch { return null; }
}

export function readNaverExecutionMode(summary: unknown, blogId: string): NaverExecutionMode {
  const prefs = isRecord(summary) && isRecord(summary.naver_publishing) ? summary.naver_publishing : null;
  if (prefs && prefs.execution_mode !== undefined && prefs.blog_id !== blogId) throw new Error("저장한 진행 방식의 블로그가 다릅니다. 발행 설정을 다시 저장해 주세요.");
  // Preserve legacy automatic publication. Invalid explicit values never become publish.
  return prefs && prefs.blog_id === blogId && prefs.execution_mode !== undefined
    ? parseNaverExecutionMode(prefs.execution_mode) : "publish";
}

export function withNaverCategory(summary: unknown, blogId: string, category: NaverCategory | null, executionMode?: NaverExecutionMode) {
  const previous = isRecord(summary)
    ? summary : summary == null ? {} : { original_summary: summary };
  const oldPrefs = isRecord(previous.naver_publishing) && previous.naver_publishing.blog_id === blogId ? previous.naver_publishing : {};
  return { ...previous, naver_publishing: { ...oldPrefs, blog_id: blogId, category,
    ...(executionMode ? { execution_mode: executionMode } : {}) } };
}
