// 상품 수정·할인 기준가·자동생성옵션(묶음 5). 경로·본문·검사만 — 외부 호출 없음(tests/productEdit.test.mjs).
// 명세(2026-10-31 확인): /ko/api/products/product-modification(조회 JSON 전체를 고쳐 PUT, 재승인 뒤 반영, 가격·재고·판매 상태는 별도 API)
//   승인 불필요 수정 PUT seller-products/{id}/partial(배송·반품만, 임시저장중·승인대기중 불가)
//   할인 기준가 PUT vendor-items/{id}/original-prices/{price}(0원부터 10원 단위)
//   자동생성옵션 POST seller/auto-generated/opt-in|opt-out(응답 code SUCCESS·PROCESSING·FAILED, 꺼도 기존 자동 옵션은 별도 판매 중지)

const BASE = "/v2/providers/seller_api/apis/api/v1/marketplace";
export const EDIT_PATH = `${BASE}/seller-products`;
export const partialPath = (sellerProductId: number) => `${BASE}/seller-products/${sellerProductId}/partial`;
export const originalPricePath = (vendorItemId: number, price: number) => `${BASE}/vendor-items/${vendorItemId}/original-prices/${price}`;
/** 옵션ID를 주면 그 옵션만(옵션 상품 단위), 없으면 판매자 전체 */
export const autoOptionPath = (on: boolean, vendorItemId?: number) => `${BASE}/${vendorItemId ? `vendor-items/${vendorItemId}` : "seller"}/auto-generated/${on ? "opt-in" : "opt-out"}`;

export const MAX_TAGS = 20;
export const NOT_EDITABLE = ["저장중", "심사중", "승인대기중", "승인요청", "상품삭제"];
export const NOT_PARTIAL = ["임시저장", "임시저장중", "저장중", "심사중", "승인대기중", "승인요청", "상품삭제"];
export const NEEDS_REAPPROVAL = ["승인완료", "부분승인완료"];
export const DELIVERY_TYPES = [
  { value: "FREE", label: "무료배송" },
  { value: "NOT_FREE", label: "유료배송" },
  { value: "CHARGE_RECEIVED", label: "착불배송" },
  { value: "CONDITIONAL_FREE", label: "조건부 무료배송" },
];

export type ProductFields = { name: string; displayName: string; brand: string; tags: string[] };
export type DeliveryFields = { deliveryChargeType: string; deliveryCharge: number; deliveryChargeOnReturn: number; returnCharge: number; freeShipOverAmount: number };
export type EditView = ProductFields & DeliveryFields & { statusName: string };

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const text = (v: unknown) => (v == null ? "" : String(v)).trim();

export function normalizeEditView(raw: unknown): EditView {
  const d = ((raw as { data?: unknown })?.data ?? {}) as Record<string, unknown>;
  const items = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  return {
    statusName: text(d.statusName),
    name: text(d.sellerProductName),
    displayName: text(d.displayProductName),
    brand: text(d.brand),
    tags: Array.isArray(items[0]?.searchTags) ? (items[0].searchTags as unknown[]).map(text).filter(Boolean) : [],
    deliveryChargeType: text(d.deliveryChargeType),
    deliveryCharge: num(d.deliveryCharge),
    deliveryChargeOnReturn: num(d.deliveryChargeOnReturn),
    returnCharge: num(d.returnCharge),
    freeShipOverAmount: num(d.freeShipOverAmount),
  };
}

export const cleanTags = (raw: string) => [...new Set(raw.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, MAX_TAGS);

export function checkProductFields(f: ProductFields): string {
  if (!f.name.trim()) return "등록상품명을 넣어 주세요.";
  if (f.name.length > 100 || f.displayName.length > 100) return "상품명은 100자까지 넣을 수 있습니다.";
  if (/\s/.test(f.brand.trim()) || /[^\p{L}\p{N}]/u.test(f.brand.trim())) return "브랜드는 띄어쓰기·특수문자 없이 넣어 주세요.";
  return "";
}

/** 조회 응답 전체를 그대로 두고 고친 칸만 바꾼다(명세: 조회 JSON 수정 후 전송). 승인된 상품은 재승인 요청이 함께 간다 */
export function buildEditBody(raw: unknown, f: ProductFields): Record<string, unknown> {
  const d = ((raw as { data?: unknown })?.data ?? {}) as Record<string, unknown>;
  const items = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  return {
    ...d,
    sellerProductName: f.name.trim(),
    displayProductName: f.displayName.trim(),
    brand: f.brand.trim(),
    requested: NEEDS_REAPPROVAL.includes(text(d.statusName)),
    items: items.map((it) => ({ ...it, searchTags: f.tags })),
  };
}

export function checkDelivery(f: DeliveryFields): string {
  if (!DELIVERY_TYPES.some((t) => t.value === f.deliveryChargeType)) return "배송비 방식을 골라 주세요.";
  const amounts = [f.deliveryCharge, f.deliveryChargeOnReturn, f.returnCharge, f.freeShipOverAmount];
  if (amounts.some((a) => !Number.isInteger(a) || a < 0)) return "금액은 0 이상 정수로 넣어 주세요.";
  if (f.deliveryChargeType === "NOT_FREE" && f.deliveryCharge <= 0) return "유료배송은 기본 배송비가 필요합니다.";
  if (f.deliveryChargeType === "CONDITIONAL_FREE" && (f.deliveryCharge <= 0 || f.freeShipOverAmount <= 0)) return "조건부 무료배송은 기본 배송비와 무료 조건 금액이 필요합니다.";
  return "";
}

export function buildPartialBody(sellerProductId: number, f: DeliveryFields) {
  const free = f.deliveryChargeType === "FREE";
  return {
    sellerProductId,
    deliveryChargeType: f.deliveryChargeType,
    deliveryCharge: free ? 0 : f.deliveryCharge,
    deliveryChargeOnReturn: f.deliveryChargeOnReturn,
    returnCharge: f.returnCharge,
    freeShipOverAmount: f.deliveryChargeType === "CONDITIONAL_FREE" ? f.freeShipOverAmount : 0,
  };
}

export function checkOriginalPrice(next: number): string {
  if (!Number.isInteger(next) || next < 0) return "할인 기준가는 0원 이상 정수로 넣어 주세요.";
  if (next % 10 !== 0) return "할인 기준가는 10원 단위만 됩니다.";
  return "";
}

/** 자동생성옵션 응답. PROCESSING도 실패가 아니므로 구분해 알린다 */
export function autoOptionResult(raw: unknown): { ok: boolean; message: string } {
  const r = (raw ?? {}) as { code?: unknown; message?: unknown; data?: { code?: unknown; message?: unknown } };
  const code = text(r.data?.code ?? r.code).toUpperCase();
  const message = text(r.data?.message ?? r.message);
  if (code === "SUCCESS") return { ok: true, message: message || "적용했습니다." };
  if (code === "PROCESSING") return { ok: true, message: "쿠팡이 처리 중입니다. 잠시 뒤 WING에서 확인해 주세요." };
  return { ok: false, message: message || "쿠팡이 요청을 처리하지 못했습니다." };
}
