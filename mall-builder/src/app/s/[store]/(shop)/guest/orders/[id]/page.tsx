import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStoreBySlug } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { readGuestTokens } from "@/lib/guest-store";
import { ORDER_STATUS_LABEL, formatDateTime, nextActions, type OrderEventRow, type OrderItemRow, type OrderRow } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import { guestChangeStatusAction } from "../../actions";
import GuestStatusButton from "./status-button";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 비회원 주문 상세(D15) — 이 브라우저의 조회 토큰으로만 열린다(DB 함수 mall_builder_guest_order). 토큰이 없거나 바뀌었으면 주문 조회 화면으로
export default async function GuestOrderPage({ params, searchParams }: { params: Promise<{ store: string; id: string }>; searchParams: Promise<{ done?: string; error?: string; ok?: string }> }) {
  const { store: slug, id } = await params;
  const { done, error, ok } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const store = await getStoreBySlug(slug);
  const token = (await readGuestTokens(store.slug))[id];
  const lookup = `/s/${store.slug}/guest`;
  if (!token) redirect(`${lookup}?error=${encodeURIComponent("이 브라우저에 조회 정보가 없습니다. 주문번호와 휴대폰 번호로 조회해 주세요.")}`);
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_guest_order", { p_store_id: store.id, p_order_id: id, p_token: token });
  if (!data) redirect(`${lookup}?error=${encodeURIComponent("조회 정보가 바뀌었습니다(다른 곳에서 다시 조회함). 다시 조회해 주세요.")}`);
  const { order, items, events } = data as { order: OrderRow; items: OrderItemRow[]; events: OrderEventRow[] };
  const r = order.receiver;
  const actions = nextActions("customer", order.status);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8" data-guest-order>
      {done && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-800" data-order-done>
          <p className="text-base font-bold">주문이 접수되었습니다.</p>
          <p className="mt-1">주문번호 <b>{order.order_no}</b>를 꼭 적어 두세요. 나중에 주문번호와 휴대폰 번호로 조회할 수 있습니다.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">주문 {order.order_no}</h1>
        <span className="rounded bg-gray-900 px-2 py-0.5 text-sm text-white" data-order-status>{ORDER_STATUS_LABEL[order.status]}</span>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">비회원</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{formatDateTime(order.created_at)} 주문 · 무통장 입금 · {order.guest_name} · {order.guest_phone}</p>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-order-error>{error}</p>}
      {ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">처리했습니다.</p>}
      {order.tracking_no && <p className="mt-4 rounded border px-3 py-2 text-sm" data-tracking>배송: {order.courier} · 송장 번호 <b>{order.tracking_no}</b></p>}
      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" data-status-actions>
          {actions.map((a) => <GuestStatusButton key={a.to} to={a.to} label={a.label} action={guestChangeStatusAction.bind(null, store.slug, order.id, a.to)} />)}
        </div>
      )}

      {order.status === "pending_payment" && (
        <section className="mt-6 rounded border bg-gray-50 p-4 text-sm" data-order-bank>
          <p className="font-medium">무통장 입금 안내</p>
          <p className="mt-1">
            {order.bank.bank_name && order.bank.bank_account
              ? `${order.bank.bank_name} ${order.bank.bank_account}${order.bank.bank_holder ? ` (예금주 ${order.bank.bank_holder})` : ""}`
              : "입금 계좌는 쇼핑몰 고객센터로 문의해 주세요."}
          </p>
          <p className="mt-1">입금자명 <b>{order.depositor}</b> · 입금할 금액 <b>{formatWon(order.total)}</b></p>
          {order.pay_deadline_at && <p className="mt-1 text-red-700" data-pay-deadline>입금 기한 <b>{formatDateTime(order.pay_deadline_at)}</b>까지 — 지나면 주문이 자동으로 취소됩니다.</p>}
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
              {it.product_id ? <Link href={`/s/${store.slug}/p/${it.product_id}`}>{it.name_snapshot}</Link> : it.name_snapshot}
              {it.option_snapshot && <span className="text-gray-500"> · {it.option_snapshot}</span>}
              <br />
              <span className="text-gray-500">{formatWon(it.unit_price)} × {it.qty}</span>
              {it.cancelled_qty > 0 && <span className="ml-1 text-red-600">(취소 {it.cancelled_qty}개)</span>}
            </span>
            <b>{formatWon(it.unit_price * (it.qty - it.cancelled_qty))}</b>
          </li>
        ))}
      </ul>
      <section className="ml-auto mt-4 max-w-sm space-y-1 text-sm" data-order-amounts>
        <p className="flex justify-between"><span>상품 금액</span><span>{formatWon(order.subtotal)}</span></p>
        <p className="flex justify-between"><span>배송비</span><span>{formatWon(order.shipping_fee)}</span></p>
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
          {events.map((e) => <li key={e.id}>{formatDateTime(e.created_at)} · {ORDER_STATUS_LABEL[e.to_status]}{e.note && ` — ${e.note}`}</li>)}
        </ul>
      </section>
      <p className="mt-6 text-xs text-gray-500">이 브라우저에 7일 동안 조회 정보를 기억합니다. 다른 기기에서는 <Link href={lookup} className="underline">주문 조회</Link>에서 다시 찾아 주세요.</p>
    </main>
  );
}
