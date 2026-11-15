import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStoreBySlug } from "@/lib/store";
import { getResellerShopData } from "@/lib/reseller-shop";
import ResellerShareButton from "./share-button";

export const dynamic = "force-dynamic";

// 외부 패키지(lucide-react) 의존성 없는 자체 인라인 SVG 아이콘 (빌드 안전성 100% 보장)
function IconChevronRight({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconStore({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7a2 2 0 0 1-2 2 2 2 0 0 1-2-2" />
      <path d="M18 7a2 2 0 0 1-2 2 2 2 0 0 1-2-2" />
      <path d="M14 7a2 2 0 0 1-2 2 2 2 0 0 1-2-2" />
      <path d="M10 7a2 2 0 0 1-2 2 2 2 0 0 1-2-2" />
      <path d="M6 7a2 2 0 0 1-2 2 2 2 0 0 1-2-2" />
    </svg>
  );
}

function IconSparkles({ size = 11, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function IconArrowRight({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconShieldCheck({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconBoxes({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l6 3.43a2 2 0 0 0 1.94 0l6-3.43a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L11 9.49a2 2 0 0 0-2.06 0l-5.97 3.43z" />
      <path d="m12 22 4-2.28" />
      <path d="M12 13v9" />
      <path d="M12 13 8 10.72" />
      <path d="m12 13 4-2.28" />
    </svg>
  );
}

function IconStar({ size = 10, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ store: string; code: string }>;
}): Promise<Metadata> {
  const { store: slug, code } = await params;
  const store = await getStoreBySlug(slug);
  const data = await getResellerShopData(store.id, code);
  if (!data.reseller) {
    return { title: `파트너 링크샵 | ${store.name}` };
  }
  const name = data.reseller.companyName || data.reseller.resellerName;
  return {
    title: `${name}의 셀렉트샵 | ${store.name}`,
    description: `${name}이(가) 추천하는 ${store.name} 공식 엄선 상품 컬렉션입니다.`,
  };
}

// 1안 106. 네오 모던 B2B 커머스 & 리셀러 셀렉트샵 (M4-C4 진열 페이지)
export default async function ResellerShopPage({
  params,
}: {
  params: Promise<{ store: string; code: string }>;
}) {
  const { store: slug, code } = await params;
  const store = await getStoreBySlug(slug);
  const data = await getResellerShopData(store.id, code);

  if (!data.reseller) {
    notFound();
  }

  const { reseller, products, isFallback } = data;
  const base = `/s/${store.slug}`;
  const shopTitle = `${reseller.companyName || reseller.resellerName}의 추천관`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* 1. 상단 경로 안내 */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
        <Link href={base} className="hover:text-blue-600 transition">
          {store.name}
        </Link>
        <IconChevronRight size={12} className="text-slate-300" />
        <span className="font-bold text-slate-800 [data-mall-mode='dark']_:text-slate-200">
          파트너 링크샵
        </span>
        <IconChevronRight size={12} className="text-slate-300" />
        <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-700 [data-mall-mode='dark']_:bg-blue-900/60 [data-mall-mode='dark']_:text-blue-300">
          CODE: {reseller.code}
        </span>
      </nav>

      {/* 2. 리셀러 프로필 및 큐레이션 헤더 배너 (링크샵 카드) */}
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 p-6 sm:p-8 shadow-sm backdrop-blur-md [data-mall-mode='dark']_:bg-gradient-to-br [data-mall-mode='dark']_:from-slate-900 [data-mall-mode='dark']_:via-slate-900/90 [data-mall-mode='dark']_:to-blue-950/40 [data-mall-mode='dark']_:border-slate-800">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
              <IconStore size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-blue-700 [data-mall-mode='dark']_:bg-blue-900/40 [data-mall-mode='dark']_:border-blue-700 [data-mall-mode='dark']_:text-blue-300">
                  <IconSparkles size={11} />
                  <span>공식 파트너 셀렉트샵</span>
                </span>
                <span className="text-xs font-bold text-slate-500">
                  파트너 코드: <strong className="text-blue-600 [data-mall-mode='dark']_:text-blue-400">{reseller.code}</strong>
                </span>
              </div>
              <h1 className="mt-1.5 text-xl sm:text-2xl font-black text-slate-900 tracking-tight [data-mall-mode='dark']_:text-white">
                {shopTitle}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 [data-mall-mode='dark']_:text-slate-400">
                {reseller.companyName ? `${reseller.companyName}이(가)` : `${reseller.resellerName} MD가`} 직접 검증하고 큐레이션한 {store.name}의 추천 상품들을 만나보세요.
              </p>
            </div>
          </div>

          {/* 액션 버튼 그룹 */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0">
            <ResellerShareButton code={reseller.code} title={shopTitle} />
            <Link
              href={base}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <span>몰 전체 둘러보기</span>
              <IconArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* 하단 신뢰 지표 안내선 */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4 text-[11px] text-slate-500 [data-mall-mode='dark']_:border-slate-800">
          <div className="flex items-center gap-1.5 font-medium">
            <IconShieldCheck size={14} className="text-emerald-500" />
            <span>{store.name} 본사 100% 정품 보증 및 안전 결제·직배송</span>
          </div>
          <div>
            엄선 큐레이션 상품: <strong className="text-slate-900 [data-mall-mode='dark']_:text-white">{products.length}</strong>개
          </div>
        </div>
      </section>

      {/* 3. 진열 상품 섹션 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900 [data-mall-mode='dark']_:text-white">
              {isFallback ? "추천 대표 상품 컬렉션" : "파트너 엄선 상품"}
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 [data-mall-mode='dark']_:bg-slate-800 [data-mall-mode='dark']_:text-slate-400">
              {products.length}
            </span>
          </div>
          {isFallback && (
            <span className="text-[11px] text-slate-400">
              * 파트너가 추천 상품을 준비 중이어서 대표 상품이 표시됩니다.
            </span>
          )}
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center [data-mall-mode='dark']_:bg-slate-900 [data-mall-mode='dark']_:border-slate-800">
            <IconBoxes size={36} className="mx-auto text-slate-300 [data-mall-mode='dark']_:text-slate-600" />
            <p className="mt-3 text-sm font-bold text-slate-700 [data-mall-mode='dark']_:text-slate-300">
              진열된 상품이 없습니다.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              다른 카테고리 상품을 둘러보시려면 전체 몰로 이동해보세요.
            </p>
            <Link
              href={base}
              className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
            >
              몰 홈으로 이동
            </Link>
          </div>
        ) : (
          /* 상품 그리드 (반응형: 모바일 2열, 태블릿 3열, 데스크톱 4열) */
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((prod) => {
              // 클릭 시 리셀러 레퍼럴 파라미터(?ref=<code>) 자동 연동
              const productHref = `${base}/p/${prod.id}?ref=${encodeURIComponent(reseller.code)}`;
              const hasDiscount = prod.listPrice && prod.listPrice > prod.basePrice;
              const discountPercent = hasDiscount
                ? Math.round(((prod.listPrice! - prod.basePrice) / prod.listPrice!) * 100)
                : 0;

              return (
                <div
                  key={prod.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:border-blue-400 hover:shadow-md transition [data-mall-mode='dark']_:bg-slate-900 [data-mall-mode='dark']_:border-slate-800"
                >
                  {/* 상품 이미지 카드 */}
                  <Link href={productHref} className="relative aspect-square w-full overflow-hidden bg-slate-100 [data-mall-mode='dark']_:bg-slate-800">
                    {prod.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        이미지 준비 중
                      </div>
                    )}

                    {/* 뱃지 영역 */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {prod.isPicked && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-xs">
                          <IconStar size={10} className="fill-white" />
                          <span>MD 픽</span>
                        </span>
                      )}
                      {hasDiscount && discountPercent > 0 && (
                        <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white shadow-xs">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* 상품 정보 영역 */}
                  <div className="flex flex-1 flex-col p-3 sm:p-4 justify-between">
                    <div>
                      <Link href={productHref} className="hover:text-blue-600 transition">
                        <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-slate-900 [data-mall-mode='dark']_:text-slate-100">
                          {prod.name}
                        </h3>
                      </Link>
                      {prod.summary && (
                        <p className="mt-1 line-clamp-1 text-[11px] text-slate-500 [data-mall-mode='dark']_:text-slate-400">
                          {prod.summary}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 [data-mall-mode='dark']_:border-slate-800">
                      {hasDiscount && (
                        <p className="text-[11px] text-slate-400 line-through">
                          {prod.listPrice!.toLocaleString()}원
                        </p>
                      )}
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm sm:text-base font-black text-slate-900 [data-mall-mode='dark']_:text-white">
                          {prod.basePrice.toLocaleString()}
                          <span className="text-xs font-normal ml-0.5">원</span>
                        </p>
                        <Link
                          href={productHref}
                          className="text-[11px] font-bold text-blue-600 hover:underline [data-mall-mode='dark']_:text-blue-400"
                        >
                          상세보기 ›
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. 하단 안내 카드 */}
      <section className="mt-12 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5 text-center text-xs text-slate-500 [data-mall-mode='dark']_:bg-slate-900/60 [data-mall-mode='dark']_:border-slate-800">
        <p>
          본 셀렉트샵의 모든 상품 주문 및 결제, 배송, CS는 <strong>{store.name}</strong>에서 직접 책임지고 처리합니다.
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          안심하고 쇼핑하세요 · 공식 고객센터 및 100% 전자세금계산서 발행 지원
        </p>
      </section>
    </main>
  );
}
