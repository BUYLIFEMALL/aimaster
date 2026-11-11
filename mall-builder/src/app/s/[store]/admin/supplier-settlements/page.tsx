import { getStaffStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { getSupplierLedger, getSupplierSettlements, getSuppliers } from "@/lib/supplier-store";
import { settleSupplierAction } from "@/lib/supplier-actions";
import { SUPPLIER_STATUS_LABEL, monthKst, monthlySummary } from "@/lib/supplier";
import { formatWon } from "@/lib/products";
import { formatDateTime } from "@/lib/orders";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// D37 운영자 「공급사 정산」 — 공급사별 잔액(구매 확정 공급가 − 확정 뒤 차감 − 지급), 이번 달 적립, 대표가 송금한 뒤 「지급 완료」, 월별 합계
export default async function SupplierSettlementsPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/supplier-settlements`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();
  const [suppliers, ledger, settlements, { data: owner }] = await Promise.all([
    getSuppliers(store.id),
    getSupplierLedger({ storeId: store.id }),
    getSupplierSettlements({ storeId: store.id }),
    supabase.rpc("mall_builder_is_store_owner", { p_store_id: store.id }),
  ]);
  const isOwner = owner === true;
  const thisMonth = monthKst(new Date().toISOString());
  const rows = suppliers
    .filter((s) => s.status !== "revoked" && s.status !== "invited")
    .map((s) => {
      const mine = ledger.filter((l) => l.supplier_id === s.id);
      return {
        s,
        balance: mine.reduce((a, l) => a + l.amount, 0),
        month: mine.filter((l) => l.kind === "earn" && monthKst(l.created_at) === thisMonth).reduce((a, l) => a + l.amount, 0),
      };
    });
  const months = monthlySummary(ledger);
  const nameOf = new Map(suppliers.map((s) => [s.id, s.name]));

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/supplier-settlements">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <h2 className="text-lg font-semibold">💰 공급사 정산</h2>
      <p className="mt-1 text-sm text-gray-600">주문이 구매 확정되면 공급사 품목의 공급가 × 수량이 쌓이고, 확정 뒤 취소·반품되면 빠집니다. 공급사에 직접 송금한 뒤 「지급 완료」를 누르세요(대표만). 세금계산서는 공급사가 몰에 발행합니다.</p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">입점한 공급사가 없습니다.</p>
      ) : (
        <ul className="mt-4 space-y-3" data-settle-list>
          {rows.map(({ s, balance, month }) => (
            <li key={s.id} className="rounded border p-3 text-sm" data-settle-row>
              <div className="flex flex-wrap items-center gap-2">
                <b>{s.name}</b>
                <span className="rounded bg-gray-100 px-1.5 text-xs">{SUPPLIER_STATUS_LABEL[s.status]}</span>
                <span className="ml-auto text-xs text-gray-500">이번 달 적립 {formatWon(month)}</span>
              </div>
              <p className="mt-1">
                정산 잔액 <b className={balance < 0 ? "text-red-700" : "text-emerald-700"} data-settle-balance>{formatWon(balance)}</b>
                {balance < 0 && <span className="ml-2 text-xs text-red-700">지급 뒤 반품된 금액입니다. 다음 정산에서 빠집니다.</span>}
              </p>
              {isOwner && balance > 0 && (
                <form action={settleSupplierAction.bind(null, store.slug, s.id)} className="mt-2 flex flex-wrap items-center gap-2" data-settle-form>
                  <input name="amount" inputMode="numeric" defaultValue={balance} aria-label="지급 금액" className="w-32 rounded border px-2 py-1.5" />
                  <input name="memo" maxLength={200} placeholder="메모(예: 11월분 송금)" className="rounded border px-2 py-1.5" />
                  <button className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-xs text-white">송금했음 — 지급 완료</button>
                </form>
              )}
              {!isOwner && balance > 0 && <p className="mt-1 text-xs text-gray-500">지급 완료 기록은 대표만 할 수 있습니다.</p>}
            </li>
          ))}
        </ul>
      )}

      {months.length > 0 && (
        <section className="mt-6" data-settle-months>
          <h3 className="text-sm font-semibold">월별 합계(전체 공급사)</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead><tr className="border-b text-left text-gray-500"><th className="py-2">월</th><th className="text-right">적립</th><th className="text-right">차감</th><th className="text-right">순적립</th><th className="text-right">지급</th></tr></thead>
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
        </section>
      )}

      {settlements.length > 0 && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer text-gray-600">지급 기록 {settlements.length}건</summary>
          <ul className="mt-1 space-y-0.5 text-xs">
            {settlements.map((p) => <li key={p.id}>{formatDateTime(p.paid_at)} · {nameOf.get(p.supplier_id) ?? "공급사"} · <b>{formatWon(p.amount)}</b>{p.memo && ` — ${p.memo}`}</li>)}
          </ul>
        </details>
      )}
    </AdminShell>
  );
}
