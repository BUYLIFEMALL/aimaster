import { loadOrderStatement } from "@/lib/statement-data";
import { formatWon } from "@/lib/products";
import { kstDate } from "@/lib/statements";
import { PrintBar } from "../../print-button";
import { missingRequired } from "@/lib/businessInfo";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const n = (v: number) => v.toLocaleString("ko-KR");

// D26 거래명세서(주문 1건) — 인쇄용 A4. 합계 공급가액·세액은 세금계산서와 같은 계산(src/lib/statements.ts)
export default async function OrderStatementPage({ params }: { params: Promise<{ store: string; id: string }> }) {
  const { store: slug, id } = await params;
  const { store, info, order, customer, statement, staff } = await loadOrderStatement(slug, id);
  const buyerBiz = customer && customer.kind === "business" && customer.company;
  const back = staff ? `/s/${slug}/admin/orders/${id}` : `/s/${slug}/orders/${id}`;

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-6 print:bg-white print:p-0">
      <PrintBar back={back} backLabel="주문 상세" />
      {staff && missingRequired(info).length > 0 && (
        <p className="no-print mx-auto mb-3 max-w-[210mm] rounded bg-amber-50 p-3 text-sm text-amber-800" data-supplier-missing>
          공급자 칸에 빈 곳이 있습니다({missingRequired(info).join(", ")}). 관리 화면 「쇼핑몰 정보」에서 채우면 명세서에 나옵니다.
        </p>
      )}
      <article className="doc mx-auto max-w-[210mm] bg-white p-8 text-[13px] shadow print:shadow-none" data-statement>
        <header className="flex items-end justify-between border-b-2 border-gray-900 pb-2">
          <h1 className="text-2xl font-bold tracking-[0.5em]">거래명세서</h1>
          <p className="text-right text-xs text-gray-600">
            거래일 {kstDate(order.created_at)}
            <br />
            주문번호 {order.order_no}
          </p>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <table className="w-full border text-xs" data-supplier>
            <caption className="border border-b-0 bg-gray-50 py-1 font-semibold">공급자</caption>
            <tbody>
              <tr><th className="w-20 border bg-gray-50 p-1 text-left">상호</th><td className="border p-1">{info.company_name || store.name}</td></tr>
              <tr><th className="border bg-gray-50 p-1 text-left">대표자</th><td className="border p-1">{info.ceo_name}</td></tr>
              <tr><th className="border bg-gray-50 p-1 text-left">사업자번호</th><td className="border p-1">{info.business_no}</td></tr>
              <tr><th className="border bg-gray-50 p-1 text-left">주소</th><td className="border p-1">{info.address}</td></tr>
              <tr><th className="border bg-gray-50 p-1 text-left">전화</th><td className="border p-1">{info.phone}</td></tr>
            </tbody>
          </table>
          <table className="w-full border text-xs" data-buyer>
            <caption className="border border-b-0 bg-gray-50 py-1 font-semibold">공급받는자</caption>
            <tbody>
              <tr><th className="w-20 border bg-gray-50 p-1 text-left">상호(이름)</th><td className="border p-1">{buyerBiz ? customer!.company : customer?.name ?? order.receiver?.receiver ?? ""}</td></tr>
              <tr><th className="border bg-gray-50 p-1 text-left">대표자</th><td className="border p-1">{buyerBiz ? customer!.ceo_name ?? "" : ""}</td></tr>
              <tr><th className="border bg-gray-50 p-1 text-left">사업자번호</th><td className="border p-1">{buyerBiz ? customer!.business_no ?? "" : ""}</td></tr>
              <tr><th className="border bg-gray-50 p-1 text-left">받는 곳</th><td className="border p-1">{[order.receiver?.addr1, order.receiver?.addr2].filter(Boolean).join(" ")}</td></tr>
              <tr><th className="border bg-gray-50 p-1 text-left">연락처</th><td className="border p-1">{order.receiver?.phone ?? customer?.phone ?? ""}</td></tr>
            </tbody>
          </table>
        </section>

        <p className="mt-4 text-sm">
          합계 금액 <b className="text-lg" data-statement-total>{formatWon(statement.totals.amount)}</b>
          <span className="ml-2 text-xs text-gray-600">(공급가액 {n(statement.totals.supply)}원 + 세액 {n(statement.totals.tax)}원)</span>
        </p>

        <table className="mt-2 w-full border-collapse text-xs" data-statement-rows>
          <thead className="bg-gray-50">
            <tr>
              <th className="border p-1 text-left">품목</th>
              <th className="w-12 border p-1 text-right">수량</th>
              <th className="w-20 border p-1 text-right">단가</th>
              <th className="w-24 border p-1 text-right">공급가액</th>
              <th className="w-20 border p-1 text-right">세액</th>
              <th className="w-24 border p-1 text-right">금액</th>
            </tr>
          </thead>
          <tbody>
            {statement.rows.map((r, i) => (
              <tr key={i}>
                <td className="border p-1">
                  {r.name}
                  {r.option && <span className="text-gray-600"> ({r.option})</span>}
                  {r.exempt && r.kind === "item" && <span className="ml-1 text-[10px] text-gray-500">[면세]</span>}
                </td>
                <td className="border p-1 text-right">{r.qty != null ? n(r.qty) : ""}</td>
                <td className="border p-1 text-right">{r.unit != null ? n(r.unit) : ""}</td>
                <td className="border p-1 text-right">{n(r.supply)}</td>
                <td className="border p-1 text-right">{n(r.tax)}</td>
                <td className="border p-1 text-right">{n(r.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-semibold">
            <tr>
              <td className="border p-1" colSpan={3}>합계</td>
              <td className="border p-1 text-right">{n(statement.totals.supply)}</td>
              <td className="border p-1 text-right">{n(statement.totals.tax)}</td>
              <td className="border p-1 text-right">{n(statement.totals.amount)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-3 text-[11px] text-gray-500">
          부분 취소한 수량은 뺀 금액입니다. 세액은 세금계산서와 같은 방법(금액 ÷ 11, 쿠폰·포인트 할인은 금액 비율로 나눔)으로 계산했습니다.
          {order.is_credit && " 외상(후불) 주문입니다."}
        </p>
        <p className="mt-6 text-right text-sm">위와 같이 거래합니다. &nbsp; {info.company_name || store.name}</p>
      </article>
    </main>
  );
}
