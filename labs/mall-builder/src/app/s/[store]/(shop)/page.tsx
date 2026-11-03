import { getPublishedHome, getShopProducts, getStoreBySlug } from "@/lib/store";
import { HomeBlocks } from "../home-blocks";
import { ProductGrid } from "./product-card";

export const dynamic = "force-dynamic";

// 손님 첫 화면 — 위쪽은 운영자가 게시한 블록(F18, 초안은 안 보임), 아래는 신상품 목록. 쇼윈도·글·공지 블록은 F19
export default async function StorefrontPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  const [home, products] = await Promise.all([getPublishedHome(store.id), getShopProducts(store.id, { limit: 24 })]);

  return (
    <>
      {store.status === "suspended" && (
        <p className="mx-auto mt-4 max-w-5xl rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          이 몰은 정지된 상태입니다. 운영자인 회원님에게만 보입니다.
        </p>
      )}
      {home.blocks.length > 0 && (
        <div className="mx-auto max-w-5xl pt-4">
          <HomeBlocks blocks={home.blocks} />
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="mb-4 text-lg font-semibold">신상품</h2>
        <ProductGrid base={`/s/${store.slug}`} products={products} empty="쇼핑몰을 준비하고 있습니다." />
      </main>
    </>
  );
}
