export interface RecentProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  viewedAt: number;
}

const MAX_RECENT_PRODUCTS = 10;
const STORAGE_PREFIX = "mb_recent_";

export function getRecentStorageKey(slug: string): string {
  return `${STORAGE_PREFIX}${slug}`;
}

/**
 * 특정 상점의 최근 본 상품 목록 조회 (최신순)
 */
export function getRecentProducts(slug: string): RecentProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getRecentStorageKey(slug));
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.slice(0, MAX_RECENT_PRODUCTS);
  } catch {
    return [];
  }
}

/**
 * 최근 본 상품 추가 (중복 시 최상단으로 이동)
 */
export function addRecentProduct(
  slug: string,
  item: { id: string; name: string; price: number; image?: string }
): void {
  if (typeof window === "undefined" || !item.id) return;
  try {
    const key = getRecentStorageKey(slug);
    const existing = getRecentProducts(slug);
    const filtered = existing.filter((p) => p.id !== item.id);
    const newItem: RecentProduct = {
      id: item.id,
      name: item.name || "상품",
      price: item.price || 0,
      image: item.image || "",
      viewedAt: Date.now(),
    };
    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_PRODUCTS);
    localStorage.setItem(key, JSON.stringify(updated));

    // 동일 탭 및 다른 컴포넌트에 실시간 업데이트 전파
    window.dispatchEvent(
      new CustomEvent("mb_recent_updated", {
        detail: { slug, count: updated.length },
      })
    );
  } catch {
    // LocalStorage 할당 초과 등 예외 무시
  }
}

/**
 * 특정 최근 본 상품 삭제
 */
export function removeRecentProduct(slug: string, id: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = getRecentStorageKey(slug);
    const existing = getRecentProducts(slug);
    const updated = existing.filter((p) => p.id !== id);
    localStorage.setItem(key, JSON.stringify(updated));

    window.dispatchEvent(
      new CustomEvent("mb_recent_updated", {
        detail: { slug, count: updated.length },
      })
    );
  } catch {}
}

/**
 * 최근 본 상품 전체 비우기
 */
export function clearRecentProducts(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getRecentStorageKey(slug));
    window.dispatchEvent(
      new CustomEvent("mb_recent_updated", {
        detail: { slug, count: 0 },
      })
    );
  } catch {}
}
