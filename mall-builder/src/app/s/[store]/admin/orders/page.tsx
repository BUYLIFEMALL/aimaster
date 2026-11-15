import Link from "next/link";
import { getOrderCounts, getStaffStore, getStoreOrders } from "@/lib/store";
import { ORDER_STATUS_LABEL, formatDateTime, type OrderStatus } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import { orderListHref, pageCount, parseOrderListQuery } from "@/lib/order-list";
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { store: slug } = await params;
  const f = parseOrderListQuery(await searchParams, TABS); // M2-1: 상태·검색어·기간·송장 없음·페이지
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/orders`);
  if (!staff) return <NoPermission />;
  const filter = f.status as OrderStatus | undefined;
  const [{ rows: orders, total: found }, counts] = await Promise.all([getStoreOrders(store.id, f), getOrderCounts(store.id)]);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const base = `/s/${store.slug}/admin/orders`;
  const pages = pageCount(found);
  const narrowed = Boolean(f.q || f.from || f.to || f.noTracking);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/orders">
      <nav className="flex flex-wrap gap-1 text-sm" data-order-tabs>
        <Link href={orderListHref(base, f, { status: undefined, page: 1 })} className={`rounded px-3 py-1.5 ${!filter ? "bg-gray-900 text-white" : "bg-gray-100"}`}>전체 {total}</Link>
        {TABS.filter((s) => counts[s]).map((s) => (
          <Link key={s} href={orderListHref(base, f, { status: s, page: 1 })} className={`rounded px-3 py-1.5 ${filter === s ? "bg-gray-900 text-white" : "bg-gray-100"}`}>
            {ORDER_STATUS_LABEL[s]} {counts[s]}
          </Link>
        ))}
      </nav>

      {/* M2-1 검색·기간·송장 없음 — 상태 탭은 그대로 유지 */}
      <form method="get" action={base} className="mt-3 flex flex-wrap items-end gap-2 text-sm" data-order-search>
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <label className="flex min-w-48 flex-1 flex-col">
          <span className="text-xs text-gray-500">검색</span>
          <input name="q" defaultValue={f.q} maxLength={40} placeholder="주문번호·받는 분·연락처·입금자" className="rounded border px-2 py-1.5" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">주문일 부터</span>
          <input type="date" name="from" defaultValue={f.from} className="rounded border px-2 py-1.5" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">까지</span>
          <input type="date" name="to" defaultValue={f.to} className="rounded border px-2 py-1.5" />
        </label>
        <label className="flex items-center gap-1 py-1.5" title="결제 완료·배송 준비·배송 중인데 송장 번호가 없는 주문">
          <input type="checkbox" name="no_tracking" value="1" defaultChecked={f.noTracking} /> 송장 없음
        </label>
        <button className="rounded bg-gray-900 px-3 py-1.5 text-white">찾기</button>
        {narrowed && (
          <Link href={orderListHref(base, { ...f, q: "", from: undefined, to: undefined, noTracking: false }, { page: 1 })} className="py-1.5 text-gray-500 underline">
            조건 지우기
          </Link>
        )}
      </form>
      <p className="mt-2 text-xs text-gray-500" data-order-found>
        {found}건{pages > 1 && ` · ${f.page}/${pages}쪽`}
      </p>

      {orders.length === 0 ? (
        <p className="mt-6 rounded border border-dashed p-8 text-center text-sm text-gray-500">{narrowed ? "조건에 맞는 주문이 없습니다." : "주문이 없습니다."}</p>
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
                  {o.is_guest && <span className="ml-1 rounded bg-amber-50 px-1.5 text-xs text-amber-800" data-guest-badge>비회원</span>}
                </span>
                <b>{formatWon(o.total)}</b>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{ORDER_STATUS_LABEL[o.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-3 text-sm" data-order-pages>
          {f.page > 1 ? <Link href={orderListHref(base, f, { page: f.page - 1 })} className="rounded bg-gray-100 px-3 py-1.5">‹ 이전</Link> : <span className="px-3 py-1.5 text-gray-300">‹ 이전</span>}
          <span>
            {f.page} / {pages}
          </span>
          {f.page < pages ? <Link href={orderListHref(base, f, { page: f.page + 1 })} className="rounded bg-gray-100 px-3 py-1.5">다음 ›</Link> : <span className="px-3 py-1.5 text-gray-300">다음 ›</span>}
        </nav>
      )}
    </AdminShell>
  );
}
