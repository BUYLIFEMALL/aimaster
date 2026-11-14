import Link from "next/link";
import type { ReactNode } from "react";
import type { Notice, RecentReview, ShopProduct } from "@/lib/store";
import type { Block, CategoryIconsSettings, HeroButton, HeroSettings, NoticeSettings, ReviewsSettings, ShowcaseSettings, TabsSettings, TimesaleSettings } from "@/lib/blocks";
import { Countdown, TabsView } from "./home-blocks";
import { ProductCard, ProductGrid } from "./(shop)/product-card";

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 — 서버 데이터가 필요한 첫 화면 블록 그리기
// 데이터만 받아 그린다(가져오기는 src/lib/builder/slot-data.ts). 손님 첫 화면(서버)과 디자인 편집기 미리보기(클라이언트)가 같이 쓴다(디자인 빌더 D2-5)

/** 블록 하나가 쓰는 서버 데이터(편집기로 보낼 수 있게 JSON 모양) */
export type SlotData = {
  products?: ShopProduct[];
  lists?: ShopProduct[][];
  reviews?: RecentReview[];
  notices?: Notice[];
  categories?: { id: string; name: string }[];
};

export const SLOT_BLOCK_TYPES = ["showcase", "notice", "tabs", "timesale", "reviews", "category_icons", "hero"] as const;

/** 글 히어로 단추 — 이 몰 안 주소는 Link, https는 새 창, 링크가 비면 누를 수 없는 모양만 */
function HeroLink({ bt, primary }: { bt: HeroButton; primary: boolean }) {
  const cls = primary
    ? "btn-3d-blue inline-flex items-center justify-center px-6 py-3 text-sm font-bold"
    : "inline-flex items-center justify-center rounded-[var(--mall-radius,0.75rem)] border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-800 shadow-xs transition hover:bg-slate-50";
  if (!bt.link) return <span className={cls}>{bt.label}</span>;
  if (bt.link.startsWith("https://")) return <a href={bt.link} target="_blank" rel="noopener noreferrer" className={cls}>{bt.label}</a>;
  return <Link href={bt.link} className={cls}>{bt.label}</Link>;
}

/** D5-8 글 히어로 — 그림 없이 큰 제목(둘째 줄 포인트색)·설명·단추 2개, 오른쪽 대표 상품 1개(가격 규칙은 상품 카드 그대로) */
function Hero({ b, base, d }: { b: Block; base: string; d: SlotData }) {
  const s = b.settings as HeroSettings;
  const product = s.feature ? d.products?.[0] : undefined;
  const center = !product && b.style?.title_align === "center";
  const buttons = [s.button, s.button2].filter((bt) => bt.label);
  return (
    <div className="px-4 sm:px-6" data-hero>
      <div className={`grid items-center gap-8 ${product ? "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : ""}`}>
        <div className={center ? "mx-auto max-w-3xl text-center" : ""}>
          {s.eyebrow && (
            <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold tracking-wide text-blue-700">{s.eyebrow}</span>
          )}
          <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
            {s.title}
            {s.accent && <span className="block text-blue-600">{s.accent}</span>}
          </h2>
          {s.text && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base">{s.text}</p>}
          {buttons.length > 0 && (
            <div className={`mt-7 flex flex-wrap gap-3 ${center ? "justify-center" : ""}`}>
              {buttons.map((bt, i) => <HeroLink key={i} bt={bt} primary={bt === s.button} />)}
            </div>
          )}
        </div>
        {product && (
          <div className="mx-auto w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-4 shadow-lg" data-hero-product>
            <ProductCard base={base} product={product} card={{ style: "plain" }} />
          </div>
        )}
      </div>
    </div>
  );
}

export function renderSlot(b: Block, base: string, d: SlotData): ReactNode {
  if (b.type === "hero") return <Hero b={b} base={base} d={d} />;
  if (b.type === "showcase") {
    const s = b.settings as ShowcaseSettings;
    return (
      <div className="px-4 sm:px-6">
        {s.title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-slate-900">{s.title}</h2>
          </div>
        )}
        <ProductGrid base={base} products={d.products ?? []} columns={s.columns} card={s.card} layout={s.layout} empty="보여 줄 상품이 없습니다." />
      </div>
    );
  }
  if (b.type === "tabs") {
    const s = b.settings as TabsSettings;
    const lists = d.lists ?? [];
    return (
      <TabsView
        title={s.title}
        labels={s.tabs.map((t) => t.label)}
        panels={s.tabs.map((_, i) => <ProductGrid key={i} base={base} products={lists[i] ?? []} columns={s.columns} card={s.card} empty="보여 줄 상품이 없습니다." />)}
      />
    );
  }
  if (b.type === "timesale") {
    const s = b.settings as TimesaleSettings;
    return (
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
        <ProductGrid base={base} products={d.products ?? []} columns={s.columns} card={s.card} empty="보여 줄 상품이 없습니다." />
      </div>
    );
  }
  if (b.type === "reviews") {
    const s = b.settings as ReviewsSettings;
    const list = d.reviews ?? [];
    return list.length ? (
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
  }
  if (b.type === "category_icons") {
    const s = b.settings as CategoryIconsSettings;
    const catName = new Map((d.categories ?? []).map((c) => [c.id, c.name]));
    const items = s.items.filter((it) => catName.has(it.category_id));
    return items.length ? (
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
  }
  if (b.type === "notice") {
    const s = b.settings as NoticeSettings;
    const list = d.notices ?? [];
    return (
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
  return null;
}
