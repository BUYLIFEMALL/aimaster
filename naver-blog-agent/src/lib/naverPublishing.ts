export interface NaverCategory { id: string; name: string }

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

export function withNaverCategory(summary: unknown, blogId: string, category: NaverCategory | null) {
  const previous = isRecord(summary)
    ? summary : summary == null ? {} : { original_summary: summary };
  return { ...previous, naver_publishing: { blog_id: blogId, category } };
}
