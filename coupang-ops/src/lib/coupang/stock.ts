// B1 품절 예방 재고 점검 — 판정·기준값·옵션 고르기만, 외부 호출 없음(tests/stock.test.mjs).
// 옵션 재고는 옵션 1개당 1회 호출이라(명세 2026-10-31 확인) 고정 IP 사용량 보호를 위해 한 번에 상품 20개·옵션 60개까지만 읽는다.
import type { Inventory, ProductItem } from "./items";

export const STOCK_PAGE_SIZE = 20;
export const STOCK_MAX_OPTIONS = 60;
export const STOCK_READ_GAP_SECONDS = 30;
export const DEFAULT_STOCK_LIMIT = 5;
const MAX_STOCK_LIMIT = 9999;

/** 옵션ID가 있어 재고를 읽고 바꿀 수 있는 상태 */
export const isCheckableStatus = (statusName: string) => statusName === "승인완료" || statusName === "부분승인완료";

export type StockLevel = "stopped" | "out" | "low" | "ok";

/** 판매 중지가 먼저(재고가 0이어도 지금 품절 취소 위험은 없음). 기준 수량 이하면 부족 */
export function stockLevel(inv: Pick<Inventory, "stock" | "onSale">, limit: number): StockLevel {
  if (!inv.onSale) return "stopped";
  if (inv.stock <= 0) return "out";
  return inv.stock <= limit ? "low" : "ok";
}

/** 입력값을 0~9999 정수로. 잘못된 값이면 기본값 */
export function cleanStockLimit(raw: unknown): number {
  const text = String(raw ?? "").trim();
  const n = Number(text);
  if (!text || !Number.isInteger(n) || n < 0) return DEFAULT_STOCK_LIMIT;
  return Math.min(n, MAX_STOCK_LIMIT);
}

/** 옵션ID 있는 옵션을 남은 칸만큼 고른다. 못 읽고 넘긴 수를 함께 돌려준다 */
export function pickOptions(items: ProductItem[], room: number): { picked: (ProductItem & { vendorItemId: number })[]; skipped: number } {
  const usable = items.filter((i): i is ProductItem & { vendorItemId: number } => !!i.vendorItemId);
  const take = Math.max(0, room);
  return { picked: usable.slice(0, take), skipped: Math.max(0, usable.length - take) };
}
