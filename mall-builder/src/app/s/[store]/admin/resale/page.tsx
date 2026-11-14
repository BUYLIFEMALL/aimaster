import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import {
  getResaleCatalog,
  getResaleLedger,
  getResaleMirrors,
  getResaleOrders,
  getResalePayouts,
  getResaleRate,
  getResaleStoresOf,
  getStoreResaleApplications,
  getStoresByIds,
} from "@/lib/resale-store";
import {
  addResaleProductsAction,
  confirmResalePaymentAction,
  decideResalePayoutAction,
  requestResalePayoutAction,
  decideResaleAction,
  removeResaleProductAction,
  setResaleOpenAction,
  setResalePeriodAction,
  setResaleRateAction,
} from "@/lib/resale-actions";
import { formatWon } from "@/lib/products";
import { DEFAULT_RESALE_DAYS, MIRROR_STATUS_LABEL, RESALE_LEDGER_LABEL, RESALE_PAYOUT_LABEL, RESALE_PAYOUT_MIN, RESALE_STATUS_LABEL, resaleAccepting, resaleDaysLeft } from "@/lib/resale";
import { formatDateTime, ORDER_STATUS_LABEL } from "@/lib/orders";
import PendingButton from "@/app/pending-button";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// T2-1 「분양」 — 본사(일반 몰): 분양 받기 켜기·신청 승인/반려·분양몰 이용 기간 / 분양몰: 분양자에게 원본 몰·남은 기간 안내
export default async function AdminResalePage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string; q?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg, q } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/resale`);
  if (!staff) return <NoPermission />;

  const notice = (
    <>
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
    </>
  );

  // 분양몰 대표(분양자) 화면
  if (store.kind === "resale") {
    const [[source], mirrors, catalog, ledger, myPayouts, rate] = await Promise.all([
      getStoresByIds(store.source_store_id ? [store.source_store_id] : []),
      getResaleMirrors(store.id),
      getResaleCatalog(store.id, q),
      getResaleLedger(store.id),
      getResalePayouts({ storeId: store.id }),
      getResaleRate(store.id),
    ]);
    const left = resaleDaysLeft(store.resale_expires_at);
    const balance = ledger[0]?.balance_after ?? 0;
    const waitingPayout = myPayouts.find((p) => p.status === "requested");
    return (
      <AdminShell slug={store.slug} storeName={store.name} active="/resale">
        {notice}
        <h2 className="text-lg font-semibold">🏪 내 분양몰</h2>
        <section className="mt-3 rounded-lg border p-4 text-sm" data-resale-self>
          <p>원본 몰: <b>{source?.name ?? "본사 몰"}</b> — 이 몰의 상품을 골라 <b>본사 판매가로</b> 팝니다. 결제·발송은 본사가 맡고, 판매 금액의 수수료 <b data-resale-rate>{rate ?? "—"}%</b>를 받습니다.</p>
          <p className={`mt-2 ${left === 0 ? "text-red-700" : "text-gray-700"}`} data-resale-period>
            {left === 0 ? "이용 기간이 끝나 지금은 새 주문을 받지 않습니다. 본사에 연장을 요청해 주세요." : `이용 기간: ${store.resale_expires_at ? formatDateTime(store.resale_expires_at) : "—"}까지 (${left}일 남음)`}
          </p>
        </section>

        <section id="money" className="mt-6 scroll-mt-4 rounded-lg border p-4 text-sm" data-resale-money>
          <h3 className="font-semibold">💰 매출·정산</h3>
          <p className="mt-1">출금할 수 있는 잔액 <b className="text-lg" data-resale-balance>{formatWon(balance)}</b></p>
          <p className="mt-1 text-xs text-gray-500">손님이 구매 확정하면 (결제 금액 − 배송비) × 수수료 {rate ?? "—"}%가 쌓이고, 그 뒤 반품·취소되면 회수됩니다. 손님 주문의 입금 확인·발송은 본사가 처리하며 진행 상태는 「주문」에서 볼 수 있습니다.</p>
          {waitingPayout ? (
            <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">출금 신청 {formatWon(waitingPayout.amount)} — 본사 처리 대기 중입니다.</p>
          ) : (
            <form action={requestResalePayoutAction.bind(null, store.slug, store.id)} className="mt-3 grid gap-2 text-xs sm:grid-cols-5" data-resale-payout-form>
              <input name="amount" required inputMode="numeric" placeholder={`금액(${RESALE_PAYOUT_MIN.toLocaleString("ko-KR")}원부터)`} className="rounded border px-2 py-1.5 sm:col-span-1" />
              <input name="bank_name" required maxLength={30} placeholder="은행" className="rounded border px-2 py-1.5" />
              <input name="bank_account" required maxLength={40} placeholder="계좌번호" className="rounded border px-2 py-1.5" />
              <input name="bank_holder" required maxLength={30} placeholder="예금주" className="rounded border px-2 py-1.5" />
              <PendingButton pendingText="보내는 중…" className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-white">출금 신청 보내기</PendingButton>
            </form>
          )}
          {ledger.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-gray-600">장부 {ledger.length}건</summary>
              <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                {ledger.map((l) => (
                  <li key={l.id}>{formatDateTime(l.created_at)} · {RESALE_LEDGER_LABEL[l.kind] ?? l.kind} {l.amount > 0 ? "+" : ""}{formatWon(l.amount)} → 잔액 {formatWon(l.balance_after)} · {l.note}</li>
                ))}
              </ul>
            </details>
          )}
          {myPayouts.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-gray-500">
              {myPayouts.slice(0, 10).map((p) => <li key={p.id}>출금 {formatWon(p.amount)} · {RESALE_PAYOUT_LABEL[p.status]}{p.memo ? ` — ${p.memo}` : ""} · {formatDateTime(p.requested_at)}</li>)}
            </ul>
          )}
        </section>

        <section id="mine" className="mt-6 scroll-mt-4" data-resale-mirrors>
          <h3 className="text-sm font-semibold">내 분양 상품 {mirrors.length}개</h3>
          {mirrors.length === 0 ? (
            <p className="mt-1 text-sm text-gray-500">아직 담은 상품이 없습니다. 아래 「본사 상품 담기」에서 골라 주세요.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {mirrors.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2 rounded border p-3 text-sm" data-resale-mirror>
                  <Link href={`/s/${store.slug}/p/${m.id}`} className="min-w-0 flex-1 truncate font-medium underline">{m.name}</Link>
                  <span className={`rounded px-1.5 text-xs ${m.status === "on_sale" ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{MIRROR_STATUS_LABEL[m.status] ?? m.status}</span>
                  <span className="text-xs text-gray-500">판매가 {formatWon(m.base_price)}(본사 판매가) · 1개 팔면 수수료 약 {rate == null ? "—" : formatWon(Math.floor((m.base_price * rate) / 100))}</span>
                  <form action={removeResaleProductAction.bind(null, store.slug, m.id)}>
                    <PendingButton pendingText="빼는 중…" className="min-h-10 rounded border border-red-300 px-2 py-1.5 text-xs text-red-700">빼기</PendingButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="catalog" className="mt-6 scroll-mt-4 rounded-lg border p-4" data-resale-catalog>
          <h3 className="text-sm font-semibold">본사 상품 담기</h3>
          <p className="mt-1 text-xs text-gray-500">담으면 이름·사진·옵션·재고·품절·판매가가 본사 상품과 자동으로 맞춰집니다. 판매가는 본사 판매가 그대로이고, 판매 금액의 수수료 {rate ?? "—"}%가 정산됩니다.</p>
          <form className="mt-2 flex gap-2" action={`/s/${store.slug}/admin/resale#catalog`}>
            <input name="q" defaultValue={q ?? ""} placeholder="상품 이름 검색" className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm" />
            <button className="min-h-10 rounded border px-3 text-sm">검색</button>
          </form>
          {catalog.error ? (
            <p className="mt-2 text-sm text-red-700">{catalog.error}</p>
          ) : catalog.rows.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">담을 수 있는 본사 상품이 없습니다.</p>
          ) : (
            <form action={addResaleProductsAction.bind(null, store.slug, store.id)} className="mt-3 space-y-2">
              <ul className="max-h-[480px] space-y-1 overflow-y-auto">
                {catalog.rows.map((c) => (
                  <li key={c.id}>
                    <label className={`flex items-center gap-2 rounded border p-2 text-sm ${c.added ? "bg-gray-50 text-gray-400" : ""}`}>
                      <input type="checkbox" name="ids" value={c.id} disabled={c.added} />
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {c.image && <img src={c.image} alt="" className="h-full w-full object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="text-xs">{formatWon(c.base_price)}{c.option_count ? ` · 옵션 ${c.option_count}` : ""}{c.status === "sold_out" ? " · 품절" : ""}</span>
                      {c.added && <span className="text-xs">담음</span>}
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <PendingButton pendingText="담는 중…" className="min-h-11 rounded bg-gray-900 px-4 py-2 text-white">고른 상품 담기</PendingButton>
              </div>
            </form>
          )}
        </section>
      </AdminShell>
    );
  }

  const [apps, resaleStores, resaleOrders, payouts, defaultRate] = await Promise.all([
    getStoreResaleApplications(store.id),
    getResaleStoresOf(store.id),
    getResaleOrders(store.id),
    getResalePayouts({ sourceStoreId: store.id }),
    getResaleRate(store.id),
  ]);
  const waitingOrders = resaleOrders.filter((o) => o.status === "pending_payment");
  const waitingPayouts = payouts.filter((p) => p.status === "requested");
  const storeName = new Map(resaleStores.map((r) => [r.id, r.name]));
  const pending = apps.filter((a) => a.status === "pending");
  const done = apps.filter((a) => a.status !== "pending").slice(0, 30);
  const accepting = resaleAccepting(store.modules);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/resale">
      {notice}
      <h2 className="text-lg font-semibold">🏪 분양</h2>
      <p className="mt-1 text-sm text-gray-600">회원이 이 몰의 상품을 자기 이름의 몰(분양몰)에서 팔 수 있게 합니다. 분양몰은 이 몰 판매가 그대로 팔고, 결제는 이 몰 계좌·카드로 받으며, 구매 확정된 주문의 (결제 금액 − 배송비) × 수수료율을 분양자에게 지급합니다.</p>

      <section className="mt-4 rounded-lg border p-4 text-sm" data-resale-default-rate>
        <form action={setResaleRateAction.bind(null, store.slug, store.id, true)} className="flex flex-wrap items-center gap-2">
          <label>기본 수수료율 <input name="rate" inputMode="decimal" defaultValue={defaultRate ?? 10} className="w-16 rounded border px-2 py-1.5" />%</label>
          <PendingButton pendingText="저장 중…" className="min-h-10 rounded border px-3 py-1.5 text-xs">저장</PendingButton>
          <span className="text-xs text-gray-500">분양몰마다 따로 정하지 않으면 이 값을 씁니다(0~50%).</span>
        </form>
      </section>

      <section className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border p-4 text-sm" data-resale-open>
        <span className={`rounded px-1.5 text-xs ${accepting ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{accepting ? "분양 신청 받는 중" : "분양 신청 안 받음"}</span>
        <span className="text-xs text-gray-500">공개 안내 화면: <Link href="/resale" className="text-blue-700 underline">/resale</Link></span>
        <form action={setResaleOpenAction.bind(null, store.slug, store.id, !accepting)} className="ml-auto">
          <PendingButton pendingText="바꾸는 중…" className="min-h-10 rounded border px-3 py-1.5 text-xs">{accepting ? "신청 그만 받기" : "분양 신청 받기"}</PendingButton>
        </form>
      </section>

      <section className="mt-6" data-resale-pending>
        <h3 className="text-sm font-semibold">승인 대기 신청 <b className={pending.length ? "text-red-700" : ""}>{pending.length}</b></h3>
        {pending.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">확인할 신청이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {pending.map((a) => (
              <li key={a.id} className="rounded border p-3 text-sm" data-resale-app>
                <p><b>{a.name}</b> <span className="text-xs text-gray-500">/s/{a.slug} · {formatDateTime(a.created_at)} 신청</span></p>
                <p className="mt-0.5 text-xs text-gray-600">연락처 {a.phone || "—"} · 홍보할 곳 {a.channel || "—"}</p>
                {a.memo && <p className="mt-0.5 text-xs text-gray-500">「{a.memo}」</p>}
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <form action={decideResaleAction.bind(null, store.slug, a.id, "approve")} className="flex flex-wrap items-center gap-2" data-resale-approve>
                    <label className="text-xs">이용 기간 <input name="days" inputMode="numeric" defaultValue={DEFAULT_RESALE_DAYS} className="w-16 rounded border px-2 py-1.5" />일</label>
                    <PendingButton pendingText="승인 중…" className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-xs text-white">승인(분양몰 열기)</PendingButton>
                  </form>
                  <form action={decideResaleAction.bind(null, store.slug, a.id, "reject")} className="flex items-center gap-2" data-resale-reject>
                    <input name="note" maxLength={300} placeholder="반려 사유(신청자에게 보임)" className="rounded border px-2 py-1.5 text-xs" />
                    <PendingButton pendingText="반려 중…" className="min-h-10 rounded border border-red-300 px-3 py-1.5 text-xs text-red-700">반려</PendingButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6" data-resale-stores>
        <h3 className="text-sm font-semibold">분양몰 {resaleStores.length}곳</h3>
        {resaleStores.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">아직 열린 분양몰이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {resaleStores.map((r) => {
              const left = resaleDaysLeft(r.resale_expires_at);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-2 rounded border p-3 text-sm" data-resale-store>
                  <b>{r.name}</b>
                  <Link href={`/s/${r.slug}`} className="text-xs text-blue-700 underline">/s/{r.slug}</Link>
                  <span className={`rounded px-1.5 text-xs ${left ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{left ? `${left}일 남음` : "기간 끝남"}</span>
                  <form action={setResaleRateAction.bind(null, store.slug, r.id, false)} className="ml-auto flex items-center gap-1 text-xs" data-resale-store-rate>
                    수수료 <input name="rate" inputMode="decimal" defaultValue={r.resale_commission_rate ?? ""} placeholder={`기본 ${defaultRate ?? 10}`} className="w-16 rounded border px-2 py-1.5" />%
                    <PendingButton pendingText="저장 중…" className="min-h-10 rounded border px-2 py-1.5">저장</PendingButton>
                  </form>
                  <form action={setResalePeriodAction.bind(null, store.slug, r.id)} className="flex items-center gap-1 text-xs">
                    오늘부터 <input name="days" inputMode="numeric" defaultValue={DEFAULT_RESALE_DAYS} className="w-16 rounded border px-2 py-1.5" />일
                    <PendingButton pendingText="저장 중…" className="min-h-10 rounded border px-2 py-1.5">기간 저장</PendingButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="orders" className="mt-6 scroll-mt-4" data-resale-orders>
        <h3 className="text-sm font-semibold">분양 주문 입금 확인 <b className={waitingOrders.length ? "text-red-700" : ""}>{waitingOrders.length}</b></h3>
        <p className="mt-1 text-xs text-gray-500">분양몰 손님은 이 몰 계좌로 입금합니다. 입금을 확인하면 이 몰에 「분양 전달」 주문이 생기고, 지금처럼 「주문」에서 발송하면 분양몰 주문도 함께 바뀝니다.</p>
        {resaleOrders.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">아직 분양몰 주문이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {resaleOrders.slice(0, 50).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm" data-resale-order>
                <span className="text-xs text-gray-500">{formatDateTime(o.created_at)}</span>
                <b>{o.order_no}</b>
                <span className="text-xs">{o.store_name} · 입금자 {o.depositor}</span>
                <span className="ml-auto">{formatWon(o.total)}</span>
                <span className="rounded bg-gray-100 px-1.5 text-xs">{ORDER_STATUS_LABEL[o.status as keyof typeof ORDER_STATUS_LABEL] ?? o.status}</span>
                {o.status === "pending_payment" ? (
                  <form action={confirmResalePaymentAction.bind(null, store.slug, o.id)}>
                    <PendingButton pendingText="확인 중…" className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-xs text-white">입금 확인</PendingButton>
                  </form>
                ) : (
                  o.forwarded_order_id && <Link href={`/s/${store.slug}/admin/orders/${o.forwarded_order_id}`} className="text-xs text-blue-700 underline">본사 주문 보기</Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="payouts" className="mt-6 scroll-mt-4" data-resale-payouts>
        <h3 className="text-sm font-semibold">분양자 출금 신청 <b className={waitingPayouts.length ? "text-red-700" : ""}>{waitingPayouts.length}</b></h3>
        {waitingPayouts.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">처리할 출금 신청이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {waitingPayouts.map((p) => (
              <li key={p.id} className="rounded border p-3 text-sm" data-resale-payout>
                <p><b>{storeName.get(p.store_id) ?? "분양몰"}</b> · {formatWon(p.amount)} <span className="text-xs text-gray-500">· {formatDateTime(p.requested_at)} 신청</span></p>
                <p className="text-xs text-gray-600">{p.bank_name} {p.bank_account} · 예금주 {p.bank_holder}</p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <form action={decideResalePayoutAction.bind(null, store.slug, p.id, "paid")} className="flex items-center gap-2">
                    <input name="memo" maxLength={200} placeholder="메모(선택)" className="rounded border px-2 py-1.5 text-xs" />
                    <PendingButton pendingText="처리 중…" className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-xs text-white">송금했음 · 지급 완료</PendingButton>
                  </form>
                  <form action={decideResalePayoutAction.bind(null, store.slug, p.id, "reject")} className="flex items-center gap-2">
                    <input name="memo" maxLength={200} placeholder="반려 사유" className="rounded border px-2 py-1.5 text-xs" />
                    <PendingButton pendingText="반려 중…" className="min-h-10 rounded border border-red-300 px-3 py-1.5 text-xs text-red-700">반려</PendingButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer text-gray-600">처리한 신청 {done.length}건</summary>
          <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
            {done.map((a) => <li key={a.id}>{a.name} · /s/{a.slug} · {RESALE_STATUS_LABEL[a.status]}{a.note ? ` — ${a.note}` : ""} · {a.decided_at ? formatDateTime(a.decided_at) : ""}</li>)}
          </ul>
        </details>
      )}
    </AdminShell>
  );
}
