// 네이버 블로그 "실제" 카테고리(발행할 때 들어갈 곳). 크롬 확장이 회원의 네이버 발행 설정창에서 읽은 번호(id)와 이름(name)만 쓴다.
// 형식은 ai-auto-blog·naver-blog-agent·올인원과 같다. 보관함 분류(lib/blog/categories.ts)와는 별개다.
export interface NaverCategory {
  id: string;
  name: string;
}

export const NAVER_LAST_KEY = "naver_blog_seo_naver_category_last_v1";
export const NAVER_LIST_KEY = "naver_blog_seo_naver_category_list_v1";

/** 형식이 올바르지 않으면 null(= 지정 안 함) */
export function readNaverCategory(value: unknown): NaverCategory | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const name = typeof o.name === "string" ? o.name.normalize("NFC").trim() : "";
  if (!/^\d{1,12}$/.test(id) || !name || name.length > 120) return null;
  return { id, name };
}

export function readNaverCategoryList(value: unknown): NaverCategory[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: NaverCategory[] = [];
  for (const item of value) {
    const c = readNaverCategory(item);
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
    if (out.length >= 200) break;
  }
  return out;
}

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem" | "removeItem">;

/** 마지막으로 쓴 네이버 카테고리 — 다음 글의 기본값(자동 선택) */
export function loadLastNaverCategory(storage: ReadStorage): NaverCategory | null {
  try {
    const raw = storage.getItem(NAVER_LAST_KEY);
    return raw ? readNaverCategory(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveLastNaverCategory(storage: WriteStorage, category: NaverCategory | null): void {
  try {
    if (category) storage.setItem(NAVER_LAST_KEY, JSON.stringify(category));
    else storage.removeItem(NAVER_LAST_KEY);
  } catch {
    /* 저장 공간을 못 쓰면 기본값만 기억하지 못한다 */
  }
}

export function loadNaverCategoryList(storage: ReadStorage): NaverCategory[] {
  try {
    const raw = storage.getItem(NAVER_LIST_KEY);
    return raw ? readNaverCategoryList(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveNaverCategoryList(storage: WriteStorage, list: NaverCategory[]): void {
  try {
    storage.setItem(NAVER_LIST_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/** 불러온 목록에 같은 번호가 있으면 이름 변경을 반영하고, 없으면(네이버에서 삭제) 선택을 해제한다. */
export function reconcileNaverCategory(selected: NaverCategory | null, list: NaverCategory[]): NaverCategory | null {
  if (!selected) return null;
  return list.find((c) => c.id === selected.id) ?? null;
}

/** 확장 버전 문구("v1.25")가 기준 이상인지. 읽을 수 없으면 false(옛 확장은 버전을 "v1.04"처럼 고정값으로 알렸다). */
export function extensionVersionAtLeast(version: unknown, minimum: string): boolean {
  const parse = (v: unknown) => {
    const m = /^v?(\d+)\.(\d+)/.exec(String(v ?? "").trim());
    return m ? [Number(m[1]), Number(m[2])] : null;
  };
  const a = parse(version);
  const b = parse(minimum);
  if (!a || !b) return false;
  return a[0] > b[0] || (a[0] === b[0] && a[1] >= b[1]);
}
