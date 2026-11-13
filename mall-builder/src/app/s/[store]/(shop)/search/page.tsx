import { getShopProducts, getStoreBySlug } from "@/lib/store";
import { ProductGrid } from "../product-card";

export const dynamic = "force-dynamic";

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 검색 결과
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
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <form className="mb-6 sm:hidden">
        <div className="relative">
          <input
            name="q"
            defaultValue={q}
            placeholder="상품 검색"
            maxLength={50}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs focus:border-blue-500 focus:outline-hidden"
          />
        </div>
      </form>

      <div className="mb-6 border-b border-slate-200/80 pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Search Results</span>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          {q ? `「${q}」 검색 결과 ${products.length}개` : "검색어를 입력해 주세요."}
        </h1>
      </div>

      {q && <ProductGrid base={`/s/${store.slug}`} products={products} empty="찾는 상품이 없습니다. 다른 검색어로 찾아보세요." />}
    </main>
  );
}
