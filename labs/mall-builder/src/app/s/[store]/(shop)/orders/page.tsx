import Link from "next/link";
import { getMyOrders, getStoreBySlug, requireUser } from "@/lib/store";
import { ORDER_STATUS_LABEL, formatDateTime } from "@/lib/orders";
import { formatWon } from "@/lib/products";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function OrdersPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const user = await requireUser(`/s/${slug}/orders`);
  const store = await getStoreBySlug(slug);
  const orders = await getMyOrders(store.id, user.id);
  const base = `/s/${store.slug}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold">주문 내역</h1>
      {orders.length === 0 ? (
        <p className="mt-8 rounded border border-dashed p-8 text-center text-gray-500">
          아직 주문이 없습니다. <Link href={base} className="underline">상품 보러 가기</Link>
        </p>
      ) : (
        <ul className="mt-6 divide-y border-y">
          {orders.map((o) => (
            <li key={o.id} data-order-row>
              <Link href={`${base}/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-4 hover:bg-gray-50">
                <span className="text-sm text-gray-500">{formatDateTime(o.created_at)}</span>
                <span className="text-sm">{o.order_no}</span>
                <span className="min-w-0 flex-1 truncate">
                  {o.first_item}
                  {o.item_count > 1 && ` 외 ${o.item_count - 1}건`}
                </span>
                <b>{formatWon(o.total)}</b>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{ORDER_STATUS_LABEL[o.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
