import { notFound, redirect } from "next/navigation";
import { getStoreBySlug, requireUser } from "@/lib/store";
import { UUID_RE } from "@/lib/exchanges";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 교환비 결제창 실패 주소 — 토스 원문 메시지·원래 쿼리는 쓰지 않고, 사용자가 닫은 경우만 구분해 정해진 코드로 주문 상세에 돌려보낸다(돈은 나가지 않음)
export default async function ExchangePayFailPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string; exchangeId: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { store: slug, id, exchangeId } = await params;
  if (!UUID_RE.test(id) || !UUID_RE.test(exchangeId)) notFound();
  await requireUser(`/s/${slug}/orders/${id}`);
  const store = await getStoreBySlug(slug);
  const { code } = await searchParams;
  redirect(`/s/${store.slug}/orders/${id}?pay=${code === "PAY_PROCESS_CANCELED" ? "user_canceled" : "failed"}`);
}
