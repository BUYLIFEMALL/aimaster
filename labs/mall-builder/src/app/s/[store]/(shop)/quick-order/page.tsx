import { redirect } from "next/navigation";
import { getMyCustomer, getStoreBySlug, requireUser } from "@/lib/store";
import { MAX_QUICK_LINES } from "@/lib/quickOrder";
import { QuickForm } from "./quick-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// D25 빠른 주문 — 품번·수량 목록으로 장바구니에 한 번에 담기(가입한 손님만)
export default async function QuickOrderPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  const here = `/s/${slug}/quick-order`;
  const user = await requireUser(here);
  const customer = await getMyCustomer(store.id, user.id);
  if (!customer) redirect(`/s/${slug}/join?next=${encodeURIComponent(here)}`);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-bold">빠른 주문</h1>
      <p className="mt-1 text-sm text-gray-600">
        품번과 수량을 한 줄에 하나씩 적거나 엑셀에서 복사해 붙여 넣으세요. 옵션 상품은 <b>조합 품번</b>이나 <b>품번 옵션 수량</b>(예: <code>P00002 검정 10</code>)으로 적습니다.
      </p>
      <p className="mt-1 text-xs text-gray-500">
        미리보기에서 단가(내 등급가·거래처 특가 반영)를 확인한 뒤 담습니다. 오류 줄은 빼고 담고, 장바구니에 같은 상품이 있으면 수량을 더합니다. 한 번에 {MAX_QUICK_LINES}줄까지.
      </p>
      <QuickForm slug={slug} />
    </div>
  );
}
