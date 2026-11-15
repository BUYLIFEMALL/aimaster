// M2-2(2026-11-15) 운영사 주문 엑셀 — exceljs로 파일 만들기·읽기, 조건에 맞는 주문 모으기(서버 전용)
import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EXPORT_HEADERS, ORDER_EXPORT_MAX, ORDER_SHEET, orderExportRow, type ExportOrder } from "./order-excel";
import { applyOrderFilters, type OrderListQuery } from "./order-list";

export const TRACKING_MAX_BYTES = 4 * 1024 * 1024; // Vercel 함수 요청 한도 4.5MB 아래

const COLS = "order_no, created_at, status, receiver, depositor, memo, subtotal, shipping_fee, total, is_card, is_credit, is_guest, guest_name, courier, tracking_no, mall_builder_order_items(name_snapshot, option_snapshot, qty, cancelled_qty)";

/** 목록과 같은 조건의 주문(최신순, 최대 ORDER_EXPORT_MAX) — 1,000건씩 나눠 읽음 */
export async function loadExportOrders(supabase: SupabaseClient, storeId: string, f: OrderListQuery): Promise<ExportOrder[]> {
  const out: ExportOrder[] = [];
  for (let from = 0; from < ORDER_EXPORT_MAX; from += 1000) {
    const q = supabase.from("mall_builder_orders").select(COLS).eq("store_id", storeId).order("created_at", { ascending: false }).range(from, Math.min(from + 999, ORDER_EXPORT_MAX - 1));
    const { data, error } = await applyOrderFilters(q, f);
    if (error) throw new Error(error.message);
    type Raw = Omit<ExportOrder, "items"> & { mall_builder_order_items: ExportOrder["items"] };
    const rows = (data ?? []) as unknown as Raw[];
    out.push(...rows.map(({ mall_builder_order_items: items, ...o }) => ({ ...o, items: items ?? [] })));
    if (rows.length < 1000) break;
  }
  return out;
}

export async function buildOrdersWorkbook(orders: ExportOrder[], statusLabel: Record<string, string>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(ORDER_SHEET, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.addRow([...EXPORT_HEADERS]).font = { bold: true };
  for (const o of orders) ws.addRow(orderExportRow(o, statusLabel));
  const widths: Record<string, number> = { 주문번호: 18, 주문일시: 17, 주소: 36, 품목: 48, 메모: 24, 송장번호: 18 };
  EXPORT_HEADERS.forEach((h, i) => (ws.getColumn(i + 1).width = widths[h] ?? 12));
  ws.columns.forEach((c) => (c.numFmt = "@")); // 주문번호·연락처·송장번호가 숫자로 바뀌지 않게
  // 송장 칸은 채워 다시 올리는 칸 — 노란 바탕
  for (const n of [EXPORT_HEADERS.length - 1, EXPORT_HEADERS.length]) ws.getColumn(n).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** 올린 파일의 첫 시트(「주문」이 있으면 그 시트) → 글자 표 */
export async function readTrackingTable(buf: ArrayBuffer): Promise<string[][] | { error: string }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf);
  } catch {
    return { error: "엑셀(.xlsx) 파일을 읽지 못했습니다. 주문 엑셀을 내려받아 저장한 파일인지 확인해 주세요." };
  }
  const ws = wb.getWorksheet(ORDER_SHEET) ?? wb.worksheets[0];
  if (!ws) return { error: "시트가 없는 파일입니다." };
  const out: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => (cells[col - 1] = (cell.text ?? "").trim()));
    out[n - 1] = Array.from(cells, (c) => c ?? "");
  });
  return Array.from(out, (r) => r ?? []);
}
