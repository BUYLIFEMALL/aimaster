import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, getStaffStore } from "@/lib/store";
import { ORDER_STATUS_LABEL, PARTIAL_CANCEL_STATUSES, formatDateTime } from "@/lib/orders";
import { partialCancelAction } from "@/lib/order-actions";
import PartialCancelForm from "./partial-cancel-form";
import { formatWon } from "@/lib/products";
import OrderStatusButtons from "@/app/order-status-buttons";
import { TAX_INVOICE_LABEL } from "@/lib/taxInvoice";
import { markTaxInvoiceIssuedAction } from "@/lib/tax-invoice-actions";
import { AdminShell, NoPermission } from "../../admin-shell";
import NotifyLog, { loadNotifyLog } from "@/app/notify-log";
import { getCardPayment } from "@/lib/card-payments";
import { CARD_STATUS_LABEL } from "@/lib/payment";
import { recheckCardAction, refundRemainingAction } from "@/lib/order-actions";

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
  const found = await getOrder(store.id, id);
  if (!found) notFound();
  const { order, items, events } = found;
  const notifyLog = await loadNotifyLog(store.id, order.id);
  const card = order.is_card ? await getCardPayment(order.id) : null;
  const r = order.receiver;
  const here = `/s/${store.slug}/admin/orders/${order.id}`;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/orders">
      <Link href={`/s/${store.slug}/admin/orders`} className="text-sm text-gray-500">← 주문 목록</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">주문 {order.order_no}</h2>
        <span className="rounded bg-gray-900 px-2 py-0.5 text-sm text-white" data-order-status>{ORDER_STATUS_LABEL[order.status]}</span>
        <span className="text-sm text-gray-500">{formatDateTime(order.created_at)}</span>
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
          {order.tax_invoice.status === "requested" && (
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
