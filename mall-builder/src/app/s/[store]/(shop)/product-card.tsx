import Link from "next/link";
import type { CSSProperties } from "react";
import type { ShopProduct } from "@/lib/store";
import { discountRate } from "@/lib/products";
import type { CardOptions } from "@/lib/blocks";

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 상품 카드
// 가격은 보는 사람 기준(등급가·가격 비공개)으로 계산된 display를 쓴다
// card: 블록마다 고르는 표시 항목·모양(D2-4c). 비우면 지금 모양 그대로
export function ProductCard({ base, product, card }: { base: string; product: ShopProduct; card?: CardOptions }) {
  const { unitPrice, priceHidden, note, special } = product.display;
  const graded = !priceHidden && unitPrice !== product.base_price;
  const rate = priceHidden || graded ? 0 : discountRate(product.base_price, product.list_price);
  const showRate = rate > 0 && !card?.hide_discount;
  const showList = !card?.hide_list_price;
  const plain = card?.style === "plain";
  const soldOut = product.status === "sold_out";
  const img = product.images?.[0]?.url;

  return (
    <Link
      href={`${base}/p/${product.id}`}
      className={
        plain
          ? "group relative flex h-full flex-col justify-between overflow-hidden transition-all duration-200"
          : "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-md"
      }
      data-card-style={plain ? "plain" : undefined}
    >
      <div>
        <div className="relative aspect-[var(--mall-img-ratio,1/1)] overflow-hidden rounded-xl bg-slate-100">
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          )}
          {showRate && (
            <span className="absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-black text-white shadow-xs">
              {rate}%
            </span>
          )}
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px]">
              <span className="rounded-lg bg-slate-950/80 px-3 py-1 text-xs font-bold tracking-wider text-white shadow-sm">
                품절
              </span>
            </div>
          )}
        </div>

        <p className="mt-2.5 line-clamp-2 text-sm font-semibold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">
          {product.name}
        </p>
      </div>

      <div className={plain ? "mt-1" : "mt-2 pt-1 border-t border-slate-100"}>
        {priceHidden ? (
          <p className="text-xs font-medium text-slate-500 py-0.5" data-card-price>
            {note}
          </p>
        ) : (
          <div className="flex flex-col" data-card-price>
            <div className="flex flex-wrap items-baseline gap-1.5">
              {graded && (
                <span className="rounded-md bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
                  {special ? "거래처 특가" : "회원가"}
                </span>
              )}
              <span className="text-base font-black text-slate-900">
                <b>{unitPrice.toLocaleString("ko-KR")}</b>원
              </span>
            </div>
            {showList && (graded || rate > 0) && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 line-through mt-0.5">
                {graded && <span>{product.base_price.toLocaleString("ko-KR")}원</span>}
                {rate > 0 && <span>{product.list_price!.toLocaleString("ko-KR")}원</span>}
              </div>
            )}
          </div>
        )}

        {product.visibility === "business_only" && !card?.hide_business && (
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50/80 px-1.5 py-0.5 rounded">
            <span>💼</span>
            <span>사업자 전용</span>
          </p>
        )}
      </div>
    </Link>
  );
}

// 큰 화면 열 수(쇼윈도 블록 설정) — Tailwind가 찾을 수 있게 클래스 이름을 그대로 적는다. 휴대폰은 2열
const COLS: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
};

export function ProductGrid({
  base,
  products,
  empty,
  columns = 4,
  card,
  layout,
}: {
  base: string;
  products: ShopProduct[];
  empty: string;
  columns?: number;
  card?: CardOptions;
  layout?: "row"; // 가로로 넘기기(D2-4b) — 비우면 바둑판
}) {
  if (!products.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
        <p className="text-3xl text-slate-300">📦</p>
        <p className="mt-2 text-sm text-slate-500 font-medium">{empty}</p>
      </div>
    );
  }

  if (layout === "row") {
    return (
      <ul className="flex snap-x gap-3 overflow-x-auto pb-2 scrollbar-none sm:gap-4" data-layout="row" style={{ ["--cols" as string]: columns } as CSSProperties}>
        {products.map((p) => (
          <li key={p.id} className="shrink-0 snap-start basis-[46%] sm:basis-[31%] md:basis-[calc((100%_-_(var(--cols)_-_1)*1rem)/var(--cols))]">
            <ProductCard base={base} product={p} card={card} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={`grid grid-cols-2 gap-3 sm:gap-4 ${columns > 2 ? "sm:grid-cols-3" : ""} ${COLS[columns] ?? COLS[4]}`}>
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard base={base} product={p} card={card} />
        </li>
      ))}
    </ul>
  );
}
