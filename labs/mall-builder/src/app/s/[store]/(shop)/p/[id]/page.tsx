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

// 손님 상품 상세 — 판매 중·품절 상품만(준비 중·숨김은 운영자에게도 404 — 미리보기는 관리 화면에서)
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
      <main className="mx-auto max-w-md px-4 py-16 text-center" data-business-only>
        <h1 className="text-xl font-bold">사업자 회원 전용 상품입니다</h1>
        <p className="mt-2 text-sm text-gray-600">사업자 승인을 받은 회원만 볼 수 있습니다. 마이페이지에서 사업자 승인을 신청해 주세요.</p>
        <Link href={`/s/${store.slug}/my`} className="mt-4 inline-block text-sm underline">마이페이지</Link>
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
    <main className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-gray-500">
        <Link href={base}>홈</Link>
        {path.map((p) => (
          <span key={p.id} className="flex items-center gap-1">
            <span>›</span>
            <Link href={`${base}/c/${p.id}`}>{p.name}</Link>
          </span>
        ))}
      </nav>

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

      {gb && (gb.open || gb.status !== "active") && (
        <section className="mt-6 rounded-lg border-2 border-orange-300 bg-orange-50 p-4 text-sm" data-group-buy>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-orange-600 px-2 py-0.5 text-xs font-bold text-white">공동구매</span>
            <b>{gb.title}</b>
            <span className="text-orange-800">{gb.open ? remainingLabel(gb.ends_at) : GROUP_BUY_STATUS_LABEL[gb.status]}</span>
            <span className="ml-auto text-base font-bold text-orange-700">{Number(gb.group_price).toLocaleString("ko-KR")}원</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-orange-100" aria-label="공동구매 진행률">
            <div className="h-full rounded-full bg-orange-500" style={{ width: `${progressPercent(gb.achieved_qty, gb.target_qty)}%` }} />
          </div>
          <p className="mt-1 text-xs text-orange-900" data-group-buy-progress>
            {gb.achieved_qty.toLocaleString("ko-KR")}개 / 목표 {gb.target_qty.toLocaleString("ko-KR")}개 ({progressPercent(gb.achieved_qty, gb.target_qty)}%)
            {gb.max_per_customer ? ` · 1인 최대 ${gb.max_per_customer}개` : ""}
          </p>
          {gb.open && (
            <p className="mt-2 text-xs text-gray-600">
              결제가 끝난 수량만 셉니다. 마감까지 목표를 채우지 못하면 주문이 모두 취소되고 결제 금액은 환불됩니다. 공동구매 상품은 다른 상품과 따로 주문해 주세요.
            </p>
          )}
        </section>
      )}

      {forThis.length > 0 && (
        <section className="mt-6 space-y-2" data-product-coupons>
          {forThis.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 rounded border border-dashed border-red-300 bg-red-50/40 px-3 py-2 text-sm">
              <span className="font-semibold text-red-700">쿠폰</span>
              <b>{c.name}</b>
              <span className="text-gray-600">{couponLabel(c)}</span>
              {!customer ? (
                <Link href={`/login?next=${encodeURIComponent(here)}`} className="ml-auto rounded border px-3 py-1 text-xs">로그인하고 받기</Link>
              ) : received.has(c.id) ? (
                <span className="ml-auto text-xs text-gray-500">받음</span>
              ) : (
                <form action={downloadCouponAction.bind(null, store.slug, c.id, here)} className="ml-auto">
                  <button className="rounded bg-gray-900 px-3 py-1 text-xs text-white" data-coupon-download>쿠폰 받기</button>
                </form>
              )}
            </div>
          ))}
        </section>
      )}

      {product.description && (
        <section className="mt-12 border-t pt-8">
          <h2 className="mb-4 font-semibold">상세 설명</h2>
          <p className="whitespace-pre-line leading-relaxed text-gray-800">{product.description}</p>
        </section>
      )}

      {error && <p className="mt-8 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-board-error>{error}</p>}
      {ok && <p className="mt-8 rounded bg-green-50 px-3 py-2 text-sm text-green-700" data-board-ok>{msg || "처리했습니다."}</p>}
      <ProductBoards slug={store.slug} storeId={store.id} productId={product.id} loggedIn={!!user} isCustomer={!!customer} />
    </main>
  );
}
