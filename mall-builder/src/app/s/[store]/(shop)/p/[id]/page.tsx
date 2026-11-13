import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryRows, getCurrentUser, getMyCustomer, getPriceContext, getProductVariants, getShippingPolicies, getShopProduct, getStoreBySlug } from "@/lib/store";
import { describePolicy } from "@/lib/shipping";
import { buildCategoryTree, categoryPath, flattenTree } from "@/lib/categories";
import ProductDetail from "./product-detail";
import ProductBoards from "./product-boards";
import { getDownloadableCoupons, getMyCoupons } from "@/lib/benefits-store";
import { couponEligible, couponLabel } from "@/lib/benefits";
import { downloadCouponAction } from "@/lib/benefit-actions";
import { createClient } from "@/lib/supabase/server";
import { GROUP_BUY_STATUS_LABEL, progressPercent, remainingLabel, type GroupBuyInfo } from "@/lib/groupBuy";

export const dynamic = "force-dynamic";

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 상품 상세
export default async function ProductPage({ params, searchParams }: { params: Promise<{ store: string; id: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug, id } = await params;
  const { error, ok, msg } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const store = await getStoreBySlug(slug);
  const product = await getShopProduct(store.id, id);
  if (!product) notFound();
  const [variants, categoryRows, policies, user] = await Promise.all([
    getProductVariants(product.id),
    getCategoryRows(store.id),
    getShippingPolicies(store.id),
    getCurrentUser(),
  ]);
  const customer = user ? await getMyCustomer(store.id, user.id) : null;
  const policy = policies.find((p) => p.id === product.shipping_policy_id) ?? policies.find((p) => p.is_default) ?? null;
  const ctx = await getPriceContext(store.id, product.id);
  if (product.visibility === "business_only" && ctx.viewer !== "business") {
    return (
      <main className="mx-auto my-16 max-w-md px-4 text-center" data-business-only>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600 shadow-inner">
            💼
          </div>
          <h1 className="mt-4 text-xl font-black tracking-tight text-slate-900">사업자 회원 전용 상품입니다</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            사업자 승인을 받은 회원만 볼 수 있습니다. 마이페이지에서 사업자 승인을 신청해 주세요.
          </p>
          <Link href={`/s/${store.slug}/my`} className="mt-5 inline-block btn-3d-blue px-5 py-2.5 text-xs">
            마이페이지 바로가기
          </Link>
        </div>
      </main>
    );
  }

  // 경로: 손님에게 보이는 첫 번째 카테고리
  const visibleIds = new Set(flattenTree(buildCategoryTree(categoryRows, false)).map((c) => c.id));
  const firstCategory = product.category_ids.find((cid) => visibleIds.has(cid));
  const path = firstCategory ? categoryPath(categoryRows, firstCategory) : [];
  const base = `/s/${store.slug}`;
  // 받을 수 있는 쿠폰(D17) — 이 상품에 쓸 수 있는 「손님이 받기」 쿠폰만
  const [downloadable, mine] = await Promise.all([getDownloadableCoupons(store.id), customer ? getMyCoupons(customer.id) : Promise.resolve([])]);
  const forThis = downloadable.filter((c) => couponEligible(c, { productId: product.id, categoryIds: product.category_ids }));
  const received = new Set(mine.map((i) => i.coupon.id));
  const here = `${base}/p/${product.id}`;
  // 공동구매(D21) 진행 막대 — 진행 중이거나 판정이 끝난 가장 최근 것
  const { data: gbData } = await (await createClient()).rpc("mall_builder_group_buy_info", { p_product_id: product.id });
  const gb = (gbData ?? null) as GroupBuyInfo | null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 브레드크럼 */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
        <Link href={base} className="hover:text-blue-600 transition-colors">홈</Link>
        {path.map((p) => (
          <span key={p.id} className="flex items-center gap-1.5">
            <span className="text-slate-300">›</span>
            <Link href={`${base}/c/${p.id}`} className="hover:text-blue-600 transition-colors">{p.name}</Link>
          </span>
        ))}
      </nav>

      {/* 상품 메인 영역 */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-xs">
        <ProductDetail
          slug={store.slug}
          productId={product.id}
          name={product.name}
          summary={product.summary}
          images={product.images ?? []}
          status={product.status}
          visibility={product.visibility}
          priceVisibility={product.price_visibility}
          moq={product.moq}
          orderUnit={product.order_unit}
          maxQty={product.max_qty}
          memberPhone={customer?.phone ?? null}
          ctx={ctx}
          basePrice={product.base_price}
          listPrice={product.list_price}
          stockMode={product.stock_mode}
          stock={product.stock}
          shippingText={describePolicy(policy)}
          groups={product.option_groups ?? []}
          variants={variants.map(({ id, key, values, extra_price, stock, sku, is_active }) => ({ id, key, values, extra_price, stock, sku, is_active }))}
        />
      </div>

      {/* 공동구매 안내 */}
      {gb && (gb.open || gb.status !== "active") && (
        <section className="mt-8 rounded-2xl border-2 border-orange-300 bg-orange-50/60 p-5 sm:p-6 shadow-xs" data-group-buy>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-md bg-orange-600 px-2.5 py-1 text-xs font-black text-white shadow-xs">
              공동구매
            </span>
            <b className="text-base text-slate-900">{gb.title}</b>
            <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
              {gb.open ? remainingLabel(gb.ends_at) : GROUP_BUY_STATUS_LABEL[gb.status]}
            </span>
            <span className="ml-auto text-lg font-black text-orange-700">
              {Number(gb.group_price).toLocaleString("ko-KR")}원
            </span>
          </div>
          <div className="mt-4 h-3.5 overflow-hidden rounded-full bg-orange-200/80 p-0.5" aria-label="공동구매 진행률">
            <div className="h-full rounded-full bg-orange-600 transition-all duration-500" style={{ width: `${progressPercent(gb.achieved_qty, gb.target_qty)}%` }} />
          </div>
          <p className="mt-2 text-xs font-medium text-orange-950" data-group-buy-progress>
            {gb.achieved_qty.toLocaleString("ko-KR")}개 / 목표 {gb.target_qty.toLocaleString("ko-KR")}개 ({progressPercent(gb.achieved_qty, gb.target_qty)}%)
            {gb.max_per_customer ? ` · 1인 최대 ${gb.max_per_customer}개` : ""}
          </p>
          {gb.open && (
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              결제가 끝난 수량만 셉니다. 마감까지 목표를 채우지 못하면 주문이 모두 취소되고 결제 금액은 환불됩니다. 공동구매 상품은 다른 상품과 따로 주문해 주세요.
            </p>
          )}
        </section>
      )}

      {/* 쿠폰 받기 */}
      {forThis.length > 0 && (
        <section className="mt-8 space-y-2.5" data-product-coupons>
          <h3 className="text-sm font-bold text-slate-900">다운로드 가능한 혜택 쿠폰</h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {forThis.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-rose-300 bg-rose-50/50 p-4 shadow-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-rose-600 px-1.5 py-0.2 text-[10px] font-bold text-white">쿠폰</span>
                    <b className="truncate text-sm font-bold text-slate-900">{c.name}</b>
                  </div>
                  <p className="mt-1 text-xs text-rose-700 font-medium">{couponLabel(c)}</p>
                </div>
                {!customer ? (
                  <Link href={`/login?next=${encodeURIComponent(here)}`} className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    로그인하고 받기
                  </Link>
                ) : received.has(c.id) ? (
                  <span className="shrink-0 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">
                    받음
                  </span>
                ) : (
                  <form action={downloadCouponAction.bind(null, store.slug, c.id, here)} className="shrink-0">
                    <button className="btn-3d-dark px-3 py-1.5 text-xs" data-coupon-download>
                      쿠폰 받기
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 상세 설명 */}
      {product.description && (
        <section className="mt-10 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <h2 className="mb-4 text-lg font-black tracking-tight text-slate-900">상세 설명</h2>
          <div className="border-t border-slate-100 pt-4">
            <p className="whitespace-pre-line leading-relaxed text-slate-700 text-sm sm:text-base">{product.description}</p>
          </div>
        </section>
      )}

      {error && <p className="mt-8 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700" data-board-error>{error}</p>}
      {ok && <p className="mt-8 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700" data-board-ok>{msg || "처리했습니다."}</p>}

      <div className="mt-10">
        <ProductBoards slug={store.slug} storeId={store.id} productId={product.id} loggedIn={!!user} isCustomer={!!customer} />
      </div>
    </main>
  );
}
