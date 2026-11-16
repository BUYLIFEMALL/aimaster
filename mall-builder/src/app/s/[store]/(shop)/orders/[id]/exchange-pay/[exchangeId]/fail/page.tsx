import { notFound, redirect } from "next/navigation";
import { exfeeFailTarget } from "@/lib/exchanges";
import { exfeeFlowDeps } from "@/lib/exchanges-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 교환비 결제창 실패 주소 — 실제 DB로 로그인 회원·몰·주문 주인·교환 소속을 확인한 뒤에만(아니면 404) 정해진 코드로 주문 상세에 돌려보낸다.
// 토스 원문 메시지·원래 쿼리는 쓰지 않음(돈은 나가지 않음)
export default async function ExchangePayFailPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string; exchangeId: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { store: slug, id, exchangeId } = await params;
  const deps = await exfeeFlowDeps(`/s/${slug}/orders/${id}`);
  const target = await exfeeFailTarget(deps, slug, id, exchangeId, (await searchParams).code);
  if (!target) notFound();
  redirect(target);
}
