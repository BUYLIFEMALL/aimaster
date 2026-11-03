import { getShopProducts, getStoreBySlug } from "@/lib/store";
import { ProductGrid } from "../product-card";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { store: slug } = await params;
  const q = ((await searchParams).q ?? "").trim().slice(0, 50);
  const store = await getStoreBySlug(slug);
  const products = q ? await getShopProducts(store.id, { q }) : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <form className="mb-6 sm:hidden">
        <input name="q" defaultValue={q} placeholder="상품 검색" maxLength={50} className="w-full rounded-full border px-4 py-2 text-sm" />
      </form>
      <h1 className="mb-4 text-lg font-semibold">{q ? `「${q}」 검색 결과 ${products.length}개` : "검색어를 입력해 주세요."}</h1>
      {q && <ProductGrid base={`/s/${store.slug}`} products={products} empty="찾는 상품이 없습니다. 다른 검색어로 찾아보세요." />}
    </main>
  );
}
