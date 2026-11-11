import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuotableProducts, getStaffStore, getStoreCustomer } from "@/lib/store";
import { addDays, todayKst } from "@/lib/quotes";
import { AdminShell, NoPermission } from "../../admin-shell";
import { sendQuoteAction } from "../actions";
import SendQuoteForm from "./send-quote-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 운영자가 먼저 견적 보내기(D4) — 손님 상세의 「견적 보내기」에서 들어온다. 보내면 손님 화면에 「회신 도착」으로 보인다
export default async function SendQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ customer?: string }>;
}) {
  const { store: slug } = await params;
  const { customer: customerId } = await searchParams;
  if (!customerId || !/^[0-9a-f-]{36}$/.test(customerId)) notFound();
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/quotes/new?customer=${customerId}`);
  if (!staff) return <NoPermission />;
  const [c, products] = await Promise.all([getStoreCustomer(store.id, customerId), getQuotableProducts(store.id)]);
  if (!c) notFound();
  const today = todayKst();

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/quotes">
      <Link href={`/s/${store.slug}/admin/customers/${c.id}`} className="text-sm text-gray-500">← {c.name} 손님</Link>
      <h2 className="mt-2 text-xl font-bold">견적 보내기 — {c.company ?? c.name}</h2>
      <p className="mt-1 text-sm text-gray-600">보내면 손님 「견적 내역」에 <b>회신 도착</b>으로 보이고, 손님은 견적가 그대로 주문하거나 거절할 수 있습니다. 재고·판매 상태·배송비는 주문할 때 다시 확인합니다.</p>
      {products.length === 0 ? (
        <p className="mt-6 rounded border border-dashed p-8 text-center text-sm text-gray-500">판매 중인 상품이 없습니다.</p>
      ) : (
        <SendQuoteForm
          products={products}
          action={sendQuoteAction.bind(null, store.slug, c.id)}
          defaultValidUntil={addDays(today, 7)}
          minDate={today}
          maxDate={addDays(today, 90)}
        />
      )}
    </AdminShell>
  );
}
