import { notFound, redirect } from "next/navigation";
import { exfeeSuccessTarget } from "@/lib/exchanges";
import { exfeeFlowDeps } from "@/lib/exchanges-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 교환비 결제창 성공 주소 — 토스가 처음 돌려보낼 때 주소에 결제 키가 잠깐 들어오는 것은 피할 수 없다(결제 대행사 방식).
// 처리는 exfeeSuccessTarget(실제 DB로 로그인 회원·몰·주문 주인·교환 소속 확인 → 아니면 404·rpc 0 → 준비 → 정확히 prepared일 때만 별도 승인)
// 뒤 결제 키 없는 주문 상세로 바로 옮긴다. 결제 키는 rpc 인자로만 — 화면·console·주소·오류 값 0, 응답만으로 완료 단정 0.
export default async function ExchangePaySuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string; exchangeId: string }>;
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const { store: slug, id, exchangeId } = await params;
  const deps = await exfeeFlowDeps(`/s/${slug}/orders/${id}`);
  const target = await exfeeSuccessTarget(deps, slug, id, exchangeId, await searchParams);
  if (!target) notFound();
  redirect(target);
}
