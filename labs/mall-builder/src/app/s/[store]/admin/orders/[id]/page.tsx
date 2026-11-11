import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, getStaffStore, logStaffView } from "@/lib/store";
import { ORDER_STATUS_LABEL, PARTIAL_CANCEL_STATUSES, formatDateTime } from "@/lib/orders";
import { partialCancelAction } from "@/lib/order-actions";
import PartialCancelForm from "./partial-cancel-form";
import { formatWon } from "@/lib/products";
import OrderStatusButtons from "@/app/order-status-buttons";
import { TAX_INVOICE_LABEL } from "@/lib/taxInvoice";
import { amendTaxInvoiceAction, issueTaxInvoiceAction, markTaxInvoiceIssuedAction, recheckTaxInvoiceAction } from "@/lib/tax-invoice-actions";
import { taxInvoiceButtons } from "@/lib/taxInvoice";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, NoPermission } from "../../admin-shell";
import NotifyLog, { loadNotifyLog } from "@/app/notify-log";
import { getCardPayment } from "@/lib/card-payments";
import { CARD_STATUS_LABEL } from "@/lib/payment";
import { recheckCardAction, refundRemainingAction } from "@/lib/order-actions";
import { getItemSupplyForAdmin } from "@/lib/supplier-store";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const ROLE_LABEL: Record<string, string> = { customer: "손님", staff: "운영자", system: "자동" };

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string }>;
  searchParams: Promise<{ error?: string; ok?: string; msg?: string }>;
}) {
  const { store: slug, id } = await params;
  const { error, ok, msg } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/orders/${id}`);
  if (!staff) return <NoPermission />;
  await logStaffView(store.id, "order", id);
  const found = await getOrder(store.id, id);
  if (!found) notFound();
  const { order, items, events } = found;
  // D36 공급사 품목 — 품목 id → 공급사 이름·공급가·발송 송장
  const supplyMap = await getItemSupplyForAdmin(order.id);
  const notifyLog = await loadNotifyLog(store.id, order.id);
  const card = order.is_card ? await getCardPayment(order.id) : null;
  const r = order.receiver;
  const here = `/s/${store.slug}/admin/orders/${order.id}`;
  // 세금계산서 발행(D19, 볼타) — 키 있음 여부와 버튼, 발행 전이면 미리보기(DB 함수가 실제 보낼 품목을 계산)
  const taxButtons = order.tax_invoice
    ? taxInvoiceButtons(order.tax_invoice, order, Boolean(((await (await createClient()).rpc("mall_builder_tax_key_status", { p_store_id: store.id })).data as { has_key?: boolean } | null)?.has_key))
    : null;
  type TaxPreview = { items: { name: string; quantity?: number; supplyCost: number; tax: number }[]; supply: number; tax: number; total: number; exempt_lines: number };
  const taxPreview: TaxPreview | null = taxButtons?.issue
    ? (((await (await createClient()).rpc("mall_builder_tax_invoice_preview", { p_order_id: order.id })).data as TaxPreview | null) ?? null)
    : null;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/orders">
      <Link href={`/s/${store.slug}/admin/orders`} className="text-sm text-gray-500">← 주문 목록</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">주문 {order.order_no}</h2>
        <span className="rounded bg-gray-900 px-2 py-0.5 text-sm text-white" data-order-status>{ORDER_STATUS_LABEL[order.status]}</span>
        <span className="text-sm text-gray-500">{formatDateTime(order.created_at)}</span>
        <a href={`/s/${store.slug}/doc/order/${order.id}`} target="_blank" rel="noopener" className="ml-auto rounded border px-3 py-1 text-sm" data-statement-link>🧾 거래명세서</a>
      </div>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-order-error>{error}</p>}
      {ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700" data-order-ok>{msg ? msg : ok === "partial" ? (order.is_card ? "부분 취소하고 줄어든 금액만큼 카드 환불했습니다." : "부분 취소했습니다. 결제 금액과 재고를 다시 계산했습니다.") : "상태를 바꿨습니다."}</p>}

      <section className="mt-6 rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">처리</h3>
        <OrderStatusButtons slug={store.slug} orderId={order.id} status={order.status} role="staff" backPath={here} isCard={order.is_card} />
        {["confirmed", "cancelled", "returned"].includes(order.status) && <p className="text-sm text-gray-500">끝난 주문입니다.</p>}
      </section>

      <section className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded border p-4">
          <p className="font-medium">결제</p>
          <p className="mt-1" data-pay>
            {order.is_card ? "카드 결제" : order.is_credit ? "외상(후불) — 장부에 기록됨" : "무통장"}
            {!order.is_card && <> · 입금자명 <b>{order.depositor}</b></>}
          </p>
          <p>
            결제 금액 <b>{formatWon(order.total)}</b> (상품 {formatWon(order.subtotal)} + 배송비 {formatWon(order.shipping_fee)}
            {order.coupon_discount > 0 && <> − 쿠폰 {formatWon(order.coupon_discount)}</>}
            {order.point_used > 0 && <> − 포인트 {formatWon(order.point_used)}</>})
          </p>
          {order.points_earned > 0 && <p className="text-xs text-gray-500" data-points-earned>구매 확정 적립 {order.points_earned.toLocaleString("ko-KR")}점</p>}
          {order.pay_deadline_at && order.status === "pending_payment" && (
            <p className="text-red-700" data-pay-deadline>{order.is_card ? "결제 기한" : "입금 기한"} {formatDateTime(order.pay_deadline_at)} — 지나면 자동 취소</p>
          )}
          {order.is_card && (
            <div className="mt-2 border-t pt-2" data-card-admin>
              {card ? (
                <>
                  <p>
                    토스 결제 <b>{CARD_STATUS_LABEL[card.status] ?? card.status}</b> · {card.method || "카드"} · {formatWon(card.amount)}
                    {card.canceled_amount > 0 && ` · 환불 ${formatWon(card.canceled_amount)}`}
                    {card.approved_at && ` · ${formatDateTime(card.approved_at)} 승인`}
                  </p>
                  {card.error && <p className="text-xs text-red-600">{card.error}</p>}
                  {card.receipt_url && <a href={card.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline">영수증</a>}
                  {(card.status === "requested" || card.status === "unknown" || card.error) && (
                    <form action={recheckCardAction.bind(null, store.slug, order.id, "staff")} className="mt-2">
                      <button className="min-h-10 rounded border px-4 text-sm" data-card-recheck>결제 다시 확인(토스 조회)</button>
                    </form>
                  )}
                  {(order.status === "cancelled" || order.status === "returned") &&
                    (card.status === "done" || card.status === "partial_canceled") &&
                    card.amount > card.canceled_amount && (
                      <form action={refundRemainingAction.bind(null, store.slug, order.id)} className="mt-2" data-card-refund-remaining>
                        <p className="text-xs text-red-700">끝난 주문인데 환불하지 않은 카드 결제 {formatWon(card.amount - card.canceled_amount)}이 남아 있습니다.</p>
                        <button className="mt-1 min-h-10 rounded border border-red-200 px-4 text-sm text-red-700">남은 결제 금액 환불</button>
                      </form>
                    )}
                </>
              ) : (
                <p className="text-gray-500">아직 결제창에서 결제하지 않았습니다.</p>
              )}
              {order.status !== "pending_payment" && <p className="mt-1 text-xs text-gray-500">취소·부분 취소하면 카드 환불이 함께 됩니다(환불이 안 되면 취소도 되지 않습니다).</p>}
            </div>
          )}
        </div>
        <div className="rounded border p-4">
          {order.is_guest && (
            <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-amber-900" data-guest-info>
              <b>비회원 주문</b> · {order.guest_name} · {order.guest_phone}{order.guest_email && ` · ${order.guest_email}`}
            </p>
          )}
          <p className="font-medium">받는 분</p>
          <p className="mt-1">{r.receiver} · {r.phone}</p>
          <p>({r.zip}) {r.addr1} {r.addr2}</p>
          {order.memo && <p className="text-gray-600">메모: {order.memo}</p>}
          {order.tracking_no && <p className="mt-1" data-tracking>송장: {order.courier} {order.tracking_no}</p>}
        </div>
      </section>

      {order.tax_invoice && (
        <section className="mt-6 rounded border p-4 text-sm" data-invoice-admin>
          <p className="font-medium">세금계산서 — {TAX_INVOICE_LABEL[order.tax_invoice.status]}</p>
          <p className="mt-1">
            {order.tax_invoice.company} · 대표 {order.tax_invoice.ceo_name} · {order.tax_invoice.business_no} · 받을 메일 {order.tax_invoice.email}
          </p>
          <p className="text-xs text-gray-500">
            {formatDateTime(order.tax_invoice.requested_at)} 요청
            {order.tax_invoice.issued_at && ` · ${formatDateTime(order.tax_invoice.issued_at)} 발행 완료 표시`}
            {order.tax_invoice.note && ` · ${order.tax_invoice.note}`}
          </p>
          {order.tax_invoice.provider === "bolta" && (
            <p className="mt-1 text-xs" data-tax-bolta>
              볼타{order.tax_invoice.mode === "test" ? "(테스트 키 — 국세청 전송 없음)" : ""} · 공급가액 {Number(order.tax_invoice.supply ?? 0).toLocaleString("ko-KR")}원 · 세액 {Number(order.tax_invoice.tax ?? 0).toLocaleString("ko-KR")}원
              {order.tax_invoice.nts_id && <> · 국세청 승인번호 <b>{order.tax_invoice.nts_id}</b></>}
              {order.tax_invoice.terminated && " · 전액 상계(수정 발행) 처리됨"}
              {order.tax_invoice.error && <span className="block text-red-700">{order.tax_invoice.error}</span>}
            </p>
          )}
          {(order.tax_invoice.amendments ?? []).length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs text-gray-600" data-tax-amendments>
              {(order.tax_invoice.amendments ?? []).map((a, i) => (
                <li key={i}>
                  {formatDateTime(a.at)} 수정 발행 — {a.kind === "termination" ? "계약 해제(전액 상계)" : `공급가액 ${a.supply_diff.toLocaleString("ko-KR")}원 · 세액 ${a.tax_diff.toLocaleString("ko-KR")}원`}
                  {a.status === "unknown" && <b className="text-red-700"> · 결과 모름 — 볼타 화면에서 확인</b>}
                </li>
              ))}
            </ul>
          )}
          {taxButtons?.reason && <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800" data-tax-reason>{taxButtons.reason}</p>}
          {taxPreview && (
            <div className="mt-2 rounded bg-gray-50 p-3 text-xs" data-tax-preview>
              <p className="font-medium">발행할 내용(과세 품목, 쿠폰·포인트 할인 반영) — 공급가액 {taxPreview.supply.toLocaleString("ko-KR")}원 + 세액 {taxPreview.tax.toLocaleString("ko-KR")}원 = {taxPreview.total.toLocaleString("ko-KR")}원</p>
              <ul className="mt-1 space-y-0.5">
                {taxPreview.items.map((it, i) => (
                  <li key={i}>{it.name}{it.quantity ? ` × ${it.quantity}` : ""} — 공급가액 {it.supplyCost.toLocaleString("ko-KR")}원 · 세액 {it.tax.toLocaleString("ko-KR")}원</li>
                ))}
              </ul>
              {taxPreview.exempt_lines > 0 && <p className="mt-1 text-amber-800">면세 품목 {taxPreview.exempt_lines}개는 빠집니다. 계산서는 홈택스에서 발행해 주세요.</p>}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {taxButtons?.issue && (
              <form action={issueTaxInvoiceAction.bind(null, store.slug, order.id)}>
                <button className="min-h-10 rounded bg-gray-900 px-4 text-white" data-tax-issue>세금계산서 발행(볼타)</button>
              </form>
            )}
            {taxButtons?.recheck && (
              <form action={recheckTaxInvoiceAction.bind(null, store.slug, order.id)}>
                <button className="min-h-10 rounded border px-4" data-tax-recheck>상태 다시 확인</button>
              </form>
            )}
            {taxButtons?.amend && (
              <form action={amendTaxInvoiceAction.bind(null, store.slug, order.id)}>
                <button className="min-h-10 rounded border border-red-200 px-4 text-red-700" data-tax-amend>
                  {["cancelled", "returned"].includes(order.status) ? "수정 발행(취소분 전액 상계)" : "수정 발행(줄어든 금액)"}
                </button>
              </form>
            )}
          </div>
          {taxButtons?.amend && ["cancelled", "returned"].includes(order.status) && (
            <p className="mt-1 text-xs text-red-700">이 주문은 취소·반품됐습니다. 발행한 세금계산서를 수정 발행으로 상계해 주세요.</p>
          )}
          {taxButtons?.markManual && (
            <form action={markTaxInvoiceIssuedAction.bind(null, store.slug, order.id)} className="mt-2 flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-xs text-gray-500">메모(선택, 예: 홈택스 승인번호)</span>
                <input name="note" maxLength={200} className="mt-0.5 w-64 rounded border px-2 py-1.5" />
              </label>
              <button className="min-h-10 rounded bg-gray-900 px-4 text-white">발행 완료로 표시</button>
            </form>
          )}
        </section>
      )}

      <ul className="mt-6 divide-y border-y text-sm" data-admin-order-items>
        {items.map((it) => (
          <li key={it.id} className="flex justify-between gap-4 py-2">
            <span>
              {it.name_snapshot}
              {it.option_snapshot && <span className="text-gray-500"> · {it.option_snapshot}</span>} × {it.qty}
              {it.cancelled_qty > 0 && <span className="ml-1 text-red-600">(취소 {it.cancelled_qty}개)</span>}
              {supplyMap.get(it.id) && (
                <span className="mt-0.5 block text-xs text-indigo-700" data-item-supplier>
                  🏭 {supplyMap.get(it.id)!.supplier_name} · 공급가 {formatWon(supplyMap.get(it.id)!.supply_price)} ·{" "}
                  {supplyMap.get(it.id)!.shipped_at ? `발송 ${supplyMap.get(it.id)!.courier} ${supplyMap.get(it.id)!.tracking_no}` : "공급사 발송 전"}
                </span>
              )}
            </span>
            <b>{formatWon(it.unit_price * (it.qty - it.cancelled_qty))}</b>
          </li>
        ))}
      </ul>

      {(PARTIAL_CANCEL_STATUSES as readonly string[]).includes(order.status) && items.some((it) => it.qty > it.cancelled_qty) && (
        <PartialCancelForm items={items} isCredit={order.is_credit} isCard={order.is_card} usedBenefits={order.coupon_discount > 0 || order.point_used > 0} action={partialCancelAction.bind(null, store.slug, order.id)} />
      )}

      <section className="mt-6 text-sm">
        <p className="mb-2 font-medium">진행 기록</p>
        <ul className="space-y-1 text-gray-600" data-order-events>
          {events.map((e) => (
            <li key={e.id}>
              {formatDateTime(e.created_at)} · {ROLE_LABEL[e.actor_role] ?? e.actor_role} ·{" "}
              {e.from_status !== e.to_status && (
                <>
                  {e.from_status ? `${ORDER_STATUS_LABEL[e.from_status]} → ` : ""}
                  {ORDER_STATUS_LABEL[e.to_status]}
                </>
              )}
              {e.note && (e.from_status !== e.to_status ? ` — ${e.note}` : e.note)}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 text-sm">
        <p className="mb-2 font-medium">문자 알림</p>
        <NotifyLog rows={notifyLog} empty="이 주문으로 보낸 알림이 없습니다." />
      </section>
    </AdminShell>
  );
}
