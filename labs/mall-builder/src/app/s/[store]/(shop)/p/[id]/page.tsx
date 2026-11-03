import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryRows, getProductVariants, getShippingPolicies, getShopProduct, getStoreBySlug } from "@/lib/store";
import { describePolicy } from "@/lib/shipping";
import { buildCategoryTree, categoryPath, flattenTree } from "@/lib/categories";
import ProductDetail from "./product-detail";

export const dynamic = "force-dynamic";

// 손님 상품 상세 — 판매 중·품절 상품만(준비 중·숨김은 운영자에게도 404 — 미리보기는 관리 화면에서)
export default async function ProductPage({ params }: { params: Promise<{ store: string; id: string }> }) {
  const { store: slug, id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const store = await getStoreBySlug(slug);
  const product = await getShopProduct(store.id, id);
  if (!product) notFound();
  const [variants, categoryRows, policies] = await Promise.all([
    getProductVariants(product.id),
    getCategoryRows(store.id),
    getShippingPolicies(store.id),
  ]);
  const policy = policies.find((p) => p.id === product.shipping_policy_id) ?? policies.find((p) => p.is_default) ?? null;

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
    </main>
  );
}
