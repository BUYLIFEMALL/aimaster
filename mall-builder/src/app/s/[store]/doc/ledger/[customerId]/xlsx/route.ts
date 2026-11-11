// D26 외상 원장 엑셀 — 화면과 같은 데이터·같은 접근 규칙(loadLedger)
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { loadLedger } from "@/lib/statement-data";
import { ledgerPeriod } from "@/lib/statements";
import { todayKst } from "@/lib/customerPrices";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request, { params }: { params: Promise<{ store: string; customerId: string }> }) {
  const { store: slug, customerId } = await params;
  const url = new URL(req.url);
  const { from, to } = ledgerPeriod(url.searchParams.get("from"), url.searchParams.get("to"), todayKst());
  const { store, info, customer, ledger } = await loadLedger(slug, customerId, from, to);
  const buyer = customer.kind === "business" && customer.company ? customer.company : customer.name;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("외상 원장");
  ws.addRow([`외상 거래 원장 — ${buyer}`]).font = { bold: true, size: 13 };
  ws.addRow([`기간 ${from} ~ ${to}`, "", "", `${info.company_name || store.name} ${info.business_no}`]);
  ws.addRow(["이월 잔액", ledger.opening, "외상 사용", ledger.sums.charge, "입금", ledger.sums.payment, "조정", ledger.sums.adjust, "기말 잔액", ledger.closing]);
  ws.addRow([]);
  ws.addRow(["일자", "구분", "주문번호", "메모", "금액", "잔액"]).font = { bold: true };
  ws.addRow([from, "이월", "", "", null, ledger.opening]);
  for (const r of ledger.rows) ws.addRow([r.date, r.label, r.order_no ?? "", r.note, r.amount, r.balance]);
  [12, 10, 16, 30, 12, 12].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.getColumn(5).numFmt = "#,##0";
  ws.getColumn(6).numFmt = "#,##0";
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const name = `외상원장_${buyer}_${from}_${to}.xlsx`.replace(/[\\/:*?"<>|]/g, "_");
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
