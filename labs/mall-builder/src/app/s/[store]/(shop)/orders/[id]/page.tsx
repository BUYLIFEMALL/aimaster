import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, getStoreBySlug, requireUser } from "@/lib/store";
import { ORDER_STATUS_LABEL, formatDateTime } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import OrderStatusButtons from "@/app/order-status-buttons";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const REGION_LABEL: Record<string, string> = { jeju: "제주", island: "도서산간" };

// 손님 주문 상세 — 보안 규칙상 주문한 손님(과 그 몰 운영자)만 열린다
export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string }>;
  searchParams: Promise<{ done?: string; error?: string; ok?: string }>;
}) {
  const { store: slug, id } = await params;
  const { done, error, ok } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const user = await requireUser(`/s/${slug}/orders/${id}`);
  const store = await getStoreBySlug(slug);
  const found = await getOrder(store.id, id);
  if (!found || found.order.user_id !== user.id) notFound();
  const { order, items, events } = found;
  const base = `/s/${store.slug}`;
  const r = order.receiver;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {done && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-800" data-order-done>
          <p className="text-base font-bold">주문이 접수되었습니다.</p>
          <p className="mt-1">아래 계좌로 {formatWon(order.total)}을 입금해 주세요. 입금이 확인되면 배송을 준비합니다.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">주문 {order.order_no}</h1>
        <span className="rounded bg-gray-900 px-2 py-0.5 text-sm text-white" data-order-status>{ORDER_STATUS_LABEL[order.status]}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{formatDateTime(order.created_at)} 주문</p>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-order-error>{error}</p>}
      {ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">처리했습니다.</p>}
      {order.tracking_no && (
        <p className="mt-4 rounded border px-3 py-2 text-sm" data-tracking>
          배송: {order.courier} · 송장 번호 <b>{order.tracking_no}</b>
        </p>
      )}
      <div className="mt-4">
        <OrderStatusButtons slug={store.slug} orderId={order.id} status={order.status} role="customer" backPath={`${base}/orders/${order.id}`} />
      </div>

      {order.status === "pending_payment" && (
        <section className="mt-6 rounded border bg-gray-50 p-4 text-sm" data-order-bank>
          <p className="font-medium">무통장 입금 안내</p>
          <p className="mt-1">
            {order.bank.bank_name && order.bank.bank_account
              ? `${order.bank.bank_name} ${order.bank.bank_account}${order.bank.bank_holder ? ` (예금주 ${order.bank.bank_holder})` : ""}`
              : "입금 계좌는 쇼핑몰 고객센터로 문의해 주세요."}
          </p>
          <p className="mt-1">입금자명 <b>{order.depositor}</b> · 입금할 금액 <b>{formatWon(order.total)}</b></p>
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
            </span>
            <b>{formatWon(it.line_total)}</b>
          </li>
        ))}
      </ul>

      <section className="ml-auto mt-4 max-w-sm space-y-1 text-sm" data-order-amounts>
        <p className="flex justify-between"><span>상품 금액</span><span>{formatWon(order.subtotal)}</span></p>
        <p className="flex justify-between"><span>배송비{REGION_LABEL[r.region] ? ` (${REGION_LABEL[r.region]})` : ""}</span><span>{formatWon(order.shipping_fee)}</span></p>
        <p className="flex justify-between border-t pt-1 text-base font-bold"><span>결제 금액</span><span>{formatWon(order.total)}</span></p>
      </section>

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
