import Link from "next/link";
import { getCertUrl, getStaffStore } from "@/lib/store";
import { getPayoutMin, getPayouts, getResellerApplications, getResellerPayees, getRewardProducts, getRewards, getStoreResellers, type RewardStatus } from "@/lib/reseller-store";
import {
  adjustResellerAction,
  decidePayoutAction,
  decideResellerApplyAction,
  decideRewardAction,
  setPayoutMinAction,
  setResellerApplyOpenAction,
  setRewardProductsAction,
  updateResellerAccountAction,
} from "@/lib/reseller-actions";
import { PAYEE_TYPE_LABEL, resellerApplyOpen } from "@/lib/reseller-apply";
import { PAYEE_LABEL, PAYOUT_MIN, PAYOUT_STATUS_LABEL, defaultDeduction } from "@/lib/reseller";
import { formatWon } from "@/lib/products";
import { formatDateTime } from "@/lib/orders";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 운영자 「리셀러」 — M1-8 탭 4개: 리셀러 계정(신청 승인·추가율·쉬기) · 리워드 상품(상품별 율 일괄) · 리워드 적립 내역(보류 지급/삭제·직권) · 출금 신청 관리(공제·이체)
const TABS = [
  { id: "accounts", label: "리셀러 계정" },
  { id: "products", label: "리워드 상품" },
  { id: "rewards", label: "리워드 적립 내역" },
  { id: "payouts", label: "출금 신청 관리" },
] as const;
type Tab = (typeof TABS)[number]["id"];
const REWARD_STATUS_LABEL: Record<RewardStatus, string> = { pending: "지급 예정", paid: "지급 완료", held: "보류", deleted: "삭제" };
const REWARD_BADGE: Record<RewardStatus, string> = { pending: "bg-amber-50 text-amber-800", paid: "bg-emerald-50 text-emerald-800", held: "bg-red-50 text-red-700", deleted: "bg-gray-100 text-gray-500" };

export default async function AdminResellersPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ error?: string; ok?: string; msg?: string; tab?: string; status?: string }>;
}) {
  const { store: slug } = await params;
  const { error, ok, msg, tab: rawTab, status: rawStatus } = await searchParams;
  const tab: Tab = (TABS.find((t) => t.id === rawTab)?.id ?? "accounts") as Tab;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/resellers`);
  if (!staff) return <NoPermission />;
  const resellers = await getStoreResellers(store.id);
  const name = new Map(resellers.map((r) => [r.id, `${r.code} · ${r.customer?.company || r.customer?.name || ""}`]));
  const here = (t: Tab, extra = "") => `/s/${store.slug}/admin/resellers?tab=${t}${extra}`;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/resellers">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <h2 className="text-lg font-semibold">🤝 리셀러</h2>
      <p className="mt-1 text-sm text-gray-600">리셀러 링크로 30일 안 들어온 주문에 리셀러가 기록되고, 결제되면 품목마다 (판매가 − 쿠폰 나눔) × (상품 리셀러율 + 리셀러 추가율)이 「지급 예정」 → 구매 확정 때 「지급 완료」(잔고 적립). 확정 전 취소·반품은 보류, 확정 뒤 반품은 직권 차감으로 처리합니다.</p>
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b" data-reseller-tabs>
        {TABS.map((t) => (
          <Link key={t.id} href={here(t.id)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === t.id ? "border-gray-900 font-semibold" : "border-transparent text-gray-500"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4">
        {tab === "accounts" && <AccountsTab storeId={store.id} slug={store.slug} modules={store.modules} resellers={resellers} name={name} />}
        {tab === "products" && <ProductsTab storeId={store.id} slug={store.slug} />}
        {tab === "rewards" && <RewardsTab storeId={store.id} slug={store.slug} resellers={resellers} name={name} status={rawStatus} />}
        {tab === "payouts" && <PayoutsTab storeId={store.id} slug={store.slug} name={name} />}
      </div>
    </AdminShell>
  );
}

type Resellers = Awaited<ReturnType<typeof getStoreResellers>>;

// ── 리셀러 계정: 신청(0071) + 목록에서 추가율·쉬기 바로 바꾸기 ──
async function AccountsTab({ storeId, slug, modules, resellers, name }: { storeId: string; slug: string; modules: unknown; resellers: Resellers; name: Map<string, string> }) {
  const [apps, payees] = await Promise.all([getResellerApplications(storeId), getResellerPayees(storeId)]);
  const applyOpen = resellerApplyOpen(modules);
  const pendingApps = apps.filter((a) => a.status === "pending");
  const fileUrls = new Map(await Promise.all(pendingApps.map(async (a) => [a.id, { book: await getCertUrl(a.bankbook_path), doc: await getCertUrl(a.doc_path) }] as const)));
  return (
    <>
      <section className="rounded-lg border p-4 text-sm" data-reseller-applications>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">📝 리셀러 신청 <b className={pendingApps.length ? "text-red-700" : ""}>{pendingApps.length}</b></h3>
          <span className={`rounded px-1.5 text-xs ${applyOpen ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{applyOpen ? "신청 받는 중" : "신청 안 받음"}</span>
          <span className="text-xs text-gray-500">신청 주소: /s/{slug}/reseller/apply</span>
          <form action={setResellerApplyOpenAction.bind(null, slug, storeId, !applyOpen)} className="ml-auto">
            <button className="min-h-10 rounded border px-3 py-1.5 text-xs" data-reseller-apply-toggle>{applyOpen ? "신청 그만 받기" : "리셀러 신청 받기"}</button>
          </form>
        </div>
        <p className="mt-1 text-xs text-gray-500">승인 때 적는 「추가 수수료율」은 본사 몫에서 더 얹어 주는 율이고, 비우면 0%입니다(상품 리셀러율은 「리워드 상품」 탭).</p>
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
                  <form action={decideResellerApplyAction.bind(null, slug, a.id, "approve")} className="flex flex-wrap items-center gap-2 text-xs">
                    <label>추가 수수료 <input name="rate" inputMode="decimal" placeholder="0" className="w-16 rounded border px-2 py-1.5" />%</label>
                    <button className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-white" data-reseller-approve>리셀러 승인</button>
                  </form>
                  <form action={decideResellerApplyAction.bind(null, slug, a.id, "reject")} className="flex items-center gap-2 text-xs">
                    <input name="note" maxLength={300} placeholder="반려 사유(신청자에게 보임)" className="rounded border px-2 py-1.5" />
                    <button className="min-h-10 rounded border border-red-300 px-3 py-1.5 text-red-700">반려</button>
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
          <p className="mt-1 text-sm text-gray-500">아직 리셀러가 없습니다. 신청을 받거나 「손님」 상세 아래 「🤝 리셀러」에서 지정해 주세요.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm" data-reseller-table>
              <thead>
                <tr className="border-b text-left text-gray-500"><th className="py-2">리셀러</th><th>정산</th><th className="text-right">연결 손님</th><th className="text-right">이번 달 적립</th><th className="text-right">잔액</th><th>추가율 · 상태</th></tr>
              </thead>
              <tbody>
                {resellers.map((r) => {
                  const pe = payees.get(r.id);
                  return (
                    <tr key={r.id} className={`border-b align-top ${r.active ? "" : "text-gray-400"}`}>
                      <td className="py-2">
                        <Link href={`/s/${slug}/admin/customers/${r.customer_id}#reseller`} className="underline">{name.get(r.id)}</Link>
                        {pe?.channel && <p className="max-w-[16rem] truncate text-xs text-gray-500" title={pe.channel}>{pe.channel}</p>}
                      </td>
                      <td className="text-xs">{pe ? <>{PAYEE_LABEL[(pe.payee_type as "individual" | "business") ?? "individual"]}<br />{pe.bank || "계좌 없음"}</> : "—"}</td>
                      <td className="text-right">{r.linked}명</td>
                      <td className="text-right">{formatWon(r.month_earned)}</td>
                      <td className="text-right font-semibold">{formatWon(r.balance)}</td>
                      <td>
                        <form action={updateResellerAccountAction.bind(null, slug, storeId, r.customer_id, r.code)} className="flex items-center gap-1 text-xs" data-reseller-account>
                          <input name="rate" inputMode="decimal" defaultValue={r.rate} className="w-14 rounded border px-1.5 py-1 text-right" />%
                          <label className="ml-1 flex items-center gap-0.5"><input type="checkbox" name="active" defaultChecked={r.active} /> 활동</label>
                          <button className="ml-1 rounded border px-2 py-1">저장</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ── 리워드 상품: 공급사 상품 = 공급사율(읽기), 본사 상품 = 본사가 일괄 지정, 추가율 중복 차단 ──
async function ProductsTab({ storeId, slug }: { storeId: string; slug: string }) {
  const { ready, rows } = await getRewardProducts(storeId);
  if (!ready) return <p className="text-sm text-gray-500">리워드 상품 설정은 DB 업데이트(0076) 뒤 쓸 수 있습니다.</p>;
  return (
    <form action={setRewardProductsAction.bind(null, slug, storeId)} className="text-sm" data-reward-products>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-gray-50 p-3 text-xs">
        <span className="font-semibold">고른 상품을</span>
        <label>본사 상품 리셀러율 <input name="rate" inputMode="decimal" placeholder="그대로" className="w-20 rounded border px-2 py-1.5" />%</label>
        <label>
          리셀러 추가율{" "}
          <select name="no_extra" defaultValue="keep" className="rounded border px-2 py-1.5">
            <option value="keep">그대로</option>
            <option value="on">더하지 않음(중복 차단)</option>
            <option value="off">더함</option>
          </select>
        </label>
        <button className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-white">한 번에 바꾸기</button>
        <span className="text-gray-500">공급사 상품의 리셀러율은 공급사가 정합니다(공급가에 반영) — 여기서는 중복 차단만 바뀝니다.</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-gray-500">상품이 없습니다.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b text-left text-gray-500"><th className="w-8 py-2"></th><th>상품</th><th className="text-right">판매가</th><th>구분</th><th className="text-right">상품 리셀러율</th><th>리셀러 추가율</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const rate = p.supplier ? p.supplier_rate ?? 0 : p.reward_rate;
                return (
                  <tr key={p.id} className="border-b" data-reward-product>
                    <td className="py-2"><input type="checkbox" name="pid" value={p.id} aria-label={`${p.name} 고르기`} /></td>
                    <td>{p.name}{p.status !== "on_sale" && <span className="ml-1 text-xs text-gray-400">({p.status === "sold_out" ? "품절" : "판매 안 함"})</span>}</td>
                    <td className="text-right">{formatWon(p.base_price)}</td>
                    <td className="text-xs">{p.supplier ? "공급사" : "본사"}</td>
                    <td className="text-right">{rate}%{p.supplier && <span className="ml-1 text-xs text-gray-400">(공급사)</span>}</td>
                    <td className="text-xs">{p.reward_no_extra ? <span className="rounded bg-gray-100 px-1.5">더하지 않음</span> : "더함"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}

// ── 리워드 적립 내역: 상태별, 보류 지급·삭제, 직권 지급·차감 ──
async function RewardsTab({ storeId, slug, resellers, name, status }: { storeId: string; slug: string; resellers: Resellers; name: Map<string, string>; status?: string }) {
  const st = (["pending", "paid", "held", "deleted"] as const).find((x) => x === status);
  const { ready, rows } = await getRewards(storeId, st);
  if (!ready) return <p className="text-sm text-gray-500">리워드 적립 내역은 DB 업데이트(0074) 뒤 볼 수 있습니다.</p>;
  const sum = rows.reduce((a, w) => a + (w.status === "deleted" ? 0 : w.amount), 0);
  return (
    <>
      <div className="flex flex-wrap items-center gap-1 text-xs" data-reward-filter>
        <Link href={`/s/${slug}/admin/resellers?tab=rewards`} className={`rounded border px-2.5 py-1 ${!st ? "bg-gray-900 text-white" : ""}`}>전체</Link>
        {(["pending", "paid", "held", "deleted"] as const).map((x) => (
          <Link key={x} href={`/s/${slug}/admin/resellers?tab=rewards&status=${x}`} className={`rounded border px-2.5 py-1 ${st === x ? "bg-gray-900 text-white" : ""}`}>{REWARD_STATUS_LABEL[x]}</Link>
        ))}
        <span className="ml-auto text-gray-500">{rows.length}건 · 합계 {formatWon(sum)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">해당하는 리워드가 없습니다.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm" data-reward-table>
            <thead>
              <tr className="border-b text-left text-gray-500"><th className="py-2">일시 · 주문</th><th>리셀러</th><th>품목</th><th className="text-right">기준 금액</th><th className="text-right">율</th><th className="text-right">리워드</th><th>상태</th></tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} className="border-b align-top">
                  <td className="py-2 text-xs">{formatDateTime(w.created_at)}<br /><Link href={`/s/${slug}/admin/orders/${w.order_id}`} className="underline">{w.order?.order_no ?? "주문"}</Link></td>
                  <td className="text-xs">{name.get(w.reseller_id) ?? "—"}</td>
                  <td className="text-xs">{w.name_snapshot}</td>
                  <td className="text-right">{formatWon(w.base_amount)}</td>
                  <td className="text-right text-xs">{w.product_rate}% + {w.reseller_rate}%</td>
                  <td className="text-right font-semibold">{formatWon(w.amount)}</td>
                  <td className="text-xs">
                    <span className={`rounded px-1.5 ${REWARD_BADGE[w.status]}`}>{REWARD_STATUS_LABEL[w.status]}</span>
                    {w.note && <p className="mt-0.5 max-w-[14rem] text-gray-500">{w.note}</p>}
                    {w.status === "held" && (
                      <div className="mt-1 flex flex-wrap gap-1" data-reward-held>
                        <form action={decideRewardAction.bind(null, slug, w.id, "pay")} className="flex gap-1">
                          <input name="note" placeholder="메모(선택)" maxLength={200} className="w-24 rounded border px-1.5 py-1" />
                          <button className="rounded bg-gray-900 px-2 py-1 text-white">지급</button>
                        </form>
                        <form action={decideRewardAction.bind(null, slug, w.id, "delete")}>
                          <button className="rounded border border-red-300 px-2 py-1 text-red-700">삭제</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="mt-6 rounded-lg border p-4 text-sm" data-reseller-adjust>
        <h3 className="font-semibold">직권 지급·차감</h3>
        <p className="mt-1 text-xs text-gray-500">확정 뒤 반품처럼 자동으로 되돌리지 않는 경우에 씁니다. 사유는 리셀러 내역에 보이고, 차감 뒤 잔고가 0원보다 적어지면 막힙니다.</p>
        {resellers.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500">리셀러가 없습니다.</p>
        ) : (
          <form action={adjustResellerAction.bind(null, slug, storeId)} className="mt-2 flex flex-wrap items-end gap-2 text-xs">
            <select name="reseller_id" className="rounded border px-2 py-1.5">
              {resellers.map((r) => <option key={r.id} value={r.id}>{name.get(r.id)} (잔액 {formatWon(r.balance)})</option>)}
            </select>
            <select name="sign" defaultValue="plus" className="rounded border px-2 py-1.5">
              <option value="plus">지급(+)</option>
              <option value="minus">차감(−)</option>
            </select>
            <input name="amount" inputMode="numeric" placeholder="금액" className="w-28 rounded border px-2 py-1.5 text-right" />
            <input name="note" placeholder="사유(필수)" maxLength={200} className="min-w-48 flex-1 rounded border px-2 py-1.5" />
            <button className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-white">처리</button>
          </form>
        )}
      </section>
    </>
  );
}

// ── 출금 신청 관리(M1-7): 최소 금액, 공제·이체, 반려 ──
async function PayoutsTab({ storeId, slug, name }: { storeId: string; slug: string; name: Map<string, string> }) {
  const [payouts, payoutMin] = await Promise.all([getPayouts(storeId), getPayoutMin(storeId)]);
  const waiting = payouts.filter((p) => p.status === "requested");
  return (
    <>
      <section data-payout-requests>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">출금 신청 처리 대기 <b className={waiting.length ? "text-red-700" : ""}>{waiting.length}</b></h3>
          <form action={setPayoutMinAction.bind(null, slug, storeId)} className="ml-auto flex items-center gap-1 text-xs" data-payout-min>
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
                  <form action={decidePayoutAction.bind(null, slug, p.id, "paid")} className="flex flex-wrap items-end gap-2">
                    <label className="text-xs">공제 <input name="deduction" inputMode="numeric" defaultValue={defaultDeduction(p.amount, p.payee_type)} className="w-24 rounded border px-2 py-1.5 text-right" />원</label>
                    <span className="text-xs text-gray-500" data-payout-transfer>기본 이체 {formatWon(p.amount - defaultDeduction(p.amount, p.payee_type))}</span>
                    <input name="reason" placeholder="비고(선택, 예: 11-12 송금)" maxLength={200} className="rounded border px-2 py-1.5 text-xs" />
                    <button className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-xs text-white" data-payout-paid>송금했음 — 지급 완료</button>
                  </form>
                  <form action={decidePayoutAction.bind(null, slug, p.id, "rejected")} className="flex items-end gap-2">
                    <input name="reason" placeholder="반려 사유(필수)" maxLength={200} className="rounded border px-2 py-1.5 text-xs" />
                    <button className="min-h-10 rounded border border-red-300 px-3 py-1.5 text-xs text-red-700" data-payout-reject>반려(잔액 돌려줌)</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {payouts.length > waiting.length && (
        <section className="mt-6 text-sm">
          <h3 className="text-sm font-semibold">처리한 출금 {payouts.length - waiting.length}건</h3>
          <ul className="mt-1 space-y-0.5 text-xs">
            {payouts.filter((p) => p.status !== "requested").map((p) => (
              <li key={p.id}>{formatDateTime(p.decided_at ?? p.requested_at)} · {name.get(p.reseller_id)} · {formatWon(p.amount)} · <b>{PAYOUT_STATUS_LABEL[p.status]}</b>{p.status === "paid" && p.transfer_amount != null && ` (공제 ${formatWon(p.deduction ?? 0)} → 이체 ${formatWon(p.transfer_amount)})`}{p.reason && ` — ${p.reason}`}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
