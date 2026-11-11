import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { getPayouts, getStoreResellers } from "@/lib/reseller-store";
import { decidePayoutAction } from "@/lib/reseller-actions";
import { PAYOUT_STATUS_LABEL, withholdingHint } from "@/lib/reseller";
import { formatWon } from "@/lib/products";
import { formatDateTime } from "@/lib/orders";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// D33 운영자 「리셀러」 — 리셀러 목록(연결 손님·이번 달 적립·잔액), 출금 신청 처리(직접 송금 뒤 「지급 완료」, 반려는 잔액 돌려줌)
export default async function AdminResellersPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/resellers`);
  if (!staff) return <NoPermission />;
  const [resellers, payouts] = await Promise.all([getStoreResellers(store.id), getPayouts(store.id)]);
  const name = new Map(resellers.map((r) => [r.id, `${r.code} · ${r.customer?.company || r.customer?.name || ""}`]));
  const waiting = payouts.filter((p) => p.status === "requested");

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/resellers">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <h2 className="text-lg font-semibold">🤝 리셀러</h2>
      <p className="mt-1 text-sm text-gray-600">손님 상세에서 리셀러로 지정합니다. 리셀러 링크로 들어와 30일 안 가입한 손님이 연결되고, 그 손님 주문이 구매 확정되면 (결제 − 배송비) × 수수료율이 쌓입니다(확정 뒤 반품은 회수).</p>

      <section className="mt-4" data-payout-requests>
        <h3 className="text-sm font-semibold">출금 신청 처리 대기 <b className={waiting.length ? "text-red-700" : ""}>{waiting.length}</b></h3>
        {waiting.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">처리할 출금 신청이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {waiting.map((p) => (
              <li key={p.id} className="rounded border p-3 text-sm" data-payout-row>
                <p><b>{name.get(p.reseller_id) ?? "리셀러"}</b> · {formatWon(p.amount)} <span className="text-xs text-gray-500">(원천징수 3.3% 참고 {formatWon(withholdingHint(p.amount))})</span></p>
                <p className="text-xs text-gray-600">{p.bank_name} {p.bank_account} · 예금주 {p.bank_holder} · 신청 {formatDateTime(p.requested_at)}</p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <form action={decidePayoutAction.bind(null, store.slug, p.id, "paid")} className="flex items-end gap-2">
                    <input name="reason" placeholder="메모(선택, 예: 11-12 송금)" maxLength={200} className="rounded border px-2 py-1.5 text-xs" />
                    <button className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-xs text-white" data-payout-paid>송금했음 — 지급 완료</button>
                  </form>
                  <form action={decidePayoutAction.bind(null, store.slug, p.id, "rejected")} className="flex items-end gap-2">
                    <input name="reason" placeholder="반려 사유(필수)" maxLength={200} className="rounded border px-2 py-1.5 text-xs" />
                    <button className="min-h-10 rounded border border-red-300 px-3 py-1.5 text-xs text-red-700" data-payout-reject>반려(잔액 돌려줌)</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold">리셀러 {resellers.length}명</h3>
        {resellers.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">아직 리셀러가 없습니다. 「손님」 상세 아래 「🤝 리셀러」에서 지정해 주세요.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm" data-reseller-table>
              <thead><tr className="border-b text-left text-gray-500"><th className="py-2">리셀러</th><th>수수료</th><th className="text-right">연결 손님</th><th className="text-right">이번 달 적립</th><th className="text-right">잔액</th></tr></thead>
              <tbody>
                {resellers.map((r) => (
                  <tr key={r.id} className={`border-b ${r.active ? "" : "text-gray-400"}`}>
                    <td className="py-2"><Link href={`/s/${store.slug}/admin/customers/${r.customer_id}#reseller`} className="underline">{name.get(r.id)}</Link>{!r.active && " (쉬는 중)"}</td>
                    <td>{r.rate}%</td>
                    <td className="text-right">{r.linked}명</td>
                    <td className="text-right">{formatWon(r.month_earned)}</td>
                    <td className="text-right font-semibold">{formatWon(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {payouts.length > waiting.length && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer text-gray-600">처리한 출금 {payouts.length - waiting.length}건</summary>
          <ul className="mt-1 space-y-0.5 text-xs">
            {payouts.filter((p) => p.status !== "requested").map((p) => (
              <li key={p.id}>{formatDateTime(p.decided_at ?? p.requested_at)} · {name.get(p.reseller_id)} · {formatWon(p.amount)} · <b>{PAYOUT_STATUS_LABEL[p.status]}</b>{p.reason && ` — ${p.reason}`}</li>
            ))}
          </ul>
        </details>
      )}
    </AdminShell>
  );
}
