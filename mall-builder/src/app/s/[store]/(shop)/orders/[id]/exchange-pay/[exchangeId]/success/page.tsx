import { notFound, redirect } from "next/navigation";
import { getStoreBySlug, requireUser } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { parseSuccessParams } from "@/lib/payment";
import { UUID_RE, exchangeTossOrderId, exfeeAfterConfirm, exfeeAfterPrepare } from "@/lib/exchanges";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 교환비 결제창 성공 주소 — 토스가 처음 돌려보낼 때 주소에 결제 키가 잠깐 들어오는 것은 피할 수 없다(결제 대행사 방식).
// 여기서 처리한 뒤 결제 키 없는 주문 상세로 바로 옮긴다. 결제 키는 rpc 인자로만 — 화면·console·주소·오류 값에 넣지 않는다.
// 순서(0104 두 단계): 형식 확인 → ① 준비(prepare)가 끝나 커밋된 뒤 → ② 상태가 정확히 prepared일 때만 별도 요청으로 승인(confirm).
// 결과는 「완료」라고 단정하지 않고 중립 코드로만 돌려보낸다 — 표시는 주문 상세가 결제 기록(status·needs_review)을 다시 읽어 정한다.
export default async function ExchangePaySuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string; exchangeId: string }>;
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const { store: slug, id, exchangeId } = await params;
  if (!UUID_RE.test(id) || !UUID_RE.test(exchangeId)) notFound();
  await requireUser(`/s/${slug}/orders/${id}`);
  const store = await getStoreBySlug(slug);
  const base = `/s/${store.slug}/orders/${id}`;
  const parsed = parseSuccessParams(exchangeTossOrderId(exchangeId), await searchParams);
  if (!parsed.ok) redirect(`${base}?pay=error`);

  const supabase = await createClient();
  const prepared = await supabase.rpc("mall_builder_exchange_fee_card_prepare", { p_exchange_id: exchangeId, p_payment_key: parsed.paymentKey, p_amount: parsed.amount });
  if (prepared.error) redirect(`${base}?pay=error`);
  const next = exfeeAfterPrepare(prepared.data);
  if (next !== "confirm") redirect(`${base}?pay=${next}`);

  const confirmed = await supabase.rpc("mall_builder_exchange_fee_card_confirm", { p_exchange_id: exchangeId, p_payment_key: parsed.paymentKey });
  if (confirmed.error) redirect(`${base}?pay=checking`); // 승인 요청 중 오류 — 결과 모름으로 보고 다시 결제 유도 0
  redirect(`${base}?pay=${exfeeAfterConfirm(confirmed.data)}`);
}
