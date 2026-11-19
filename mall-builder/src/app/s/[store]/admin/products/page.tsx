import Link from "next/link";
import { getCategoryRows, getProductCounts, getStaffStore, getStoreProductPage } from "@/lib/store";
import { PRODUCT_STATUS, discountRate, formatWon } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";
import { APPROVAL_LABEL, type Approval } from "@/lib/supplier";
import { PRODUCT_BULK_MAX, PRODUCT_STATUSES, parseProductListQuery, productListHref, productPageCount } from "@/lib/product-list";
import { AdminShell, NoPermission } from "../admin-shell";
import { productBulkAction } from "./bulk-actions";
import { BananaSend } from "./banana-send";
import type { MallPhotoRow } from "@/lib/mallPhotoJob";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  on_sale: "bg-green-50 text-green-700",
  sold_out: "bg-amber-50 text-amber-700",
  hidden: "bg-gray-200 text-gray-500",
};

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { store: slug } = await params;
  const sp = await searchParams;
  const f = parseProductListQuery(sp); // M2-9: 판매 상태·카테고리·재고 0·승인 대기·검색어·페이지
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const bulk = { ok: Number(one("bulk_ok")) || 0, fail: Number(one("bulk_fail")) || 0, error: one("bulk_error").slice(0, 300) };
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/products`);
  if (!staff) return <NoPermission />;
  const [{ rows: products, total: found }, counts, categoryRows] = await Promise.all([getStoreProductPage(store.id, f), getProductCounts(store.id), getCategoryRows(store.id)]);
  const categoryName = new Map(categoryRows.map((c) => [c.id, c.name]));
  const pageIds = products.map((p) => p.id);
  // 재입고 알림 대기 인원(D16)·공급사 상품 표시(D35) — 이 쪽 상품만
  const supabase = await createClient();
  const [{ data: waitingRows }, { data: supRows }, { data: supNames }, { data: photoRows }] = await Promise.all([
    supabase.from("mall_builder_restock_requests").select("product_id").eq("store_id", store.id).eq("status", "waiting").in("product_id", pageIds.length ? pageIds : ["00000000-0000-0000-0000-000000000000"]).limit(5000),
    supabase.from("mall_builder_products").select("id, supplier_id, approval").eq("store_id", store.id).not("supplier_id", "is", null).in("id", pageIds.length ? pageIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("mall_builder_suppliers").select("id, name").eq("store_id", store.id).order("name"),
    // 메이커 M1 바나나 보내기: 이 몰 상품만(거울 표시·수정 시각) — 공용 조회 칸(PRODUCT_COLUMNS)은 그대로 둔다
    supabase.from("mall_builder_products").select("id, name, images, source_product_id, updated_at").eq("store_id", store.id).in("id", pageIds.length ? pageIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  const waiting = new Map<string, number>();
  for (const r of waitingRows ?? []) waiting.set(r.product_id as string, (waiting.get(r.product_id as string) ?? 0) + 1);
  const supName = new Map((supNames ?? []).map((s) => [s.id as string, s.name as string]));
  const supplied = new Map((supRows ?? []).map((r) => [r.id as string, { name: supName.get(r.supplier_id as string) ?? "공급사", approval: r.approval as Approval }]));

  const base = `/s/${store.slug}/admin/products`;
  const pages = productPageCount(found);
  const narrowed = Boolean(f.q || f.category || f.noStock || f.pending || f.supplier);
  const keep = productListHref("", f, {}).replace(/^\?/, ""); // 일괄 변경 뒤 같은 목록으로

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/products">
      {/* 직관적 상단 KPI 4종 */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>전체 상품</span><span>📦</span></div>
          <p className="mt-1.5 text-2xl font-black text-slate-900">{counts.all}개</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700"><span>판매 중</span><span>🟢</span></div>
          <p className="mt-1.5 text-2xl font-black text-emerald-700">{counts.status.on_sale ?? 0}개</p>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700"><span>품절</span><span>🟠</span></div>
          <p className="mt-1.5 text-2xl font-black text-amber-700">{counts.status.sold_out ?? 0}개</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>숨김·임시</span><span>⚪</span></div>
          <p className="mt-1.5 text-2xl font-black text-slate-700">{(counts.status.hidden ?? 0) + (counts.status.draft ?? 0)}개</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap gap-1.5 text-sm" data-product-tabs>
          <Link href={productListHref(base, f, { status: undefined, page: 1 })} className={`rounded-xl px-3.5 py-1.5 font-semibold transition ${!f.status ? "bg-slate-900 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>전체 {counts.all}</Link>
          {PRODUCT_STATUSES.map((st) =>
            counts.status[st] ? (
              <Link key={st} href={productListHref(base, f, { status: st, page: 1 })} className={`rounded-xl px-3.5 py-1.5 font-semibold transition ${f.status === st ? "bg-slate-900 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                {PRODUCT_STATUS[st]} {counts.status[st]}
              </Link>
            ) : null,
          )}
        </nav>
        <div className="flex gap-2">
          <Link href={`${base}/price-check`} className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-price-check-link>
            ⚠ 마진 점검
          </Link>
          <Link href={`${base}/excel`} className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-excel-link>
            📥 엑셀로 등록·수정
          </Link>
          <Link href={`${base}/new`} className="min-h-10 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-slate-800">
            + 새 상품
          </Link>
        </div>
      </div>

      <form method="get" action={base} className="mt-4 flex flex-wrap items-end gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-4 text-sm shadow-xs" data-product-search>
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">검색</span>
          <input name="q" defaultValue={f.q} maxLength={40} placeholder="상품명·품번" className="w-52 rounded border px-2 py-1.5" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">카테고리</span>
          <select name="category" defaultValue={f.category ?? ""} className="rounded border px-2 py-1.5">
            <option value="">전체</option>
            {categoryRows.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">등록한 곳</span>
          <select name="supplier" defaultValue={f.supplier ?? ""} className="rounded border px-2 py-1.5" data-supplier-filter>
            <option value="">전체</option>
            <option value="own">🏠 운영사 직접 등록</option>
            {(supNames ?? []).map((s) => (
              <option key={s.id as string} value={s.id as string}>🏭 {s.name as string}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 py-1.5">
          <input type="checkbox" name="no_stock" value="1" defaultChecked={f.noStock} /> 재고 0
        </label>
        <label className="flex items-center gap-1 py-1.5">
          <input type="checkbox" name="pending" value="1" defaultChecked={f.pending} /> 공급사 승인 대기
        </label>
        <button className="rounded bg-gray-900 px-3 py-1.5 text-white">찾기</button>
        {narrowed && (
          <Link href={productListHref(base, { ...f, q: "", category: undefined, noStock: false, pending: false, supplier: undefined }, { page: 1 })} className="py-1.5 text-gray-500 underline">
            조건 지우기
          </Link>
        )}
      </form>
      <p className="mt-2 text-sm text-gray-600" data-product-found>{narrowed || f.status ? `찾은 상품 ${found}개` : `상품 ${found}개`}</p>

      {(bulk.ok > 0 || bulk.fail > 0 || bulk.error) && (
        <p className={`mt-3 rounded px-3 py-2 text-sm ${bulk.fail || (bulk.error && !bulk.ok) ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-800"}`} data-bulk-result>
          {bulk.ok > 0 && <b>{bulk.ok}개 바꿈. </b>}
          {bulk.fail > 0 && <b>{bulk.fail}개 못 바꿈 </b>}
          {bulk.error && <span>— {bulk.error}</span>}
        </p>
      )}

      {products.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">{narrowed || f.status ? "조건에 맞는 상품이 없습니다." : "아직 상품이 없습니다. 「+ 새 상품」으로 등록해 보세요."}</p>
      ) : (
        <form action={productBulkAction.bind(null, store.slug, keep)} data-product-bulk-form>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-500">고른 상품을</span>
            <select name="op" defaultValue="" className="rounded border px-2 py-1" required>
              <option value="" disabled>할 일 고르기</option>
              <optgroup label="판매 상태 바꾸기">
                {PRODUCT_STATUSES.map((st) => (
                  <option key={st} value={`status:${st}`}>→ {PRODUCT_STATUS[st]}</option>
                ))}
              </optgroup>
              <optgroup label="카테고리">
                <option value="category_add">카테고리에 넣기</option>
                <option value="category_remove">카테고리에서 빼기</option>
              </optgroup>
            </select>
            <select name="category" defaultValue="" className="rounded border px-2 py-1" aria-label="넣거나 뺄 카테고리">
              <option value="">카테고리 고르기(넣기·빼기 때)</option>
              {categoryRows.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button className="rounded bg-gray-900 px-3 py-1 text-white">한꺼번에 바꾸기</button>
            <span className="text-xs text-gray-400">한 번에 {PRODUCT_BULK_MAX}개까지</span>
          </div>
          <BananaSend rows={(photoRows ?? []) as MallPhotoRow[]} storeId={store.id} />
          <a href={`${base}/proposals`} className="mt-1 inline-block text-xs underline" data-proposals-link>사진 제안 목록 보기</a>
          <ul className="mt-2 divide-y rounded-lg border">
            {products.map((p) => {
              const rate = discountRate(p.base_price, p.list_price);
              const sup = supplied.get(p.id);
              return (
                <li key={p.id} className="flex items-center gap-2" data-admin-product>
                  <input type="checkbox" name="ids" value={p.id} aria-label={`${p.name} 고르기`} className="ml-3 h-4 w-4 shrink-0" />
                  <Link href={`${base}/${p.id}`} className="flex min-w-0 flex-1 gap-3 p-3 hover:bg-gray-50">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded border bg-gray-50">
                      {p.images?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_TONE[p.status]}`}>{PRODUCT_STATUS[p.status]}</span>
                        {p.product_code && <span className="shrink-0 font-mono text-xs text-gray-500">{p.product_code}</span>}
                        <span className="truncate font-medium">{p.name}</span>
                        {sup ? (
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${sup.approval === "approved" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-800"}`} data-supplier-badge>
                            🏭 {sup.name}{sup.approval !== "approved" && ` · ${APPROVAL_LABEL[sup.approval]}`}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600" data-own-badge>
                            🏠 운영사
                          </span>
                        )}
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
        </form>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2 text-sm" data-product-pages>
          {f.page > 1 ? <Link href={productListHref(base, f, { page: f.page - 1 })} className="rounded bg-gray-100 px-3 py-1.5">‹ 이전</Link> : <span className="px-3 py-1.5 text-gray-300">‹ 이전</span>}
          <span className="text-gray-600">
            {f.page} / {pages}
          </span>
          {f.page < pages ? <Link href={productListHref(base, f, { page: f.page + 1 })} className="rounded bg-gray-100 px-3 py-1.5">다음 ›</Link> : <span className="px-3 py-1.5 text-gray-300">다음 ›</span>}
        </nav>
      )}
    </AdminShell>
  );
}
