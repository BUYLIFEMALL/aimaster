"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getRecentProducts,
  removeRecentProduct,
  clearRecentProducts,
  type RecentProduct,
} from "@/lib/recent-products";

// 외부 패키지(lucide-react) 의존성 없는 자체 인라인 SVG 아이콘 (빌드 안전성 100% 보장)
function IconChevronLeft({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function IconChevronRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function IconChevronUp({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function IconChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconShoppingBag({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconEye({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconClock({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconTrash2({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function IconX({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

interface QuickBarProps {
  slug: string;
  base: string;
  cartCount: number;
}

export default function QuickBar({ slug, base, cartCount }: QuickBarProps) {
  const [items, setItems] = useState<RecentProduct[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 3;

  const loadRecent = () => {
    const list = getRecentProducts(slug);
    setItems(list);
  };

  useEffect(() => {
    loadRecent();

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ slug?: string }>;
      if (!custom.detail?.slug || custom.detail.slug === slug) {
        loadRecent();
      }
    };

    window.addEventListener("mb_recent_updated", handleUpdate);
    window.addEventListener("storage", loadRecent);

    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 250);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("mb_recent_updated", handleUpdate);
      window.removeEventListener("storage", loadRecent);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [slug]);

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const currentItems = items.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  return (
    <aside
      aria-label="쇼핑 편의 퀵바"
      className="fixed right-2.5 top-1/2 -translate-y-1/2 z-40 select-none transition-all duration-300 ease-in-out"
    >
      <div className="relative flex items-center">
        {/* 접기/펼치기 토글 단추 */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "퀵바 펼치기" : "퀵바 접기"}
          className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 flex h-10 w-5 items-center justify-center rounded-l-lg border-y border-l border-slate-300 bg-white/95 text-slate-500 shadow-md backdrop-blur-md hover:bg-slate-50 hover:text-blue-600 transition [data-mall-mode='dark']_:bg-slate-800 [data-mall-mode='dark']_:border-slate-700 [data-mall-mode='dark']_:text-slate-300"
        >
          {isCollapsed ? <IconChevronLeft size={14} /> : <IconChevronRight size={14} />}
        </button>

        {isCollapsed ? (
          /* 접힘 상태: 콤팩트 미니 바 */
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-xl backdrop-blur-md [data-mall-mode='dark']_:bg-slate-900/95 [data-mall-mode='dark']_:border-slate-700">
            {/* 장바구니 미니 버튼 */}
            <Link
              href={`${base}/cart`}
              title="장바구니"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition [data-mall-mode='dark']_:bg-slate-800 [data-mall-mode='dark']_:text-slate-200"
            >
              <IconShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* 최근 본 상품 미니 뱃지 */}
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              title="최근 본 상품 열기"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition [data-mall-mode='dark']_:bg-slate-800 [data-mall-mode='dark']_:text-slate-200"
            >
              <IconEye size={18} />
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">
                  {items.length}
                </span>
              )}
            </button>

            {/* TOP 버튼 */}
            <button
              type="button"
              onClick={scrollToTop}
              title="맨 위로"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition [data-mall-mode='dark']_:bg-slate-800 [data-mall-mode='dark']_:border-slate-700 [data-mall-mode='dark']_:text-slate-300 ${
                showTopBtn ? "opacity-100" : "opacity-40"
              }`}
            >
              <IconChevronUp size={18} />
            </button>
          </div>
        ) : (
          /* 펼침 상태: 정규 퀵바 패널 */
          <div className="w-[100px] flex flex-col items-center rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-md [data-mall-mode='dark']_:bg-slate-900/95 [data-mall-mode='dark']_:border-slate-700">
            {/* 1. 장바구니 퀵 링크 */}
            <Link
              href={`${base}/cart`}
              className="group relative flex w-full flex-col items-center rounded-xl bg-slate-50 p-2 text-center border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/50 transition [data-mall-mode='dark']_:bg-slate-800/80 [data-mall-mode='dark']_:border-slate-700"
            >
              <div className="relative">
                <IconShoppingBag size={18} className="text-slate-700 group-hover:text-blue-600 transition [data-mall-mode='dark']_:text-slate-200" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-3 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[10px] font-bold text-slate-700 group-hover:text-blue-600 [data-mall-mode='dark']_:text-slate-300">
                장바구니
              </span>
            </Link>

            {/* 구분선 */}
            <div className="my-2 h-px w-full bg-slate-200 [data-mall-mode='dark']_:bg-slate-700" />

            {/* 2. 최근 본 상품 영역 */}
            <div className="w-full flex flex-col items-center">
              <div className="mb-1 flex w-full items-center justify-between px-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-tight [data-mall-mode='dark']_:text-slate-400">
                  최근본상품
                </span>
                <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[9px] font-black text-blue-700 [data-mall-mode='dark']_:bg-blue-900/60 [data-mall-mode='dark']_:text-blue-300">
                  {items.length}
                </span>
              </div>

              {items.length === 0 ? (
                /* 최근 본 상품 없음 */
                <div className="flex h-20 w-full flex-col items-center justify-center rounded-xl bg-slate-50/80 p-2 text-center [data-mall-mode='dark']_:bg-slate-800/40">
                  <IconClock size={16} className="text-slate-300 [data-mall-mode='dark']_:text-slate-600" />
                  <span className="mt-1 text-[9px] text-slate-400 [data-mall-mode='dark']_:text-slate-500 leading-tight">
                    기록 없음
                  </span>
                </div>
              ) : (
                /* 최근 본 상품 리스트 (최대 3개씩 페이징) */
                <div className="w-full space-y-1.5">
                  {currentItems.map((prod) => (
                    <div
                      key={prod.id}
                      className="group relative flex w-full flex-col items-center rounded-xl border border-slate-200/80 bg-white p-1 hover:border-blue-400 hover:shadow-md transition [data-mall-mode='dark']_:bg-slate-800 [data-mall-mode='dark']_:border-slate-700"
                    >
                      {/* 삭제 버튼 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeRecentProduct(slug, prod.id);
                        }}
                        aria-label="최근 본 상품 삭제"
                        className="absolute -top-1.5 -right-1.5 z-10 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-white shadow-xs group-hover:flex hover:bg-red-500 transition"
                      >
                        <IconX size={10} />
                      </button>

                      {/* 상품 링크 및 썸네일 */}
                      <Link
                        href={`${base}/p/${prod.id}`}
                        title={prod.name}
                        className="flex w-full flex-col items-center"
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100 [data-mall-mode='dark']_:bg-slate-700">
                          {prod.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={prod.image}
                              alt={prod.name}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                              No Img
                            </div>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-1 w-full text-center text-[10px] font-semibold text-slate-800 [data-mall-mode='dark']_:text-slate-200">
                          {prod.name}
                        </p>
                        <p className="text-[10px] font-black text-blue-600 [data-mall-mode='dark']_:text-blue-400">
                          {Number(prod.price || 0).toLocaleString()}원
                        </p>
                      </Link>
                    </div>
                  ))}

                  {/* 페이징 버튼 (아이템이 4개 이상일 때) */}
                  {totalPages > 1 && (
                    <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-slate-400">
                      <button
                        type="button"
                        disabled={currentPage === 0}
                        onClick={() => setPage(currentPage - 1)}
                        aria-label="이전 상품"
                        className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20 transition [data-mall-mode='dark']_:hover:bg-slate-800"
                      >
                        <IconChevronUp size={12} />
                      </button>
                      <span className="font-bold text-[9px]">
                        {currentPage + 1}/{totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages - 1}
                        onClick={() => setPage(currentPage + 1)}
                        aria-label="다음 상품"
                        className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20 transition [data-mall-mode='dark']_:hover:bg-slate-800"
                      >
                        <IconChevronDown size={12} />
                      </button>
                    </div>
                  )}

                  {/* 전체 비우기 버튼 */}
                  <button
                    type="button"
                    onClick={() => clearRecentProducts(slug)}
                    className="mt-1 flex w-full items-center justify-center gap-1 py-1 text-[9px] text-slate-400 hover:text-red-500 transition [data-mall-mode='dark']_:text-slate-500"
                  >
                    <IconTrash2 size={10} />
                    <span>전체비우기</span>
                  </button>
                </div>
              )}
            </div>

            {/* 구분선 */}
            <div className="my-2 h-px w-full bg-slate-200 [data-mall-mode='dark']_:bg-slate-700" />

            {/* 3. 스크롤 네비게이션 (TOP / DOWN) */}
            <div className="flex w-full gap-1">
              <button
                type="button"
                onClick={scrollToTop}
                title="맨 위로"
                className="flex flex-1 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition [data-mall-mode='dark']_:bg-slate-800 [data-mall-mode='dark']_:border-slate-700 [data-mall-mode='dark']_:text-slate-300"
              >
                <IconChevronUp size={14} />
                <span className="text-[9px] font-black tracking-tight">TOP</span>
              </button>
              <button
                type="button"
                onClick={scrollToBottom}
                title="맨 아래로"
                className="flex flex-1 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition [data-mall-mode='dark']_:bg-slate-800 [data-mall-mode='dark']_:border-slate-700 [data-mall-mode='dark']_:text-slate-300"
              >
                <IconChevronDown size={14} />
                <span className="text-[9px] font-black tracking-tight">DOWN</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
