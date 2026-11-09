import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyCustomer, getMyReviewsByItem, getOrder, getStoreBySlug, requireUser } from "@/lib/store";
import { canReview } from "@/lib/reviews";
import ReviewForm from "./review-form";
import { TAX_INVOICE_LABEL, canRequestInvoice } from "@/lib/taxInvoice";
import { requestTaxInvoiceAction } from "@/lib/tax-invoice-actions";
import { ORDER_STATUS_LABEL, formatDateTime } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import OrderStatusButtons from "@/app/order-status-buttons";
import { getCardPayment } from "@/lib/card-payments";
import { CARD_STATUS_LABEL } from "@/lib/payment";
import { recheckCardAction } from "@/lib/order-actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const REGION_LABEL: Record<string, string> = { jeju: "제주", island: "도서산간" };

// 손님 주문 상세 — 보안 규칙상 주문한 손님(과 그 몰 운영자)만 열린다
export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string }>;
  searchParams: Promise<{ done?: string; error?: string; ok?: string; paid?: string; msg?: string }>;
}) {
  const { store: slug, id } = await params;
  const { done, error, ok, paid, msg } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const user = await requireUser(`/s/${slug}/orders/${id}`);
  const store = await getStoreBySlug(slug);
  const found = await getOrder(store.id, id);
  if (!found || found.order.user_id !== user.id) notFound();
  const { order, items, events } = found;
  const customer = await getMyCustomer(store.id, user.id);
  // 후기(D13) — 배송 완료·구매 확정 주문의 품목에만 폼을 보인다
  const reviews = canReview(order.status, 1, 0, "x") ? await getMyReviewsByItem(items.map((it) => it.id)) : new Map();
  const isBusiness = customer?.approval_status === "approved" && !!customer.grade?.is_business;
  const base = `/s/${store.slug}`;
  const r = order.receiver;
  // 카드 결제 기록(0028) — 보안 규칙상 이 주문의 손님만 읽힌다
  const card = order.is_card ? (await getCardPayment(order.id)) : null;
  const payLabel = order.is_card ? "카드" : order.is_credit ? "외상(후불)" : "무통장 입금";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {done && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-800" data-order-done>
          <p className="text-base font-bold">주문이 접수되었습니다.</p>
          <p className="mt-1">
            {order.is_credit
              ? `외상(후불)으로 ${formatWon(order.total)} 결제 완료되었습니다. 배송을 준비합니다.`
              : `아래 계좌로 ${formatWon(order.total)}을 입금해 주세요. 입금이 확인되면 배송을 준비합니다.`}
          </p>
        </div>
      )}
      {paid && card?.status === "done" && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-800" data-card-paid>
          <p className="text-base font-bold">카드 결제가 완료되었습니다.</p>
          <p className="mt-1">{formatWon(order.total)} 결제되었습니다. 배송을 준비합니다.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">주문 {order.order_no}</h1>
        <span className="rounded bg-gray-900 px-2 py-0.5 text-sm text-white" data-order-status>{ORDER_STATUS_LABEL[order.status]}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {formatDateTime(order.created_at)} 주문 · 결제 {payLabel}
      </p>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-order-error>{error}</p>}
      {ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      {order.tracking_no && (
        <p className="mt-4 rounded border px-3 py-2 text-sm" data-tracking>
          배송: {order.courier} · 송장 번호 <b>{order.tracking_no}</b>
        </p>
      )}
      <div className="mt-4">
        <OrderStatusButtons slug={store.slug} orderId={order.id} status={order.status} role="customer" backPath={`${base}/orders/${order.id}`} isCard={order.is_card} />
      </div>

      {order.is_card && order.status === "pending_payment" && (
        <section className="mt-6 rounded border bg-gray-50 p-4 text-sm" data-order-card-pending>
          {card && (card.status === "requested" || card.status === "unknown") ? (
            <>
              <p className="font-medium">카드 결제 결과를 확인하고 있습니다.</p>
              <p className="mt-1 text-gray-600">카드사 응답이 늦었습니다. 아래 버튼으로 결제가 됐는지 바로 확인할 수 있습니다. 결제가 되지 않았으면 다시 결제할 수 있습니다.</p>
              <form action={recheckCardAction.bind(null, store.slug, order.id, "customer")} className="mt-3">
                <button className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white" data-card-recheck>결제 확인하기</button>
              </form>
            </>
          ) : (
            <>
              <p className="font-medium">카드 결제 대기 — 결제할 금액 <b>{formatWon(order.total)}</b></p>
              {order.pay_deadline_at && <p className="mt-1 text-red-700" data-pay-deadline>{formatDateTime(order.pay_deadline_at)}까지 결제하지 않으면 주문이 취소될 수 있습니다.</p>}
              <Link href={`${base}/orders/${order.id}/pay`} className="mt-3 inline-block min-h-11 rounded bg-gray-900 px-5 py-2 text-white" data-pay-link>카드로 결제하기</Link>
            </>
          )}
        </section>
      )}
      {card && card.status !== "requested" && card.status !== "failed" && !(order.status === "pending_payment" && card.status === "unknown") && (
        <section className="mt-6 rounded border p-4 text-sm" data-card-info>
          <p className="font-medium">카드 결제 — {CARD_STATUS_LABEL[card.status] ?? card.status}</p>
          <p className="mt-1 text-gray-600">
            {card.method || "카드"} · {formatWon(card.amount)}
            {card.approved_at && ` · ${formatDateTime(card.approved_at)} 승인`}
            {card.canceled_amount > 0 && ` · 환불 ${formatWon(card.canceled_amount)}`}
          </p>
          {card.receipt_url && <a href={card.receipt_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-blue-700 underline">영수증 보기</a>}
        </section>
      )}

      {!order.is_card && order.status === "pending_payment" && (
        <section className="mt-6 rounded border bg-gray-50 p-4 text-sm" data-order-bank>
          <p className="font-medium">무통장 입금 안내</p>
          <p className="mt-1">
            {order.bank.bank_name && order.bank.bank_account
              ? `${order.bank.bank_name} ${order.bank.bank_account}${order.bank.bank_holder ? ` (예금주 ${order.bank.bank_holder})` : ""}`
              : "입금 계좌는 쇼핑몰 고객센터로 문의해 주세요."}
          </p>
          <p className="mt-1">입금자명 <b>{order.depositor}</b> · 입금할 금액 <b>{formatWon(order.total)}</b></p>
          {order.pay_deadline_at && (
            <p className="mt-1 text-red-700" data-pay-deadline>
              입금 기한 <b>{formatDateTime(order.pay_deadline_at)}</b>까지 — 지나면 주문이 자동으로 취소됩니다.
            </p>
          )}
        </section>
      )}

      <ul className="mt-6 divide-y border-y text-sm">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 py-3" data-order-item>
            <span className="h-14 w-14 shrink-0 overflow-hidden rounded bg-gray-100">
              {it.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image_url} alt="" className="h-full w-full object-cover" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              {it.product_id ? <Link href={`${base}/p/${it.product_id}`}>{it.name_snapshot}</Link> : it.name_snapshot}
              {it.option_snapshot && <span className="text-gray-500"> · {it.option_snapshot}</span>}
              <br />
              <span className="text-gray-500">{formatWon(it.unit_price)} × {it.qty}</span>
              {it.cancelled_qty > 0 && <span className="ml-1 text-red-600">(취소 {it.cancelled_qty}개)</span>}
              {canReview(order.status, it.qty, it.cancelled_qty, it.product_id) && (
                <ReviewForm slug={store.slug} orderId={order.id} orderItemId={it.id} review={reviews.get(it.id) ?? null} />
              )}
            </span>
            <b>{formatWon(it.unit_price * (it.qty - it.cancelled_qty))}</b>
          </li>
        ))}
      </ul>

      <section className="ml-auto mt-4 max-w-sm space-y-1 text-sm" data-order-amounts>
        <p className="flex justify-between"><span>상품 금액</span><span>{formatWon(order.subtotal)}</span></p>
        <p className="flex justify-between"><span>배송비{REGION_LABEL[r.region] ? ` (${REGION_LABEL[r.region]})` : ""}</span><span>{formatWon(order.shipping_fee)}</span></p>
        {order.coupon_discount > 0 && <p className="flex justify-between text-red-600" data-coupon-line><span>쿠폰 할인</span><span>−{formatWon(order.coupon_discount)}</span></p>}
        {order.point_used > 0 && <p className="flex justify-between text-red-600" data-points-line><span>포인트 사용</span><span>−{formatWon(order.point_used)}</span></p>}
        <p className="flex justify-between border-t pt-1 text-base font-bold"><span>결제 금액</span><span>{formatWon(order.total)}</span></p>
        {order.points_earned > 0 && <p className="text-right text-xs text-gray-500" data-points-earned>구매 확정 적립 {order.points_earned.toLocaleString("ko-KR")}점</p>}
      </section>

      {(order.tax_invoice || (isBusiness && canRequestInvoice(order))) && (
        <section className="mt-6 rounded border p-4 text-sm" data-invoice>
          <p className="font-medium">세금계산서</p>
          {order.tax_invoice ? (
            <p className="mt-1">
              <b>{TAX_INVOICE_LABEL[order.tax_invoice.status]}</b> · {order.tax_invoice.company} ({order.tax_invoice.business_no}) · {order.tax_invoice.email}
              {order.tax_invoice.issued_at && ` · ${formatDateTime(order.tax_invoice.issued_at)} 발행`}
              {order.tax_invoice.nts_id && ` · 국세청 승인번호 ${order.tax_invoice.nts_id}`}
            </p>
          ) : (
            <form action={requestTaxInvoiceAction.bind(null, store.slug, order.id)} className="mt-2 flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-xs text-gray-500">받을 메일</span>
                <input name="invoice_email" type="email" defaultValue={user.email ?? ""} required maxLength={100} className="mt-0.5 w-64 rounded border px-2 py-1.5" />
              </label>
              <button className="min-h-10 rounded border px-4">발행 요청</button>
            </form>
          )}
        </section>
      )}

      <section className="mt-6 rounded border p-4 text-sm">
        <p className="font-medium">받는 분</p>
        <p className="mt-1">{r.receiver} · {r.phone}</p>
        <p>({r.zip}) {r.addr1} {r.addr2}</p>
        {order.memo && <p className="mt-1 text-gray-600">메모: {order.memo}</p>}
      </section>

      <section className="mt-6 text-sm">
        <p className="mb-2 font-medium">진행 기록</p>
        <ul className="space-y-1 text-gray-600">
          {events.map((e) => (
            <li key={e.id}>
              {formatDateTime(e.created_at)} · {ORDER_STATUS_LABEL[e.to_status]}
              {e.note && ` — ${e.note}`}
            </li>
          ))}
        </ul>
      </section>
      <Link href={`${base}/orders`} className="mt-6 inline-block text-sm underline">주문 내역 전체</Link>
    </main>
  );
}
