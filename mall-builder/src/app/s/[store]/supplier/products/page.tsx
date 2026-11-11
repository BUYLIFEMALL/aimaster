import Link from "next/link";
import { getMySupplierProducts } from "@/lib/supplier-store";
import { pauseSupplierProductAction } from "@/lib/supplier-actions";
import { APPROVAL_LABEL, marginOf, supplierProductLive } from "@/lib/supplier";
import { PRODUCT_STATUS, formatWon } from "@/lib/products";
import { getSupplierContext, NotSupplier, SupplierShell } from "../supplier-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const APPROVAL_TONE: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-800",
  pending: "bg-amber-50 text-amber-800",
  rejected: "bg-red-50 text-red-700",
};

// D35 공급사 「내 상품」 — 올린 상품과 승인 상태(반려 사유), 판매 멈춤/다시 열기
export default async function SupplierProductsPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const notice = await searchParams;
  const { user, store, me } = await getSupplierContext(slug, `/s/${slug}/supplier/products`);
  const products = me ? await getMySupplierProducts(me.id) : [];

  return (
    <SupplierShell slug={store.slug} storeName={store.name} email={user.email ?? ""} active="/products" notice={notice}>
      {!me ? (
        <NotSupplier />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-500">내 상품 {products.length}개 · 판매가는 몰 운영자가 정합니다.</p>
            {me.status === "active" ? (
              <Link href={`/s/${store.slug}/supplier/products/new`} className="min-h-11 rounded bg-gray-900 px-4 py-2.5 text-sm text-white" data-supplier-new>+ 상품 올리기</Link>
            ) : (
              <span className="text-xs text-amber-700">쉬는 중에는 상품을 올릴 수 없습니다.</span>
            )}
          </div>
          {products.length === 0 ? (
            <p className="mt-6 rounded border border-dashed p-8 text-center text-sm text-gray-500">아직 올린 상품이 없습니다.</p>
          ) : (
            <ul className="mt-4 divide-y rounded border" data-supplier-products>
              {products.map((p) => {
                const live = supplierProductLive(p, me.status);
                const m = p.supply_price != null ? marginOf(p.base_price, p.supply_price) : null;
                return (
                  <li key={p.id} className="flex gap-3 p-3 text-sm" data-supplier-product>
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded border bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.images?.[0] && <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-xs ${APPROVAL_TONE[p.approval]}`} data-approval>{APPROVAL_LABEL[p.approval]}</span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{PRODUCT_STATUS[p.status]}</span>
                        {live && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">손님에게 보임</span>}
                        <Link href={`/s/${store.slug}/supplier/products/${p.id}`} className="truncate font-medium underline">{p.name}</Link>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        공급가 {formatWon(p.supply_price)} · 판매가 {formatWon(p.base_price)}{m && ` (몰 마진 ${m.rate}%)`} · 재고 {p.stock_mode === "product" ? `${p.stock}개` : "관리 안 함"}
                      </p>
                      {p.approval === "rejected" && p.approval_note && <p className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700" data-reject-note>반려 사유: {p.approval_note}</p>}
                      {p.approval === "pending" && <p className="mt-1 text-xs text-amber-700">운영자 확인을 기다리고 있습니다.</p>}
                    </div>
                    {p.approval === "approved" && me.status === "active" && (
                      <form action={pauseSupplierProductAction.bind(null, store.slug, p.id, p.status === "on_sale" || p.status === "sold_out")} className="shrink-0">
                        <button className="min-h-10 rounded border px-2 py-1 text-xs" data-supplier-pause>{p.status === "on_sale" || p.status === "sold_out" ? "판매 멈춤" : "판매 시작"}</button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </SupplierShell>
  );
}
