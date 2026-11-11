import { getSupplierLedger, getSupplierSettlements } from "@/lib/supplier-store";
import { SUPPLIER_LEDGER_LABEL, monthKst, monthlySummary } from "@/lib/supplier";
import { formatWon } from "@/lib/products";
import { formatDateTime } from "@/lib/orders";
import { getSupplierContext, NotSupplier, SupplierShell } from "../supplier-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// D37 공급사 「정산」 — 잔액·이번 달 적립·월별 정산서·지급 기록·장부(구매 확정 공급가 적립, 확정 뒤 반품 차감, 운영자 송금)
export default async function SupplierSettlementPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const notice = await searchParams;
  const { user, store, me } = await getSupplierContext(slug, `/s/${slug}/supplier/settlements`);
  const [ledger, settlements] = me ? await Promise.all([getSupplierLedger({ supplierId: me.id }), getSupplierSettlements({ supplierId: me.id })]) : [[], []];
  const balance = ledger.reduce((a, l) => a + l.amount, 0);
  const thisMonth = monthKst(new Date().toISOString());
  const monthEarned = ledger.filter((l) => l.kind === "earn" && monthKst(l.created_at) === thisMonth).reduce((a, l) => a + l.amount, 0);
  const paid = settlements.reduce((a, p) => a + p.amount, 0);
  const months = monthlySummary(ledger);

  return (
    <SupplierShell slug={store.slug} storeName={store.name} email={user.email ?? ""} active="/settlements" notice={notice}>
      {!me ? (
        <NotSupplier />
      ) : (
        <>
          <p className="text-sm text-gray-500">손님이 구매 확정한 내 품목의 공급가 × 수량이 쌓입니다. 확정 뒤 취소·반품되면 빠지고, 몰 운영자가 송금하면 「지급」으로 기록됩니다. 세금계산서는 몰에 발행해 주세요.</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center" data-supplier-settle-summary>
            <div className="rounded border p-2"><p className="text-xs text-gray-500">받을 금액(잔액)</p><p className={`font-semibold ${balance < 0 ? "text-red-700" : "text-emerald-700"}`}>{formatWon(balance)}</p></div>
            <div className="rounded border p-2"><p className="text-xs text-gray-500">이번 달 적립</p><p className="font-semibold">{formatWon(monthEarned)}</p></div>
            <div className="rounded border p-2"><p className="text-xs text-gray-500">지금까지 받은 금액</p><p className="font-semibold">{formatWon(paid)}</p></div>
          </div>
          {balance < 0 && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">지급 뒤 반품된 금액이 있어 다음 정산에서 빠집니다.</p>}

          <section className="mt-6" data-supplier-months>
            <h2 className="text-sm font-semibold">월별 정산서</h2>
            {months.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">아직 구매 확정된 품목이 없습니다.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[360px] text-sm">
                  <thead><tr className="border-b text-left text-gray-500"><th className="py-2">월</th><th className="text-right">적립</th><th className="text-right">차감</th><th className="text-right">순적립</th><th className="text-right">받음</th></tr></thead>
                  <tbody>
                    {months.map((m) => (
                      <tr key={m.month} className="border-b">
                        <td className="py-2">{m.month}</td>
                        <td className="text-right">{formatWon(m.earned)}</td>
                        <td className="text-right text-red-700">{formatWon(m.reclaimed)}</td>
                        <td className="text-right font-semibold">{formatWon(m.net)}</td>
                        <td className="text-right">{formatWon(m.settled)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {ledger.length > 0 && (
            <details className="mt-6 text-sm" open>
              <summary className="cursor-pointer text-gray-600">장부 최근 {Math.min(ledger.length, 100)}건</summary>
              <ul className="mt-1 space-y-0.5 text-xs" data-supplier-ledger>
                {ledger.slice(0, 100).map((l) => (
                  <li key={l.id}>
                    {formatDateTime(l.created_at)} · {SUPPLIER_LEDGER_LABEL[l.kind]} <b className={l.amount < 0 ? "text-red-600" : "text-emerald-700"}>{l.amount > 0 ? "+" : ""}{l.amount.toLocaleString("ko-KR")}원</b> · 잔액 {l.balance_after.toLocaleString("ko-KR")}원{l.note && ` · ${l.note}`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </SupplierShell>
  );
}
