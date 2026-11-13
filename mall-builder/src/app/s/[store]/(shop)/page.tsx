import Link from "next/link";
import type { ReactNode } from "react";
import { getCategoryRows, getNotices, getPublishedHome, getShopProducts, getShowcaseProducts, getStoreBySlug, getStoreRecentReviews } from "@/lib/store";
import { isLive, type CategoryIconsSettings, type NoticeSettings, type ReviewsSettings, type ShowcaseSettings, type TabsSettings, type TimesaleSettings } from "@/lib/blocks";
import { Countdown, HomeBlocks, TabsView } from "../home-blocks";
import { ProductGrid } from "./product-card";

export const dynamic = "force-dynamic";

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 첫 화면
// 위쪽은 운영자가 게시한 블록(F18·F19, 초안은 안 보임), 아래는 신상품 목록
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
          <div className="px-4 sm:px-6">
            {s.title && (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight text-slate-900">{s.title}</h2>
              </div>
            )}
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
          <div className="mx-4 sm:mx-6 rounded-2xl border-2 border-rose-500 bg-rose-50/30 p-5 sm:p-6 shadow-sm" data-timesale>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-rose-200 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold text-white mb-1.5">
                  LIMITED TIME SALE
                </span>
                <h2 className="text-xl font-black tracking-tight text-rose-700">⏰ {s.title}</h2>
                {s.subtitle && <p className="mt-1 text-sm text-slate-600">{s.subtitle}</p>}
              </div>
              <div className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-right shadow-xs">
                <p className="text-xs text-slate-500">마감까지 남은 시간</p>
                <p className="text-lg font-black text-rose-600">
                  <Countdown endsAt={s.ends_at} />
                </p>
              </div>
            </div>
            <ProductGrid base={base} products={list} columns={s.columns} empty="보여 줄 상품이 없습니다." />
          </div>
        );
      } else if (b.type === "reviews") {
        const s = b.settings as ReviewsSettings;
        const list = await getStoreRecentReviews(store.id, s.count, s.min_rating);
        slots[b.id] = list.length ? (
          <div className="px-4 sm:px-6" data-reviews-block>
            <h2 className="mb-4 text-xl font-black tracking-tight text-slate-900">{s.title}</h2>
            <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((rv) => (
                <li key={rv.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-shadow hover:shadow-md">
                  <p className="text-amber-400 text-sm tracking-wider" aria-label={`별점 ${rv.rating}점`}>
                    {"★".repeat(rv.rating)}
                    <span className="text-slate-200">{"★".repeat(5 - rv.rating)}</span>
                  </p>
                  <p className="mt-2 text-sm text-slate-700 line-clamp-3 leading-relaxed">{rv.body}</p>
                  <p className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{rv.author}</span> ·{" "}
                    <Link href={`${base}/p/${rv.product_id}`} className="text-blue-600 hover:underline">
                      {rv.product_name}
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null;
      } else if (b.type === "category_icons") {
        const s = b.settings as CategoryIconsSettings;
        const items = s.items.filter((it) => catName.has(it.category_id));
        slots[b.id] = items.length ? (
          <div className="px-4 sm:px-6" data-category-icons>
            {s.title && <h2 className="mb-4 text-xl font-black tracking-tight text-slate-900">{s.title}</h2>}
            <ul className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {items.map((it) => (
                <li key={it.category_id} className="shrink-0">
                  <Link href={`${base}/c/${it.category_id}`} className="group flex w-18 sm:w-22 flex-col items-center gap-2 text-center text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors">
                    <span className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-2xl sm:text-3xl shadow-xs transition-all duration-200 group-hover:-translate-y-1 group-hover:border-blue-400 group-hover:shadow-md">
                      {it.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        it.emoji || "🛍"
                      )}
                    </span>
                    <span className="line-clamp-2 px-1 leading-tight">{catName.get(it.category_id)}</span>
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
          <div className="px-4 sm:px-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-black tracking-tight text-slate-900">{s.title}</h2>
              <Link href={`${base}/notices`} className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors">
                전체보기 ›
              </Link>
            </div>
            {list.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                <ul className="divide-y divide-slate-100 text-sm">
                  {list.map((n) => (
                    <li key={n.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      {n.is_pinned && (
                        <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
                          공지
                        </span>
                      )}
                      <Link href={`${base}/notices/${n.id}`} className="flex-1 truncate font-medium text-slate-800 hover:text-blue-600 transition-colors">
                        {n.title}
                      </Link>
                      <span className="text-xs text-slate-400">
                        {new Date(n.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white py-6 text-center text-sm text-slate-500 font-medium">
                아직 등록된 공지가 없습니다.
              </p>
            )}
          </div>
        );
      }
    }),
  );

  return (
    <>
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
