import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryRows, getCurrentUser, getMyCustomer, getPriceContext, getProductVariants, getShippingPolicies, getShopProduct, getStoreBySlug } from "@/lib/store";
import { describePolicy } from "@/lib/shipping";
import { buildCategoryTree, categoryPath, flattenTree } from "@/lib/categories";
import ProductDetail from "./product-detail";
import ProductBoards from "./product-boards";

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
        ctx={ctx}
        basePrice={product.base_price}
        listPrice={product.list_price}
        stockMode={product.stock_mode}
        stock={product.stock}
        shippingText={describePolicy(policy)}
        groups={product.option_groups ?? []}
        variants={variants.map(({ id, key, values, extra_price, stock, sku, is_active }) => ({ id, key, values, extra_price, stock, sku, is_active }))}
      />

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
