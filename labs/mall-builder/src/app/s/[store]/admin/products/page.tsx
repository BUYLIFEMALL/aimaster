import Link from "next/link";
import { getCategoryRows, getStaffStore, getStoreProducts } from "@/lib/store";
import { PRODUCT_STATUS, discountRate, formatWon } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  on_sale: "bg-green-50 text-green-700",
  sold_out: "bg-amber-50 text-amber-700",
  hidden: "bg-gray-200 text-gray-500",
};

export default async function ProductsPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/products`);
  if (!staff) return <NoPermission />;
  const [products, categoryRows] = await Promise.all([getStoreProducts(store.id), getCategoryRows(store.id)]);
  const categoryName = new Map(categoryRows.map((c) => [c.id, c.name]));
  // 재입고 알림 대기 인원(D16) — 상품별(옵션 신청 포함) 합계
  const supabase = await createClient();
  const { data: waitingRows } = await supabase.from("mall_builder_restock_requests").select("product_id").eq("store_id", store.id).eq("status", "waiting").limit(5000);
  const waiting = new Map<string, number>();
  for (const r of waitingRows ?? []) waiting.set(r.product_id as string, (waiting.get(r.product_id as string) ?? 0) + 1);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/products">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">상품 {products.length}개</p>
        <Link href={`/s/${store.slug}/admin/products/new`} className="min-h-11 rounded bg-gray-900 px-4 py-2.5 text-sm text-white">
          + 새 상품
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">아직 상품이 없습니다. 「+ 새 상품」으로 등록해 보세요.</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {products.map((p) => {
            const rate = discountRate(p.base_price, p.list_price);
            return (
              <li key={p.id}>
                <Link href={`/s/${store.slug}/admin/products/${p.id}`} className="flex gap-3 p-3 hover:bg-gray-50">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded border bg-gray-50">
                    {p.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_TONE[p.status]}`}>{PRODUCT_STATUS[p.status]}</span>
                      <span className="truncate font-medium">{p.name}</span>
                      {(waiting.get(p.id) ?? 0) > 0 && (
                        <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800" data-restock-waiting>
                          🔔 알림 대기 {waiting.get(p.id)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm">
                      <b>{formatWon(p.base_price)}</b>
                      {rate > 0 && <span className="ml-2 text-xs text-gray-400 line-through">{formatWon(p.list_price)}</span>}
                      {rate > 0 && <span className="ml-1 text-xs text-red-600">{rate}%</span>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {p.stock_mode === "product" ? `재고 ${p.stock.toLocaleString("ko-KR")}개` : "재고 관리 안 함"}
                      {p.category_ids.length > 0 && ` · ${p.category_ids.map((id) => categoryName.get(id) ?? "?").join(", ")}`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
