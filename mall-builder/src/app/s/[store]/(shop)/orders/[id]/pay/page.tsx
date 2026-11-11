import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMyCustomer, getOrder, getStoreBySlug, requireUser } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { formatWon } from "@/lib/products";
import { formatDateTime } from "@/lib/orders";
import { orderName } from "@/lib/payment";
import PayWidget from "./pay-widget";
import { getCardPayment } from "@/lib/card-payments";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 카드 결제 화면 — 토스 결제위젯(운영자 클라이언트 키). 금액·주문명은 DB의 주문에서만 정한다(화면 값 아님)
export default async function PayPage({ params, searchParams }: { params: Promise<{ store: string; id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { store: slug, id } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const user = await requireUser(`/s/${slug}/orders/${id}/pay`);
  const store = await getStoreBySlug(slug);
  const found = await getOrder(store.id, id);
  if (!found || found.order.user_id !== user.id) notFound();
  const { order, items } = found;
  const base = `/s/${store.slug}/orders/${order.id}`;
  if (!order.is_card || order.status !== "pending_payment") redirect(base);
  // 앞서 한 결제를 확인하는 중이면 결제창을 다시 열지 않는다(먼저 들어온 결제가 실제로 됐을 수 있음) — 주문 상세의 「결제 확인하기」로
  const prev = await getCardPayment(order.id);
  if (prev && (prev.status === "requested" || prev.status === "unknown")) redirect(base);

  const supabase = await createClient();
  const [{ data: pay }, customer] = await Promise.all([
    supabase.from("mall_builder_store_payment_settings").select("toss_client_key, card_enabled").eq("store_id", store.id).maybeSingle(),
    getMyCustomer(store.id, user.id),
  ]);
  if (!pay?.card_enabled || !pay.toss_client_key || !customer) {
    return (
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-xl font-bold">카드 결제</h1>
        <p className="mt-4 rounded bg-amber-50 p-3 text-sm">이 몰은 지금 카드 결제를 받지 않습니다. 주문 상세에서 주문을 취소하고 다른 결제 방법으로 다시 주문해 주세요.</p>
        <Link href={base} className="mt-4 inline-block underline">주문 상세로</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-xl font-bold">카드 결제</h1>
      <p className="mt-1 text-sm text-gray-500">
        주문 {order.order_no} · 결제 금액 <b className="text-gray-900">{formatWon(order.total)}</b>
        {order.pay_deadline_at && <> · {formatDateTime(order.pay_deadline_at)}까지 결제해 주세요</>}
      </p>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-pay-error>{error}</p>}
      <PayWidget
        clientKey={pay.toss_client_key}
        customerKey={customer.id}
        amount={order.total}
        orderId={order.id}
        orderName={orderName(items.map((i) => i.name_snapshot))}
        customerName={customer.name}
        successPath={`${base}/pay/success`}
        failPath={`${base}/pay/fail`}
        deadline={order.pay_deadline_at}
      />
      <Link href={base} className="mt-6 inline-block text-sm underline">결제하지 않고 주문 상세로</Link>
    </main>
  );
}
