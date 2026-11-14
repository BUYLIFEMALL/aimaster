import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategoryRows,
  getCurrentUser,
  getMyCustomer,
  getPriceContext,
  getProductInquiries,
  getProductReviews,
  getProductVariants,
  getShippingPolicies,
  getShopProduct,
  getStoreBySlug,
} from "@/lib/store";
import { describePolicy, describeReturnFees } from "@/lib/shipping";
import { buildCategoryTree, categoryPath, flattenTree } from "@/lib/categories";
import ProductDetail from "./product-detail";
import ProductBoards from "./product-boards";
import ProductTabsNav from "./tabs-nav";
import { getDownloadableCoupons, getMyCoupons } from "@/lib/benefits-store";
import { couponEligible, couponLabel } from "@/lib/benefits";
import { downloadCouponAction } from "@/lib/benefit-actions";
import { createClient } from "@/lib/supabase/server";
import { GROUP_BUY_STATUS_LABEL, progressPercent, remainingLabel, type GroupBuyInfo } from "@/lib/groupBuy";

export const dynamic = "force-dynamic";

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 상품 상세 리뉴얼
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string; id: string }>;
  searchParams: Promise<{ error?: string; ok?: string; msg?: string }>;
}) {
  const { store: slug, id } = await params;
  const { error, ok, msg } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const store = await getStoreBySlug(slug);
  const product = await getShopProduct(store.id, id);
  if (!product) notFound();

  const [variants, categoryRows, policies, user, reviews, inquiries] = await Promise.all([
    getProductVariants(product.id),
    getCategoryRows(store.id),
    getShippingPolicies(store.id),
    getCurrentUser(),
    getProductReviews(product.id),
    getProductInquiries(product.id),
  ]);

  const customer = user ? await getMyCustomer(store.id, user.id) : null;
  const policy = policies.find((p) => p.id === product.shipping_policy_id) ?? policies.find((p) => p.is_default) ?? null;
  const ctx = await getPriceContext(store.id, product.id);

  if (product.visibility === "business_only" && ctx.viewer !== "business") {
    return (
      <main className="mx-auto my-16 max-w-md px-4 text-center" data-business-only>
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600 shadow-inner">
            💼
          </div>
          <h1 className="mt-4 text-xl font-black tracking-tight text-slate-900">사업자 회원 전용 상품입니다</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            사업자 승인을 받은 회원만 조회 및 구매할 수 있습니다. 마이페이지에서 사업자 승인을 신청해 주세요.
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
  const [downloadable, mine] = await Promise.all([
    getDownloadableCoupons(store.id),
    customer ? getMyCoupons(customer.id) : Promise.resolve([]),
  ]);
  const forThis = downloadable.filter((c) => couponEligible(c, { productId: product.id, categoryIds: product.category_ids }));
  const received = new Set(mine.map((i) => i.coupon.id));
  const here = `${base}/p/${product.id}`;

  // 공동구매(D21) 진행 막대 — 진행 중이거나 판정이 끝난 가장 최근 것
  const { data: gbData } = await (await createClient()).rpc("mall_builder_group_buy_info", { p_product_id: product.id });
  const gb = (gbData ?? null) as GroupBuyInfo | null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* 상단 브레드크럼 */}
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
        <Link href={base} className="hover:text-blue-600 transition-colors flex items-center gap-1">
          <span>🏠</span>
          <span>홈</span>
        </Link>
        {path.map((p) => (
          <span key={p.id} className="flex items-center gap-1.5">
            <span className="text-slate-300">›</span>
            <Link href={`${base}/c/${p.id}`} className="hover:text-blue-600 transition-colors">
              {p.name}
            </Link>
          </span>
        ))}
      </nav>

      {/* 1. 상품 메인 영역 (사진 + 가격 + 옵션 + 장바구니) */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-8 shadow-xs">
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
          variants={variants.map(({ id, key, values, extra_price, stock, sku, is_active }) => ({
            id,
            key,
            values,
            extra_price,
            stock,
            sku,
            is_active,
          }))}
        />
      </div>

      {/* 공동구매 안내 */}
      {gb && (gb.open || gb.status !== "active") && (
        <section className="mt-8 rounded-3xl border-2 border-orange-300 bg-orange-50/70 p-5 sm:p-6 shadow-xs" data-group-buy>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="rounded-lg bg-orange-600 px-3 py-1 text-xs font-black text-white shadow-xs">
                공동구매 특가
              </span>
              <b className="text-base text-slate-900">{gb.title}</b>
              <span className="rounded-md bg-orange-100 border border-orange-200 px-2 py-0.5 text-xs font-semibold text-orange-800">
                {gb.open ? remainingLabel(gb.ends_at) : GROUP_BUY_STATUS_LABEL[gb.status]}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-orange-900 mr-2 font-medium">공구가</span>
              <span className="text-xl font-black text-orange-700">
                {Number(gb.group_price).toLocaleString("ko-KR")}원
              </span>
            </div>
          </div>
          <div className="mt-4 h-3.5 overflow-hidden rounded-full bg-orange-200/80 p-0.5" aria-label="공동구매 진행률">
            <div
              className="h-full rounded-full bg-orange-600 transition-all duration-500"
              style={{ width: `${progressPercent(gb.achieved_qty, gb.target_qty)}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-bold text-orange-950 flex items-center justify-between" data-group-buy-progress>
            <span>
              현재 {gb.achieved_qty.toLocaleString("ko-KR")}개 주문 / 목표 {gb.target_qty.toLocaleString("ko-KR")}개
            </span>
            <span className="text-orange-800 font-black">{progressPercent(gb.achieved_qty, gb.target_qty)}% 달성</span>
          </p>
          {gb.open && (
            <p className="mt-2 text-xs leading-relaxed text-slate-600 bg-white/70 p-3 rounded-xl border border-orange-200/60">
              ※ 결제가 완료된 수량만 집계됩니다. 마감 시점까지 목표를 달성하지 못하면 주문이 취소되고 전액 자동 환불됩니다.
            </p>
          )}
        </section>
      )}

      {/* 다운로드 쿠폰 바우처 */}
      {forThis.length > 0 && (
        <section className="mt-8 space-y-3" data-product-coupons>
          <div className="flex items-center gap-2">
            <span className="text-sm">🎟️</span>
            <h3 className="text-sm font-bold text-slate-900">다운로드 가능한 혜택 쿠폰</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {forThis.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-rose-300 bg-rose-50/60 p-4 shadow-2xs relative overflow-hidden"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                      COUPON
                    </span>
                    <b className="truncate text-sm font-bold text-slate-900">{c.name}</b>
                  </div>
                  <p className="mt-1 text-xs text-rose-700 font-bold">{couponLabel(c)}</p>
                </div>
                {!customer ? (
                  <Link
                    href={`/login?next=${encodeURIComponent(here)}`}
                    className="shrink-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    로그인하고 받기
                  </Link>
                ) : received.has(c.id) ? (
                  <span className="shrink-0 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-400">
                    ✓ 발급 완료
                  </span>
                ) : (
                  <form action={downloadCouponAction.bind(null, store.slug, c.id, here)} className="shrink-0">
                    <button className="btn-3d-dark px-3.5 py-2 text-xs font-bold" data-coupon-download>
                      쿠폰 받기
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. 스티키 탭 네비게이션 */}
      <div className="mt-10">
        <ProductTabsNav reviewsCount={reviews.count} inquiriesCount={inquiries.count} />
      </div>

      {/* 3. 상품 상세정보 섹션 */}
      <div id="detail-description" className="scroll-mt-24 space-y-8">
        {(product.description || (product.detail_images && product.detail_images.length > 0)) ? (
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-sm">🔍</span>
              <h2 className="text-lg font-black tracking-tight text-slate-900">상품 상세정보</h2>
            </div>

            {product.description && (
              <div className="text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-line max-w-3xl mx-auto">
                {product.description}
              </div>
            )}

            {product.detail_images && product.detail_images.length > 0 && (
              <div className={`flex flex-col items-center ${product.description ? "mt-10 border-t border-slate-100 pt-10" : ""}`}>
                <div className="w-full max-w-[860px] flex flex-col gap-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200/80">
                  {product.detail_images.map((img, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.path || img.url || idx}
                      src={img.url}
                      alt={`${product.name} 상세사진 ${idx + 1}`}
                      loading="lazy"
                      className="block w-full h-auto object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-12 text-center text-slate-400 text-sm shadow-xs">
            상세 설명이 등록되지 않은 상품입니다.
          </div>
        )}
      </div>

      {/* 4. 배송 · 교환 · 반품 안내 섹션 */}
      <div id="detail-shipping" className="mt-12 scroll-mt-24">
        <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-sm">🚚</span>
            <h2 className="text-lg font-black tracking-tight text-slate-900">배송 · 교환 · 반품 안내</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>📦</span>
                <span>배송 정책</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                <li className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">기본 배송비</span>
                  <span className="font-bold text-slate-900">{describePolicy(policy)}</span>
                </li>
                {policy?.jeju_fee ? (
                  <li className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">제주도 추가 배송비</span>
                    <span className="font-semibold text-slate-900">+{policy.jeju_fee.toLocaleString("ko-KR")}원</span>
                  </li>
                ) : null}
                {policy?.island_fee ? (
                  <li className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">도서산간 추가 배송비</span>
                    <span className="font-semibold text-slate-900">+{policy.island_fee.toLocaleString("ko-KR")}원</span>
                  </li>
                ) : null}
                {describeReturnFees(policy) && (
                  <li className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">반품·교환 배송비</span>
                    <span className="font-semibold text-slate-900">{describeReturnFees(policy)}</span>
                  </li>
                )}
                <li className="flex justify-between">
                  <span className="text-slate-500">묶음 배송</span>
                  <span className="font-semibold text-slate-900">{policy?.bundle === false ? "묶음 불가 (개별 배송)" : "묶음 배송 가능"}</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>🔄</span>
                <span>교환 및 반품 안내</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                <li className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">반품 배송비 (편도)</span>
                  <span className="font-bold text-slate-900">
                    {policy?.return_fee ? `${policy.return_fee.toLocaleString("ko-KR")}원` : "기본 배송비 기준"}
                  </span>
                </li>
                <li className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">교환 배송비 (왕복)</span>
                  <span className="font-bold text-slate-900">
                    {policy?.exchange_fee ? `${policy.exchange_fee.toLocaleString("ko-KR")}원` : "기본 배송비 × 2"}
                  </span>
                </li>
                <li className="text-[11px] text-slate-500 pt-1">
                  ※ 상품 수령 후 7일 이내에 교환/반품 신청이 가능하며, 상품 개봉 또는 사용 흔적이 있을 경우 교환/반품이 제한될 수 있습니다.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* 상태 알림 메시지 */}
      {error && (
        <p className="mt-8 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-700" data-board-error>
          {error}
        </p>
      )}
      {ok && (
        <p className="mt-8 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-700" data-board-ok>
          {msg || "정상적으로 처리되었습니다."}
        </p>
      )}

      {/* 5. 상품 게시판 (구매 후기 & 상품 문의) */}
      <div className="mt-12">
        <ProductBoards
          slug={store.slug}
          storeId={store.id}
          productId={product.id}
          loggedIn={!!user}
          isCustomer={!!customer}
        />
      </div>
    </main>
  );
}
