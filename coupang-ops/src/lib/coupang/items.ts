// 옵션(아이템)별 가격·재고·판매 상태(C2-2·C2-3·C2-4). 경로·정리·검사만 — 외부 호출 없음(tests/items.test.mjs).
// 명세(2026-10-29 확인): 가격 PUT vendor-items/{id}/prices/{price}(10원 단위, 현재가 −50%~+100%, forceSalePriceUpdate는 쓰지 않음)
//   재고 PUT vendor-items/{id}/quantities/{n} · 판매 중지/재개 PUT vendor-items/{id}/sales/stop|resume · 현재값 GET vendor-items/{id}/inventories

const BASE = "/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items";
export const inventoryPath = (vendorItemId: number) => `${BASE}/${vendorItemId}/inventories`;
export const pricePath = (vendorItemId: number, price: number) => `${BASE}/${vendorItemId}/prices/${price}`;
export const quantityPath = (vendorItemId: number, quantity: number) => `${BASE}/${vendorItemId}/quantities/${quantity}`;
export const salePath = (vendorItemId: number, on: boolean) => `${BASE}/${vendorItemId}/sales/${on ? "resume" : "stop"}`;

export const MAX_QUANTITY = 99999;

export type ProductItem = { vendorItemId: number | null; itemName: string; salePrice: number; originalPrice: number; stock: number };
export type Inventory = { stock: number; salePrice: number; onSale: boolean };

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** 상품 조회 응답(data.items[]) → 옵션 목록. 승인 전 옵션은 vendorItemId가 null(바꿀 수 없음) */
export function normalizeProductItems(raw: unknown): { name: string; statusName: string; items: ProductItem[] } {
  const d = ((raw as { data?: unknown })?.data ?? {}) as { sellerProductName?: unknown; statusName?: unknown; items?: unknown };
  const items = (Array.isArray(d.items) ? d.items : []).map((i: Record<string, unknown>) => ({
    vendorItemId: Number(i.vendorItemId) || null,
    itemName: String(i.itemName ?? "").trim(),
    salePrice: num(i.salePrice),
    originalPrice: num(i.originalPrice),
    stock: num(i.maximumBuyCount),
  }));
  return { name: String(d.sellerProductName ?? "").trim(), statusName: String(d.statusName ?? "").trim(), items };
}

export function normalizeInventory(raw: unknown): Inventory | null {
  const d = (raw as { data?: Record<string, unknown> })?.data;
  if (!d || typeof d !== "object") return null;
  return { stock: num(d.amountInStock), salePrice: num(d.salePrice), onSale: d.onSale === true };
}

/** 가격 변경 전 검사 — 빈 문자열이면 보냄. 쿠팡 거절 규칙과 같게 미리 막는다 */
export function checkPrice(current: number, next: number): string {
  if (!Number.isInteger(next) || next <= 0) return "판매가는 1원 이상 정수로 넣어 주세요.";
  if (next % 10 !== 0) return "쿠팡 판매가는 10원 단위만 됩니다.";
  if (next === current) return "지금 판매가와 같습니다.";
  if (current > 0 && (next < current * 0.5 || next > current * 2)) return `한 번에 지금 판매가(${current.toLocaleString()}원)의 50% 인하 ~ 100% 인상까지만 바꿀 수 있습니다(${Math.ceil(current * 0.5 / 10) * 10}~${current * 2}원).`;
  return "";
}

/** S3 재고 0개 옵션 판매 재개 경고. 막지는 않는다 */
export const resumeWarning = (stock: number) => (stock <= 0 ? " ⚠ 재고가 0개입니다. 재개해도 품절로 보이니 재고를 먼저 넣어 주세요." : "");

export function checkQuantity(current: number, next: number): string {
  if (!Number.isInteger(next) || next < 0) return "재고는 0 이상 정수로 넣어 주세요.";
  if (next > MAX_QUANTITY) return `재고는 ${MAX_QUANTITY.toLocaleString()}개까지 넣을 수 있습니다.`;
  if (next === current) return "지금 재고와 같습니다.";
  return "";
}
