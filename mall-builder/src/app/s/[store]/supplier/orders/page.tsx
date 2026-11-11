import { getSupplierOrders, type SupplierOrderItem } from "@/lib/supplier-store";
import { shipSupplierItemAction } from "@/lib/supplier-actions";
import { ORDER_STATUS_LABEL, formatDateTime, type OrderStatus } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import { getSupplierContext, NotSupplier, SupplierShell } from "../supplier-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SHIPPABLE = ["paid", "preparing", "shipping"];

/** 남은 수량(취소 뺀 것) */
const leftQty = (it: SupplierOrderItem) => it.qty - it.cancelled_qty;

// D36 공급사 「내 주문」 — 내 품목만. 발송할 품목에는 받는 사람·주소가 보이고 송장을 넣는다(배송이 끝나면 주소는 가림)
export default async function SupplierOrdersPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const notice = await searchParams;
  const { user, store, me } = await getSupplierContext(slug, `/s/${slug}/supplier/orders`);
  const { items } = me ? await getSupplierOrders(store.id) : { items: [] as SupplierOrderItem[] };
  const todo = items.filter((it) => SHIPPABLE.includes(it.order_status) && !it.shipped_at && leftQty(it) > 0);
  const rest = items.filter((it) => !todo.includes(it));

  return (
    <SupplierShell slug={store.slug} storeName={store.name} email={user.email ?? ""} active="/orders" notice={notice}>
      {!me ? (
        <NotSupplier />
      ) : (
        <>
          <p className="text-sm text-gray-500">입금이 확인된 주문 중 내 상품 품목만 보입니다. 받는 사람·주소는 발송에만 쓰고, 배송이 끝나면 가려집니다.</p>
          <section className="mt-4" data-supplier-todo>
            <h2 className="text-sm font-semibold">발송할 품목 <b className={todo.length ? "text-red-700" : ""}>{todo.length}</b></h2>
            {todo.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">지금 발송할 품목이 없습니다.</p>
            ) : (
              <ul className="mt-2 space-y-3">{todo.map((it) => <ItemCard key={it.item_id} slug={store.slug} it={it} />)}</ul>
            )}
          </section>
          {rest.length > 0 && (
            <section className="mt-6" data-supplier-done>
              <h2 className="text-sm font-semibold">발송한 품목·지난 주문 {rest.length}</h2>
              <ul className="mt-2 space-y-2">{rest.map((it) => <ItemCard key={it.item_id} slug={store.slug} it={it} />)}</ul>
            </section>
          )}
        </>
      )}
    </SupplierShell>
  );
}

function ItemCard({ slug, it }: { slug: string; it: SupplierOrderItem }) {
  const canShip = SHIPPABLE.includes(it.order_status) && leftQty(it) > 0;
  const r = it.receiver;
  return (
    <li className="rounded border p-3 text-sm" data-supplier-order-item>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-gray-500">{it.order_no}</span>
        <span className="rounded bg-gray-100 px-1.5 text-xs">{ORDER_STATUS_LABEL[it.order_status as OrderStatus] ?? it.order_status}</span>
        <span className="ml-auto text-xs text-gray-400">{formatDateTime(it.ordered_at)}</span>
      </div>
      <p className="mt-1">
        <b>{it.name}</b>{it.option && <span className="text-gray-500"> · {it.option}</span>} × {leftQty(it)}
        {it.cancelled_qty > 0 && <span className="ml-1 text-xs text-red-600">(취소 {it.cancelled_qty}개)</span>}
        <span className="ml-2 text-xs text-gray-500">공급가 {formatWon(it.supply_price * leftQty(it))}</span>
      </p>
      {r && (
        <div className="mt-2 rounded bg-gray-50 px-3 py-2 text-xs" data-supplier-receiver>
          <p><b>{r.receiver}</b> · {r.phone}</p>
          <p>({r.zip}) {r.addr1} {r.addr2}</p>
          {r.memo && <p className="text-gray-600">요청: {r.memo}</p>}
        </div>
      )}
      {it.shipped_at && <p className="mt-1 text-xs text-emerald-700" data-supplier-shipped>발송 {formatDateTime(it.shipped_at)} · {it.courier} {it.tracking_no}</p>}
      {canShip && (
        <form action={shipSupplierItemAction.bind(null, slug, it.item_id)} className="mt-2 flex flex-wrap items-center gap-2" data-supplier-ship-form>
          <input name="courier" required maxLength={30} defaultValue={it.courier || ""} placeholder="택배사(예: CJ대한통운)" className="w-36 rounded border px-2 py-1.5" />
          <input name="tracking_no" required maxLength={40} defaultValue={it.tracking_no || ""} placeholder="송장 번호" className="w-40 rounded border px-2 py-1.5" />
          <button className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-xs text-white">{it.shipped_at ? "송장 고치기" : "발송 처리"}</button>
        </form>
      )}
    </li>
  );
}
