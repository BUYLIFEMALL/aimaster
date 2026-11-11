import { notFound, redirect } from "next/navigation";
import { getStoreBySlug, requireUser } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { parseSuccessParams } from "@/lib/payment";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 결제창 성공 주소 — 돌아온 값을 검사하고 DB 함수 mall_builder_card_confirm이 토스 승인 API를 부른다(시크릿 키는 DB 안에서만).
// 같은 주문은 한 번만 승인되므로 새로고침해도 이중 결제되지 않는다
export default async function PaySuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string }>;
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const { store: slug, id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  await requireUser(`/s/${slug}/orders/${id}`);
  await getStoreBySlug(slug);
  const base = `/s/${slug}/orders/${id}`;
  const parsed = parseSuccessParams(id, await searchParams);
  if (!parsed.ok) redirect(`${base}/pay?error=${encodeURIComponent(parsed.error)}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_card_confirm", { p_order_id: id, p_payment_key: parsed.paymentKey, p_amount: parsed.amount });
  if (error) redirect(`${base}?error=${encodeURIComponent(error.message)}`);
  const r = data as { ok: boolean; unknown?: boolean; message?: string };
  if (r.ok) redirect(`${base}?paid=1`);
  if (r.unknown) redirect(`${base}?error=${encodeURIComponent(r.message ?? "결제 확인 중입니다.")}`);
  redirect(`${base}/pay?error=${encodeURIComponent(`결제가 승인되지 않았습니다: ${r.message ?? ""}`)}`);
}
