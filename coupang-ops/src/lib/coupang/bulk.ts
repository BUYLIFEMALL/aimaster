// 일괄 가격·재고 계산(묶음 5). 외부 호출 없음(tests/bulk.test.mjs).
// 보내기는 기존 updatePriceAction·updateQuantityAction을 1건씩 부른다(재시도 없음, 직전 값 재확인).
import { checkPrice, checkQuantity } from "./items.ts";

export const BULK_MAX = 30; // 한 번에 바꾸는 옵션 수(호출 수·실수 범위 보호)

export type PriceMode = "percent" | "amount" | "fixed";
export type QtyMode = "fixed" | "add";

/** 새 판매가. 쿠팡 규칙에 맞춰 10원 단위로 반올림한다 */
export function bulkPrice(current: number, mode: PriceMode, value: number): number {
  const raw = mode === "percent" ? current * (1 + value / 100) : mode === "amount" ? current + value : value;
  return Math.round(raw / 10) * 10;
}

export function bulkQty(current: number, mode: QtyMode, value: number): number {
  return mode === "add" ? current + value : value;
}

export type BulkPreview = { next: number; problem: string };

export function previewPrice(current: number, mode: PriceMode, value: number): BulkPreview {
  if (!Number.isFinite(value)) return { next: current, problem: "값을 숫자로 넣어 주세요." };
  const next = bulkPrice(current, mode, value);
  return { next, problem: checkPrice(current, next) };
}

export function previewQty(current: number, mode: QtyMode, value: number): BulkPreview {
  if (!Number.isFinite(value)) return { next: current, problem: "값을 숫자로 넣어 주세요." };
  const next = bulkQty(current, mode, value);
  return { next, problem: checkQuantity(current, next) };
}
