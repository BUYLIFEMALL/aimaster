// 브랜드 검색 정리(명세 /ko/api/brands/brand-search, 2026-10-31 확인) — 외부 호출 없음(tests/usage.test.mjs).
export const BRAND_SEARCH_PATH = "/v2/providers/seller_api/apis/api/v1/marketplace/brands/search";
export const brandSearchBody = (brandName: string) => ({ brandName, countPerPage: 10, page: 1 });

/** A4 브랜드 찾기 결과: 이름 목록 */
export function brandNames(raw: unknown): string[] {
  const items = (raw as { data?: { items?: unknown } })?.data?.items;
  return [...new Set((Array.isArray(items) ? (items as { brandName?: unknown }[]) : []).map((b) => String(b.brandName ?? "").trim()).filter(Boolean))];
}

/** 쿠팡 브랜드 목록과 대조한 경고. 등록을 막지는 않는다 */
export function brandWarnings(raw: unknown, brand: string): string[] {
  const items = (raw as { data?: { items?: unknown } })?.data?.items;
  const list = Array.isArray(items) ? (items as { brandName?: unknown; isUIDRequired?: unknown }[]) : [];
  const same = list.find((b) => String(b.brandName ?? "").trim().toLowerCase() === brand.trim().toLowerCase());
  if (!same) return [`쿠팡 브랜드 목록에서 「${brand}」를 찾지 못했습니다. 철자를 확인하고, 브랜드가 없는 상품이면 칸을 비워 GENERIC으로 보내 주세요.`];
  return same.isUIDRequired === true ? [`브랜드 「${brand}」는 쿠팡이 UID 제출을 요구합니다. WING에서 요구 사항을 확인해 주세요.`] : [];
}
