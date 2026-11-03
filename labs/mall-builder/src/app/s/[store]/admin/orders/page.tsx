import Link from "next/link";
import { getOrderCounts, getStaffStore, getStoreOrders } from "@/lib/store";
import { ORDER_STATUS_LABEL, formatDateTime, type OrderStatus } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 처리할 일이 있는 상태를 앞에
const TABS: OrderStatus[] = ["pending_payment", "paid", "preparing", "cancel_requested", "return_requested", "shipping", "delivered", "confirmed", "cancelled", "returned"];

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { store: slug } = await params;
  const { status } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/orders`);
  if (!staff) return <NoPermission />;
  const filter = TABS.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;
  const [orders, counts] = await Promise.all([getStoreOrders(store.id, filter), getOrderCounts(store.id)]);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const base = `/s/${store.slug}/admin/orders`;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/orders">
      <nav className="flex flex-wrap gap-1 text-sm" data-order-tabs>
        <Link href={base} className={`rounded px-3 py-1.5 ${!filter ? "bg-gray-900 text-white" : "bg-gray-100"}`}>전체 {total}</Link>
        {TABS.filter((s) => counts[s]).map((s) => (
          <Link key={s} href={`${base}?status=${s}`} className={`rounded px-3 py-1.5 ${filter === s ? "bg-gray-900 text-white" : "bg-gray-100"}`}>
            {ORDER_STATUS_LABEL[s]} {counts[s]}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="mt-6 rounded border border-dashed p-8 text-center text-sm text-gray-500">주문이 없습니다.</p>
      ) : (
        <ul className="mt-4 divide-y border-y text-sm">
          {orders.map((o) => (
            <li key={o.id} data-admin-order>
              <Link href={`${base}/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-gray-50">
                <span className="text-gray-500">{formatDateTime(o.created_at)}</span>
                <span>{o.order_no}</span>
                <span className="min-w-0 flex-1 truncate">
                  {o.first_item}
                  {o.item_count > 1 && ` 외 ${o.item_count - 1}건`} · {o.receiver.receiver} · 입금자 {o.depositor}
                </span>
                <b>{formatWon(o.total)}</b>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{ORDER_STATUS_LABEL[o.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
