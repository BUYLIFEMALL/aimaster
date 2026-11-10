import { loadLedger } from "@/lib/statement-data";
import { formatWon } from "@/lib/products";
import { ledgerPeriod } from "@/lib/statements";
import { todayKst } from "@/lib/customerPrices";
import { PrintBar } from "../../print-button";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const n = (v: number) => v.toLocaleString("ko-KR");

// D26 외상 원장(손님 1명 × 기간) — 인쇄용 A4 + 엑셀
export default async function LedgerDocPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; customerId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { store: slug, customerId } = await params;
  const q = await searchParams;
  const { from, to } = ledgerPeriod(q.from, q.to, todayKst());
  const { store, info, customer, ledger, staff } = await loadLedger(slug, customerId, from, to);
  const back = staff ? `/s/${slug}/admin/customers/${customerId}` : `/s/${slug}/my`;
  const buyer = customer.kind === "business" && customer.company ? customer.company : customer.name;
  const xlsx = `/s/${slug}/doc/ledger/${customerId}/xlsx?from=${from}&to=${to}`;

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-6 print:bg-white print:p-0">
      <PrintBar
        back={back}
        backLabel={staff ? "손님 상세" : "마이페이지"}
        extra={
          <>
            <form className="flex items-center gap-1" data-ledger-period>
              <input type="date" name="from" defaultValue={from} className="rounded border px-2 py-1" />
              <span>~</span>
              <input type="date" name="to" defaultValue={to} className="rounded border px-2 py-1" />
              <button className="min-h-10 rounded border bg-white px-3">기간 보기</button>
            </form>
            <a href={xlsx} className="min-h-10 rounded border bg-white px-3 py-2" data-ledger-xlsx>📊 엑셀</a>
          </>
        }
      />
      <article className="doc mx-auto max-w-[210mm] bg-white p-8 text-[13px] shadow print:shadow-none" data-ledger-doc>
        <header className="flex items-end justify-between border-b-2 border-gray-900 pb-2">
          <h1 className="text-2xl font-bold tracking-[0.3em]">외상 거래 원장</h1>
          <p className="text-right text-xs text-gray-600">기간 {from} ~ {to}</p>
        </header>
        <section className="mt-3 flex justify-between text-xs">
          <p>
            거래처 <b className="text-sm">{buyer}</b>
            {customer.business_no && <span className="ml-2 text-gray-600">({customer.business_no})</span>}
          </p>
          <p className="text-right">
            {info.company_name || store.name} · {info.business_no}
            <br />
            {info.phone}
          </p>
        </section>

        <table className="mt-3 w-full border-collapse text-xs" data-ledger-summary>
          <tbody>
            <tr className="bg-gray-50">
              <th className="border p-1">이월 잔액</th>
              <th className="border p-1">외상 사용</th>
              <th className="border p-1">입금</th>
              <th className="border p-1">조정</th>
              <th className="border p-1">기말 잔액</th>
              <th className="border p-1">외상 한도</th>
            </tr>
            <tr className="text-right">
              <td className="border p-1">{n(ledger.opening)}</td>
              <td className="border p-1">{n(ledger.sums.charge)}</td>
              <td className="border p-1">{n(ledger.sums.payment)}</td>
              <td className="border p-1">{n(ledger.sums.adjust)}</td>
              <td className="border p-1 font-bold" data-ledger-closing>{n(ledger.closing)}</td>
              <td className="border p-1">{n(customer.credit_limit)}</td>
            </tr>
          </tbody>
        </table>

        <table className="mt-4 w-full border-collapse text-xs" data-ledger-rows>
          <thead className="bg-gray-50">
            <tr>
              <th className="w-24 border p-1 text-left">일자</th>
              <th className="w-16 border p-1 text-left">구분</th>
              <th className="w-28 border p-1 text-left">주문번호</th>
              <th className="border p-1 text-left">메모</th>
              <th className="w-24 border p-1 text-right">금액</th>
              <th className="w-24 border p-1 text-right">잔액</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-gray-600">
              <td className="border p-1">{from}</td>
              <td className="border p-1" colSpan={3}>이월</td>
              <td className="border p-1" />
              <td className="border p-1 text-right">{n(ledger.opening)}</td>
            </tr>
            {ledger.rows.map((r, i) => (
              <tr key={i}>
                <td className="border p-1">{r.date}</td>
                <td className="border p-1">{r.label}</td>
                <td className="border p-1">{r.order_no ?? ""}</td>
                <td className="border p-1">{r.note}</td>
                <td className="border p-1 text-right">{n(r.amount)}</td>
                <td className="border p-1 text-right">{n(r.balance)}</td>
              </tr>
            ))}
            {ledger.rows.length === 0 && (
              <tr><td className="border p-2 text-center text-gray-500" colSpan={6}>이 기간에 거래가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-gray-500">금액: 외상 사용은 +, 입금은 −로 적습니다. 잔액은 그 거래 뒤 갚아야 할 외상 금액입니다. 기말 잔액 {formatWon(ledger.closing)}.</p>
      </article>
    </main>
  );
}
