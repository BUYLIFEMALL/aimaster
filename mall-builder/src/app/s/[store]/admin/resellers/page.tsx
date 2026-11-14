import Link from "next/link";
import { getCertUrl, getStaffStore } from "@/lib/store";
import { getPayoutMin, getPayouts, getResellerApplications, getStoreResellers } from "@/lib/reseller-store";
import { decidePayoutAction, decideResellerApplyAction, setPayoutMinAction, setResellerApplyOpenAction } from "@/lib/reseller-actions";
import { PAYEE_TYPE_LABEL, resellerApplyOpen } from "@/lib/reseller-apply";
import { PAYEE_LABEL, PAYOUT_MIN, PAYOUT_STATUS_LABEL, defaultDeduction } from "@/lib/reseller";
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
  const [resellers, payouts, apps, payoutMin] = await Promise.all([getStoreResellers(store.id), getPayouts(store.id), getResellerApplications(store.id), getPayoutMin(store.id)]);
  const applyOpen = resellerApplyOpen(store.modules);
  const pendingApps = apps.filter((a) => a.status === "pending");
  const fileUrls = new Map(await Promise.all(pendingApps.map(async (a) => [a.id, { book: await getCertUrl(a.bankbook_path), doc: await getCertUrl(a.doc_path) }] as const)));
  const name = new Map(resellers.map((r) => [r.id, `${r.code} · ${r.customer?.company || r.customer?.name || ""}`]));
  const waiting = payouts.filter((p) => p.status === "requested");

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/resellers">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <h2 className="text-lg font-semibold">🤝 리셀러</h2>
      <p className="mt-1 text-sm text-gray-600">회원이 리셀러 신청을 내면 아래에서 승인하거나, 손님 상세에서 바로 지정합니다. 리셀러 링크로 30일 안 들어온 주문에 리셀러가 기록되고, 결제되면 품목마다 (판매가 − 쿠폰 나눔) × (상품 리셀러율 + 리셀러 추가율)이 「지급 예정」 → 구매 확정 때 「지급 완료」(잔고 적립). 확정 전 취소·반품은 보류, 확정 뒤 반품은 직권 차감으로 처리합니다.</p>

      {/* M1-4(0071) 리셀러 신청 — 받기 켜기/끄기, 대기 신청 승인(추가 수수료율 선택)·반려 */}
      <section className="mt-4 rounded-lg border p-4 text-sm" data-reseller-applications>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">📝 리셀러 신청 <b className={pendingApps.length ? "text-red-700" : ""}>{pendingApps.length}</b></h3>
          <span className={`rounded px-1.5 text-xs ${applyOpen ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{applyOpen ? "신청 받는 중" : "신청 안 받음"}</span>
          <span className="text-xs text-gray-500">신청 주소: /s/{store.slug}/reseller/apply</span>
          <form action={setResellerApplyOpenAction.bind(null, store.slug, store.id, !applyOpen)} className="ml-auto">
            <button className="min-h-10 rounded border px-3 py-1.5 text-xs" data-reseller-apply-toggle>{applyOpen ? "신청 그만 받기" : "리셀러 신청 받기"}</button>
          </form>
        </div>
        <p className="mt-1 text-xs text-gray-500">리셀러 수수료는 공급사가 상품마다 정한 율을 따릅니다. 승인 때 적는 「추가 수수료율」은 본사 몫에서 더 얹어 주는 율이고, 비우면 0%입니다.</p>
        {pendingApps.length === 0 ? (
          <p className="mt-1 text-xs text-gray-500">확인할 리셀러 신청이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {pendingApps.map((a) => (
              <li key={a.id} className="rounded border p-3" data-reseller-app>
                <p><b>{a.name}</b> <span className="text-xs text-gray-500">· {PAYEE_TYPE_LABEL[a.payee_type]}{a.biz_no && ` ${a.biz_no}`} · {formatDateTime(a.created_at)} 신청</span></p>
                <p className="mt-0.5 break-all text-xs text-gray-600">채널 {a.channel} · {a.phone || "—"} · 정산 {a.bank_name} {a.bank_account} ({a.bank_holder})</p>
                {a.intro && <p className="mt-0.5 text-xs text-gray-500">「{a.intro}」</p>}
                <p className="mt-1 flex gap-3 text-xs">
                  {fileUrls.get(a.id)?.book && <a href={fileUrls.get(a.id)!.book!} target="_blank" rel="noreferrer" className="text-blue-700 underline">통장 사본 보기(10분)</a>}
                  {fileUrls.get(a.id)?.doc && <a href={fileUrls.get(a.id)!.doc!} target="_blank" rel="noreferrer" className="text-blue-700 underline">사업자등록증 보기(10분)</a>}
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <form action={decideResellerApplyAction.bind(null, store.slug, a.id, "approve")} className="flex flex-wrap items-center gap-2 text-xs">
                    <label>추가 수수료 <input name="rate" inputMode="decimal" placeholder="0" className="w-16 rounded border px-2 py-1.5" />%</label>
                    <button className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-white" data-reseller-approve>리셀러 승인</button>
                  </form>
                  <form action={decideResellerApplyAction.bind(null, store.slug, a.id, "reject")} className="flex items-center gap-2 text-xs">
                    <input name="note" maxLength={300} placeholder="반려 사유(신청자에게 보임)" className="rounded border px-2 py-1.5" />
                    <button className="min-h-10 rounded border border-red-300 px-3 py-1.5 text-red-700">반려</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4" data-payout-requests>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">출금 신청 처리 대기 <b className={waiting.length ? "text-red-700" : ""}>{waiting.length}</b></h3>
          {/* M1-7(0075) 몰별 최소 출금 금액 */}
          <form action={setPayoutMinAction.bind(null, store.slug, store.id)} className="ml-auto flex items-center gap-1 text-xs" data-payout-min>
            최소 출금 <input name="payout_min" inputMode="numeric" defaultValue={payoutMin ?? PAYOUT_MIN} className="w-24 rounded border px-2 py-1.5 text-right" />원
            <button className="min-h-10 rounded border px-2 py-1.5">저장</button>
          </form>
        </div>
        {waiting.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">처리할 출금 신청이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {waiting.map((p) => (
              <li key={p.id} className="rounded border p-3 text-sm" data-payout-row>
                <p><b>{name.get(p.reseller_id) ?? "리셀러"}</b> · {formatWon(p.amount)} <span className="text-xs text-gray-500">({PAYEE_LABEL[p.payee_type ?? "individual"]})</span></p>
                <p className="text-xs text-gray-600">{p.bank_name} {p.bank_account} · 예금주 {p.bank_holder} · 신청 {formatDateTime(p.requested_at)}</p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <form action={decidePayoutAction.bind(null, store.slug, p.id, "paid")} className="flex flex-wrap items-end gap-2">
                    <label className="text-xs">공제 <input name="deduction" inputMode="numeric" defaultValue={defaultDeduction(p.amount, p.payee_type)} className="w-24 rounded border px-2 py-1.5 text-right" />원</label>
                    <span className="text-xs text-gray-500" data-payout-transfer>기본 이체 {formatWon(p.amount - defaultDeduction(p.amount, p.payee_type))}</span>
                    <input name="reason" placeholder="비고(선택, 예: 11-12 송금)" maxLength={200} className="rounded border px-2 py-1.5 text-xs" />
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
              <li key={p.id}>{formatDateTime(p.decided_at ?? p.requested_at)} · {name.get(p.reseller_id)} · {formatWon(p.amount)} · <b>{PAYOUT_STATUS_LABEL[p.status]}</b>{p.status === "paid" && p.transfer_amount != null && ` (공제 ${formatWon(p.deduction ?? 0)} → 이체 ${formatWon(p.transfer_amount)})`}{p.reason && ` — ${p.reason}`}</li>
            ))}
          </ul>
        </details>
      )}
    </AdminShell>
  );
}
