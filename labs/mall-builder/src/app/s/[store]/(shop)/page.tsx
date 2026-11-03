import { getShopProducts, getStoreBySlug } from "@/lib/store";
import { ProductGrid } from "./product-card";

export const dynamic = "force-dynamic";

// 손님 첫 화면 — F06은 신상품 목록. 블록 편집 첫 화면(배너·쇼윈도)은 F18~F19에서 바꾼다.
export default async function StorefrontPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  const products = await getShopProducts(store.id, { limit: 24 });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {store.status === "suspended" && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          이 몰은 정지된 상태입니다. 운영자인 회원님에게만 보입니다.
        </p>
      )}
      <h2 className="mb-4 text-lg font-semibold">신상품</h2>
      <ProductGrid base={`/s/${store.slug}`} products={products} empty="쇼핑몰을 준비하고 있습니다." />
    </main>
  );
}
