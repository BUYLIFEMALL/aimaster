import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMyCustomer, getOrder, getStoreBySlug, requireUser } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { formatWon } from "@/lib/products";
import { UUID_RE, exchangeTossOrderId, exfeeReturnText, feePayState, isExchangeOrderStatus } from "@/lib/exchanges";
import { getFeePayments } from "@/lib/exchanges-server";
import PayWidget from "../../pay/pay-widget";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// M2-12b 단계2 교환비 카드 결제 화면 — 토스 결제위젯(주문 결제와 같은 위젯 재사용). 금액·주문명은 DB의 교환·주문에서만 정한다.
// 확인 중·확인 필요·취소 보류·완료면 결제창을 열지 않는다(먼저 들어온 결제가 실제로 됐을 수 있음).
// 토스 주문 번호는 DB 0104가 고정한 exfee-<교환 id>와 같아야 한다.
export default async function ExchangePayPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string; exchangeId: string }>;
  searchParams: Promise<{ pay?: string }>;
}) {
  const { store: slug, id, exchangeId } = await params;
  const { pay: payCode } = await searchParams;
  if (!UUID_RE.test(id) || !UUID_RE.test(exchangeId)) notFound();
  const user = await requireUser(`/s/${slug}/orders/${id}`);
  const store = await getStoreBySlug(slug);
  const found = await getOrder(store.id, id);
  if (!found || found.order.user_id !== user.id) notFound();
  const { order, items } = found;
  const base = `/s/${store.slug}/orders/${order.id}`;

  const supabase = await createClient();
  const ex = await supabase.from("mall_builder_exchanges").select("id, order_id, item_id, fee, fee_status, step").eq("id", exchangeId).eq("order_id", order.id).maybeSingle();
  if (ex.error || !ex.data) notFound();
  const x = ex.data as { id: string; item_id: string; fee: number; fee_status: "none" | "waiting" | "paid"; step: "requested" | "collecting" | "collected" | "reshipped" | "done" | "rejected" };
  const pays = await getFeePayments(supabase, order.id);
  if (pays.state !== "ok") redirect(base); // 결제 표 없음(0104 전) 또는 읽기 오류 — 결제창을 열지 않음
  const st = feePayState(x, pays.payments.find((p) => p.exchange_id === x.id) ?? null, pays.cardEnabled);
  if (!isExchangeOrderStatus(order.status) || !st.canPay) redirect(st.kind === "checking" || st.kind === "hold" ? `${base}?pay=checking` : base);

  const [{ data: payCfg }, customer] = await Promise.all([
    supabase.from("mall_builder_store_payment_settings").select("toss_client_key, card_enabled").eq("store_id", store.id).maybeSingle(),
    getMyCustomer(store.id, user.id),
  ]);
  if (!payCfg?.card_enabled || !payCfg.toss_client_key || !customer) redirect(base);
  const itemName = items.find((i) => i.id === x.item_id)?.name_snapshot ?? "상품";
  const name = `교환비 · ${itemName}`;
  const notice = exfeeReturnText(payCode);

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-xl font-bold">교환비 카드 결제</h1>
      <p className="mt-1 text-sm text-gray-500">주문 {order.order_no} · 교환비 <b className="text-gray-900">{formatWon(x.fee)}</b></p>
      {notice && <p className="mt-4 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800" data-exfee-notice>{notice}</p>}
      {st.retryUnverified && <p className="mt-2 text-xs text-gray-500">앞서 한 카드 결제가 되지 않았습니다. 다시 결제가 카드사에서 거절되면 쇼핑몰에 문의해 주세요.</p>}
      <PayWidget
        clientKey={payCfg.toss_client_key}
        customerKey={customer.id}
        amount={x.fee}
        orderId={exchangeTossOrderId(x.id)}
        orderName={name.length > 100 ? `${name.slice(0, 97)}...` : name}
        customerName={customer.name}
        successPath={`${base}/exchange-pay/${x.id}/success`}
        failPath={`${base}/exchange-pay/${x.id}/fail`}
      />
      <Link href={base} className="mt-6 inline-block text-sm underline">결제하지 않고 주문 상세로</Link>
    </main>
  );
}
