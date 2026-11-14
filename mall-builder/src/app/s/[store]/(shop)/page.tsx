import type { ReactNode } from "react";
import { getPublishedDesign, getPublishedHome, getShopProducts, getStoreBySlug } from "@/lib/store";
import { readPopup } from "@/lib/builder/frame";
import HomePopup from "./home-popup";
import { isLive } from "@/lib/blocks";
import { loadSlotData, visibleCategoryNames } from "@/lib/builder/slot-data";
import { HomeBlocks } from "../home-blocks";
import { renderSlot, SLOT_BLOCK_TYPES } from "../home-slots";
import { ProductGrid } from "./product-card";

export const dynamic = "force-dynamic";

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 첫 화면
// 위쪽은 운영자가 게시한 블록(F18·F19, 초안은 안 보임), 아래는 신상품 목록
export default async function StorefrontPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  const base = `/s/${store.slug}`;
  const [published, products, design] = await Promise.all([getPublishedHome(store.id), getShopProducts(store.id, { limit: 24 }), getPublishedDesign(store.id)]);
  // 예약 노출·타임세일 끝(D28) — 서버 시각으로 지금 보일 블록만
  const now = Date.now();
  const home = { ...published, blocks: published.blocks.filter((b) => isLive(b, now)) };
  // 서버 데이터가 필요한 블록(상품·공지·후기·카테고리) — 가져오기·그리기는 편집기 미리보기와 공용(D2-5)
  const needCats = home.blocks.some((b) => b.type === "category_icons");
  const categories = needCats ? await visibleCategoryNames(store.id) : undefined;
  const slots: Record<string, ReactNode> = {};
  await Promise.all(
    home.blocks
      .filter((b) => b.visible && (SLOT_BLOCK_TYPES as readonly string[]).includes(b.type))
      .map(async (b) => {
        slots[b.id] = renderSlot(b, base, await loadSlotData(store.id, b, categories));
      }),
  );

  return (
    <>
      {/* 디자인 빌더 D3 첫 화면 팝업(게시된 것만) */}
      <HomePopup slug={store.slug} popup={readPopup(design.popup)} />
      {store.status === "suspended" && (
        <div className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            이 몰은 정지된 상태입니다. 운영자인 회원님에게만 보입니다.
          </p>
        </div>
      )}

      {home.blocks.length > 0 && (
        <div className="mx-auto max-w-6xl pt-6">
          <HomeBlocks blocks={home.blocks} slots={slots} />
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div>
            <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">New Arrivals</span>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">신상품</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">엄선된 B2B 최신 큐레이션</span>
        </div>
        <ProductGrid base={base} products={products} empty="쇼핑몰을 준비하고 있습니다." />
      </main>
    </>
  );
}
