import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, getStaffStore } from "@/lib/store";
import { ORDER_STATUS_LABEL, formatDateTime } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import OrderStatusButtons from "@/app/order-status-buttons";
import { AdminShell, NoPermission } from "../../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const ROLE_LABEL: Record<string, string> = { customer: "손님", staff: "운영자", system: "자동" };

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { store: slug, id } = await params;
  const { error, ok } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/orders/${id}`);
  if (!staff) return <NoPermission />;
  const found = await getOrder(store.id, id);
  if (!found) notFound();
  const { order, items, events } = found;
  const r = order.receiver;
  const here = `/s/${store.slug}/admin/orders/${order.id}`;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/orders">
      <Link href={`/s/${store.slug}/admin/orders`} className="text-sm text-gray-500">← 주문 목록</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">주문 {order.order_no}</h2>
        <span className="rounded bg-gray-900 px-2 py-0.5 text-sm text-white" data-order-status>{ORDER_STATUS_LABEL[order.status]}</span>
        <span className="text-sm text-gray-500">{formatDateTime(order.created_at)}</span>
      </div>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-order-error>{error}</p>}
      {ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">상태를 바꿨습니다.</p>}

      <section className="mt-6 rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">처리</h3>
        <OrderStatusButtons slug={store.slug} orderId={order.id} status={order.status} role="staff" backPath={here} />
        {["confirmed", "cancelled", "returned"].includes(order.status) && <p className="text-sm text-gray-500">끝난 주문입니다.</p>}
      </section>

      <section className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded border p-4">
          <p className="font-medium">결제</p>
          <p className="mt-1" data-pay>{order.is_credit ? "외상(후불) — 장부에 기록됨" : "무통장"} · 입금자명 <b>{order.depositor}</b></p>
          <p>결제 금액 <b>{formatWon(order.total)}</b> (상품 {formatWon(order.subtotal)} + 배송비 {formatWon(order.shipping_fee)})</p>
        </div>
        <div className="rounded border p-4">
          <p className="font-medium">받는 분</p>
          <p className="mt-1">{r.receiver} · {r.phone}</p>
          <p>({r.zip}) {r.addr1} {r.addr2}</p>
          {order.memo && <p className="text-gray-600">메모: {order.memo}</p>}
          {order.tracking_no && <p className="mt-1" data-tracking>송장: {order.courier} {order.tracking_no}</p>}
        </div>
      </section>

      <ul className="mt-6 divide-y border-y text-sm">
        {items.map((it) => (
          <li key={it.id} className="flex justify-between gap-4 py-2">
            <span>
              {it.name_snapshot}
              {it.option_snapshot && <span className="text-gray-500"> · {it.option_snapshot}</span>} × {it.qty}
            </span>
            <b>{formatWon(it.line_total)}</b>
          </li>
        ))}
      </ul>

      <section className="mt-6 text-sm">
        <p className="mb-2 font-medium">진행 기록</p>
        <ul className="space-y-1 text-gray-600" data-order-events>
          {events.map((e) => (
            <li key={e.id}>
              {formatDateTime(e.created_at)} · {ROLE_LABEL[e.actor_role] ?? e.actor_role} ·{" "}
              {e.from_status ? `${ORDER_STATUS_LABEL[e.from_status]} → ` : ""}
              {ORDER_STATUS_LABEL[e.to_status]}
              {e.note && ` — ${e.note}`}
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
