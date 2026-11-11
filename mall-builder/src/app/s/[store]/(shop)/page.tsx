import Link from "next/link";
import type { ReactNode } from "react";
import { getCategoryRows, getNotices, getPublishedHome, getShopProducts, getShowcaseProducts, getStoreBySlug, getStoreRecentReviews } from "@/lib/store";
import { isLive, type CategoryIconsSettings, type NoticeSettings, type ReviewsSettings, type ShowcaseSettings, type TabsSettings, type TimesaleSettings } from "@/lib/blocks";
import { Countdown, HomeBlocks, TabsView } from "../home-blocks";
import { ProductGrid } from "./product-card";

export const dynamic = "force-dynamic";

// 손님 첫 화면 — 위쪽은 운영자가 게시한 블록(F18·F19, 초안은 안 보임), 아래는 신상품 목록
// 쇼윈도·공지 블록은 여기(서버)에서 상품·공지를 읽어 slots로 넘긴다(가격은 보는 사람 기준)
export default async function StorefrontPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const store = await getStoreBySlug(slug);
  const base = `/s/${store.slug}`;
  const [published, products] = await Promise.all([getPublishedHome(store.id), getShopProducts(store.id, { limit: 24 })]);
  // 예약 노출·타임세일 끝(D28) — 서버 시각으로 지금 보일 블록만
  const now = Date.now();
  const home = { ...published, blocks: published.blocks.filter((b) => isLive(b, now)) };
  const needCats = home.blocks.some((b) => b.type === "category_icons");
  const catName = new Map((needCats ? await getCategoryRows(store.id) : []).filter((c) => c.is_visible).map((c) => [c.id, c.name]));

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
      } else if (b.type === "tabs") {
        const s = b.settings as TabsSettings;
        const lists = await Promise.all(s.tabs.map((t) => getShowcaseProducts(store.id, { ...t, title: "", columns: s.columns, limit: s.limit })));
        slots[b.id] = (
          <TabsView
            title={s.title}
            labels={s.tabs.map((t) => t.label)}
            panels={lists.map((list, i) => <ProductGrid key={i} base={base} products={list} columns={s.columns} empty="보여 줄 상품이 없습니다." />)}
          />
        );
      } else if (b.type === "timesale") {
        const s = b.settings as TimesaleSettings;
        const list = await getShowcaseProducts(store.id, { ...s, title: "" });
        slots[b.id] = (
          <div className="mx-4 rounded-lg border-2 border-red-500 p-4" data-timesale>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-red-600">⏰ {s.title}</h2>
                {s.subtitle && <p className="text-sm text-gray-600">{s.subtitle}</p>}
              </div>
              <p className="text-sm">남은 시간 <b className="text-xl text-red-600"><Countdown endsAt={s.ends_at} /></b></p>
            </div>
            <ProductGrid base={base} products={list} columns={s.columns} empty="보여 줄 상품이 없습니다." />
          </div>
        );
      } else if (b.type === "reviews") {
        const s = b.settings as ReviewsSettings;
        const list = await getStoreRecentReviews(store.id, s.count, s.min_rating);
        slots[b.id] = list.length ? (
          <div className="px-4" data-reviews-block>
            <h2 className="mb-3 text-lg font-semibold">{s.title}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((rv) => (
                <li key={rv.id} className="rounded border p-3 text-sm">
                  <p className="text-amber-500" aria-label={`별점 ${rv.rating}점`}>{"★".repeat(rv.rating)}<span className="text-gray-300">{"★".repeat(5 - rv.rating)}</span></p>
                  <p className="mt-1 line-clamp-3">{rv.body}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {rv.author} · <Link href={`${base}/p/${rv.product_id}`} className="underline">{rv.product_name}</Link>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null;
      } else if (b.type === "category_icons") {
        const s = b.settings as CategoryIconsSettings;
        const items = s.items.filter((it) => catName.has(it.category_id)); // 숨긴·지운 카테고리는 뺌
        slots[b.id] = items.length ? (
          <div className="px-4" data-category-icons>
            {s.title && <h2 className="mb-3 text-lg font-semibold">{s.title}</h2>}
            <ul className="flex gap-4 overflow-x-auto pb-1">
              {items.map((it) => (
                <li key={it.category_id} className="shrink-0">
                  <Link href={`${base}/c/${it.category_id}`} className="flex w-16 flex-col items-center gap-1 text-center text-xs sm:w-20">
                    <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-2xl sm:h-20 sm:w-20">
                      {it.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        it.emoji || "🛍"
                      )}
                    </span>
                    <span className="line-clamp-2">{catName.get(it.category_id)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null;
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
