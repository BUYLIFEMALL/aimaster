// 내 쿠팡 상품 목록(C2-1). 상품 목록 페이징 조회 GET seller-products?vendorId=…&nextToken=…&maxPerPage=… — 외부 호출 없음(tests/listing.test.mjs).

export const LIST_PATH = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products";

/** 쿠팡 상태 코드(조회 조건) — 화면 고르기용 */
export const LIST_STATUSES: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: "APPROVED", label: "승인완료" },
  { value: "PARTIAL_APPROVED", label: "부분승인완료" },
  { value: "APPROVING", label: "승인대기중" },
  { value: "IN_REVIEW", label: "심사중" },
  { value: "SAVED", label: "임시저장" },
  { value: "DENIED", label: "승인반려" },
  { value: "DELETED", label: "상품삭제" },
];

export const MAX_PER_PAGE = 50; // 쿠팡 최대 100 — 화면 한 번에 50건

export function listQuery(vendorId: string, opt: { nextToken?: string; status?: string; name?: string; maxPerPage?: number } = {}): string {
  const q = new URLSearchParams({ vendorId, maxPerPage: String(opt.maxPerPage ?? MAX_PER_PAGE) });
  if (opt.nextToken) q.set("nextToken", opt.nextToken);
  if (opt.status && LIST_STATUSES.some((s) => s.value === opt.status)) q.set("status", opt.status);
  const name = (opt.name ?? "").trim().slice(0, 20); // 쿠팡: 상품명 검색 20자 이하
  if (name) q.set("sellerProductName", name);
  return q.toString();
}

export type ListedProduct = { sellerProductId: number; name: string; brand: string; statusName: string; categoryCode: number | null; createdAt: string; saleEndedAt: string };

export function normalizeProductList(raw: unknown): { items: ListedProduct[]; nextToken: string } {
  const r = (raw ?? {}) as { data?: unknown; nextToken?: unknown };
  const s = (v: unknown) => (v == null ? "" : String(v)).trim();
  const items = (Array.isArray(r.data) ? r.data : [])
    .map((p: Record<string, unknown>) => ({
      sellerProductId: Number(p.sellerProductId) || 0,
      name: s(p.sellerProductName),
      brand: s(p.brand),
      statusName: s(p.statusName),
      categoryCode: Number(p.displayCategoryCode) || null,
      createdAt: s(p.createdAt),
      saleEndedAt: s(p.saleEndedAt),
    }))
    .filter((p) => p.sellerProductId > 0);
  return { items, nextToken: s(r.nextToken) };
}
