// 글 카테고리(회원별). 글에는 카테고리 id만 저장하고, 이름은 이 목록에서 찾는다(이름을 바꿔도 글은 그대로 이어진다).
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export const MAX_CATEGORIES = 50;

/** 아직 한 번도 저장하지 않은 회원에게 보여 주는 기본 목록 */
export const DEFAULT_CATEGORIES: BlogCategory[] = [
  "생활/살림꿀팁",
  "자취/원룸생활",
  "IT/테크리뷰",
  "재테크/정부지원금",
  "국내여행/맛집",
  "쇼핑/가성비추천",
].map((name, i) => ({ id: `default-${i + 1}`, name, slug: makeSlug(name), sort_order: i + 1 }));

export function makeSlug(name: string): string {
  const clean = name.toLowerCase().trim().replace(/[^\w\s가-힣-]/g, "").replace(/\s+/g, "-");
  return clean || `cat-${Date.now().toString(36)}`;
}

export function newCategoryId(): string {
  return `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** 서버·화면 공통 정리: 형식 검사, id 중복 제거, 순서 번호 다시 매기기 */
export function sanitizeCategories(raw: unknown): BlogCategory[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: BlogCategory[] = [];
  for (const item of raw) {
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim().slice(0, 80) : "";
    const name = typeof o.name === "string" ? o.name.trim().slice(0, 40) : "";
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name, slug: typeof o.slug === "string" ? o.slug.slice(0, 80) : makeSlug(name), sort_order: out.length + 1 });
    if (out.length >= MAX_CATEGORIES) break;
  }
  return out;
}

/** 카테고리 id → 이름. 목록에 없으면 null(삭제된 카테고리 = 미분류) */
export function categoryName(categories: BlogCategory[], id: string | undefined | null): string | null {
  return categories.find((c) => c.id === id)?.name ?? null;
}
