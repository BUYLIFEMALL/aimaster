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

// R6 파일로 일괄 변경. 옵션마다 쿠팡을 읽고 쓰므로(옵션·값마다 2회) 한 파일 상한을 둔다
export const BULK_FILE_MAX = 100;
export const BULK_FILE_HEADERS = ["옵션ID", "상품", "옵션", "지금 판매가", "지금 재고", "새 판매가", "새 재고"];
export type BulkEntry = { vendorItemId: number; price: number | null; qty: number | null };

export function parseBulkFile(rows: Record<string, string>[]): { entries: BulkEntry[]; problems: string[]; over: number } {
  const entries: BulkEntry[] = [];
  const problems: string[] = [];
  const seen = new Set<number>();
  const num = (v: unknown) => {
    const t = String(v ?? "").replace(/[,\s원개]/g, "");
    return t === "" ? null : Number(t);
  };
  rows.forEach((row, i) => {
    const line = `${i + 2}번째 줄`;
    const price = num(row["새 판매가"]);
    const qty = num(row["새 재고"]);
    if (price === null && qty === null) return;
    const id = Number(String(row["옵션ID"] ?? "").replace(/\D/g, "") || NaN);
    if (!Number.isSafeInteger(id) || id <= 0 || /[^\d\s]/.test(String(row["옵션ID"] ?? ""))) return void problems.push(`${line}: 옵션ID를 읽지 못했습니다.`);
    if (seen.has(id)) return void problems.push(`${line}: 같은 옵션이 두 번 있습니다.`);
    if (price !== null && (!Number.isInteger(price) || price <= 0 || price % 10 !== 0)) return void problems.push(`${line}: 판매가는 10원 단위입니다.`);
    if (qty !== null && (!Number.isInteger(qty) || qty < 0)) return void problems.push(`${line}: 재고는 0 이상 정수입니다.`);
    seen.add(id);
    entries.push({ vendorItemId: id, price, qty });
  });
  return { entries: entries.slice(0, BULK_FILE_MAX), problems, over: Math.max(0, entries.length - BULK_FILE_MAX) };
}
