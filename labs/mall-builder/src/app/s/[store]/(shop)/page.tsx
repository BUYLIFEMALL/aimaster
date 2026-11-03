import Link from "next/link";
import type { ReactNode } from "react";
import { getNotices, getPublishedHome, getShopProducts, getShowcaseProducts, getStoreBySlug } from "@/lib/store";
import type { NoticeSettings, ShowcaseSettings } from "@/lib/blocks";
import { HomeBlocks } from "../home-blocks";
import { ProductGrid } from "./product-card";

export const dynamic = "force-dynamic";

// 손님 첫 화면 — 위쪽은 운영자가 게시한 블록(F18·F19, 초안은 안 보임), 아래는 신상품 목록
// 쇼윈도·공지 블록은 여기(서버)에서 상품·공지를 읽어 slots로 넘긴다(가격은 보는 사람 기준)
export default async function StorefrontPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  const base = `/s/${store.slug}`;
  const [home, products] = await Promise.all([getPublishedHome(store.id), getShopProducts(store.id, { limit: 24 })]);

  const slots: Record<string, ReactNode> = {};
  await Promise.all(
    home.blocks.filter((b) => b.visible).map(async (b) => {
      if (b.type === "showcase") {
        const s = b.settings as ShowcaseSettings;
        const list = await getShowcaseProducts(store.id, s);
        slots[b.id] = (
          <div className="px-4">
            {s.title && <h2 className="mb-4 text-lg font-semibold">{s.title}</h2>}
            <ProductGrid base={base} products={list} columns={s.columns} empty="보여 줄 상품이 없습니다." />
          </div>
        );
      } else if (b.type === "notice") {
        const s = b.settings as NoticeSettings;
        const list = await getNotices(store.id, s.count);
        slots[b.id] = (
          <div className="px-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <Link href={`${base}/notices`} className="text-sm text-gray-500">더보기 ›</Link>
            </div>
            {list.length ? (
              <ul className="divide-y border-y text-sm">
                {list.map((n) => (
                  <li key={n.id} className="flex items-center gap-2 py-2">
                    {n.is_pinned && <span className="rounded bg-gray-900 px-1.5 text-xs text-white">공지</span>}
                    <Link href={`${base}/notices/${n.id}`} className="flex-1 truncate">{n.title}</Link>
                    <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-sm text-gray-500">아직 공지가 없습니다.</p>
            )}
          </div>
        );
      }
    }),
  );

  return (
    <>
      {store.status === "suspended" && (
        <p className="mx-auto mt-4 max-w-5xl rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          이 몰은 정지된 상태입니다. 운영자인 회원님에게만 보입니다.
        </p>
      )}
      {home.blocks.length > 0 && (
        <div className="mx-auto max-w-5xl pt-4">
          <HomeBlocks blocks={home.blocks} slots={slots} />
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="mb-4 text-lg font-semibold">신상품</h2>
        <ProductGrid base={base} products={products} empty="쇼핑몰을 준비하고 있습니다." />
      </main>
    </>
  );
}
