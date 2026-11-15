// M2-8(2026-11-15) 운영사 유저 엑셀 — 조건에 맞는 유저 모으기·파일 만들기(서버 전용)
import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CUSTOMER_EXPORT_HEADERS, CUSTOMER_EXPORT_MAX, CUSTOMER_SHEET, customerExportRow, type ExportCustomer } from "./customer-excel";
import { applyCustomerFilters, type CustomerListQuery } from "./customer-list";

const COLS = "name, phone, approval_status, member_status, company, business_no, ceo_name, credit_limit, birth_md, marketing_agree, created_at, grade:mall_builder_customer_grades(name)";

/** 목록과 같은 조건의 유저(최신 가입순, 최대 CUSTOMER_EXPORT_MAX) — 1,000명씩 나눠 읽음 */
export async function loadExportCustomers(supabase: SupabaseClient, storeId: string, f: CustomerListQuery): Promise<ExportCustomer[]> {
  const out: ExportCustomer[] = [];
  for (let from = 0; from < CUSTOMER_EXPORT_MAX; from += 1000) {
    const q = supabase
      .from("mall_builder_store_customers")
      .select(COLS)
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .range(from, Math.min(from + 999, CUSTOMER_EXPORT_MAX - 1));
    const { data, error } = await applyCustomerFilters(q, f);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as ExportCustomer[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export async function buildCustomersWorkbook(rows: ExportCustomer[], approvalLabel: Record<string, string>, memberLabel: Record<string, string>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(CUSTOMER_SHEET, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.addRow([...CUSTOMER_EXPORT_HEADERS]).font = { bold: true };
  for (const c of rows) ws.addRow(customerExportRow(c, approvalLabel, memberLabel));
  const widths: Record<string, number> = { 휴대폰: 15, 회원구분: 16, 상호: 22, 사업자번호: 15, 가입일시: 17 };
  CUSTOMER_EXPORT_HEADERS.forEach((h, i) => (ws.getColumn(i + 1).width = widths[h.replace(/\s/g, "")] ?? 12));
  ws.columns.forEach((c) => (c.numFmt = "@")); // 휴대폰·사업자번호가 숫자로 바뀌지 않게
  return Buffer.from(await wb.xlsx.writeBuffer());
}
