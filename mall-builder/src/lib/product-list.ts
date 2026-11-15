// M2-9(2026-11-15) 운영사 상품 목록 — 주소 조건(판매 상태·카테고리·재고 0·공급사 승인 대기·검색어·페이지)을 읽고 검사한다.
// 화면(admin/products)·조회 함수(store.ts getStoreProductPage)·선택 일괄 변경이 함께 쓴다. DB 변경 없음.
import { cleanSearch } from "./order-list.ts";

export const PRODUCT_PAGE_SIZE = 50;
export const PRODUCT_STATUSES = ["draft", "on_sale", "sold_out", "hidden"] as const;
export type ProductStatusKey = (typeof PRODUCT_STATUSES)[number];
export const PRODUCT_BULK_MAX = 200;

export type ProductListQuery = {
  status?: ProductStatusKey;
  category?: string; // 카테고리 id(uuid)
  noStock: boolean; // 재고 관리 상품 중 재고 0 이하
  pending: boolean; // 공급사 상품 승인 대기
  q: string;
  page: number;
};

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: string): boolean {
  return UUID.test(v);
}

export function parseProductListQuery(raw: Raw): ProductListQuery {
  const status = one(raw.status);
  const category = one(raw.category);
  return {
    status: PRODUCT_STATUSES.includes(status as ProductStatusKey) ? (status as ProductStatusKey) : undefined,
    category: isUuid(category) ? category.toLowerCase() : undefined,
    noStock: one(raw.no_stock) === "1",
    pending: one(raw.pending) === "1",
    q: cleanSearch(one(raw.q)),
    page: Math.min(Math.max(Number.parseInt(one(raw.page), 10) || 1, 1), 1000),
  };
}

/** 검색 조건(PostgREST or 문자열) — 상품명·품번 */
export function productSearchFilter(q: string): string | null {
  if (!q) return null;
  return ["name", "product_code"].map((c) => `${c}.ilike.%${q}%`).join(",");
}

export function productListHref(base: string, cur: ProductListQuery, patch: Partial<ProductListQuery>): string {
  const n = { ...cur, ...patch };
  const sp = new URLSearchParams();
  if (n.status) sp.set("status", n.status);
  if (n.category) sp.set("category", n.category);
  if (n.noStock) sp.set("no_stock", "1");
  if (n.pending) sp.set("pending", "1");
  if (n.q) sp.set("q", n.q);
  if (n.page > 1) sp.set("page", String(n.page));
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

export function productPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE));
}

type Filterable<Q> = {
  eq(col: string, v: string): Q;
  neq(col: string, v: string): Q;
  lte(col: string, v: number): Q;
  in(col: string, v: string[]): Q;
  or(filter: string): Q;
};
/** 조건을 조회에 붙인다. 카테고리는 연결표에서 먼저 뽑은 상품 id(categoryIds)로 거른다 */
export function applyProductFilters<Q extends Filterable<Q>>(query: Q, f: ProductListQuery, categoryIds?: string[]): Q {
  let q = query;
  if (f.status) q = q.eq("status", f.status);
  if (f.noStock) q = q.eq("stock_mode", "product").lte("stock", 0);
  if (f.pending) q = q.eq("approval", "pending");
  if (f.category) q = q.in("id", categoryIds?.length ? categoryIds : ["00000000-0000-0000-0000-000000000000"]);
  const search = productSearchFilter(f.q);
  if (search) q = q.or(search);
  return q;
}

/** 선택 일괄 변경 — 고른 상품 id 정리(uuid만·중복 제거·최대 PRODUCT_BULK_MAX) */
export function cleanProductIds(values: unknown[]): string[] {
  const out: string[] = [];
  for (const v of values) {
    const s = String(v ?? "").trim().toLowerCase();
    if (isUuid(s) && !out.includes(s)) out.push(s);
    if (out.length >= PRODUCT_BULK_MAX) break;
  }
  return out;
}
