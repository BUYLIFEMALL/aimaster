"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";
import { IS_STANDALONE, MAIN_SITE_URL } from "@/lib/deployment";

const OVERVIEW_ITEM = { href: "/dashboard", icon: "🏠", label: "대시보드" };

const FLOW_STEPS = [
  {
    step: 1,
    href: "/trends",
    icon: "🔥",
    label: "트렌드 & 떡상 탐지기",
    description: "떡상글 검색·수집 & AI 벤치마킹",
  },
  {
    step: 2,
    href: "/products",
    icon: "🛒",
    label: "제휴 상품 관리",
    description: "쿠팡·알리·네이버·토스 상품 등록",
  },
  {
    step: 3,
    href: "/posts",
    icon: "📝",
    label: "게시글 관리",
    description: "제휴 캡션 작성 및 게시",
  },
];

const UTILITY_ITEMS = [
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* 📱 모바일 상단 고정 헤더 (화면 폭 < 768px) */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-neutral-800 bg-[#171717]/95 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-sm font-black text-white shadow-xs">
            @
          </span>
          <div className="min-w-0">
            <span className="truncate text-sm font-bold text-white block">
              Threads 쇼핑제휴 자동화
            </span>
          </div>
          <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
            {APP_VERSION}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:scale-95 transition-transform"
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {mobileOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* 📱 모바일 오버레이 메뉴 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* 백드롭 */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={closeMobile}
          />

          {/* 슬라이드 드로어 */}
          <div className="relative flex w-full max-w-xs flex-1 flex-col border-r border-neutral-800 bg-[#171717] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-sm font-black text-white">
                  @
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Threads 쇼핑제휴</p>
                  <p className="text-[10px] text-amber-400 font-medium">{APP_VERSION}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeMobile}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              <Link
                href={OVERVIEW_ITEM.href}
                onClick={closeMobile}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname?.startsWith(OVERVIEW_ITEM.href)
                    ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                    : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
                }`}
              >
                <span>{OVERVIEW_ITEM.icon}</span>
                <span>{OVERVIEW_ITEM.label}</span>
              </Link>

              <div className="pt-2 pb-1">
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  작업 플로우
                </p>
              </div>

              {FLOW_STEPS.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className={`flex items-start gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                      isActive
                        ? "bg-amber-500/20 text-white font-bold border border-amber-500/40"
                        : "text-neutral-300 hover:bg-neutral-800/70 hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isActive ? "bg-amber-500 text-white" : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {item.step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {item.icon} {item.label}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">{item.description}</p>
                    </div>
                  </Link>
                );
              })}

              <div className="pt-3 pb-1 border-t border-neutral-800/80 mt-2">
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  도움말 & 설정
                </p>
              </div>

              {UTILITY_ITEMS.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30"
                        : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-neutral-800 pt-3">
              <p className="mb-2 truncate text-xs text-neutral-400">{userEmail}</p>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-neutral-800/80 px-3 py-2 text-center text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white"
                >
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 6 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 💻 데스크톱 사이드바 (화면 폭 >= 768px) */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r border-neutral-800 bg-[#171717] p-4 text-neutral-200">
        <div className="flex flex-1 flex-col overflow-y-auto min-h-0">
          {/* 브랜드 헤더 */}
          <div className="mb-5 px-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-sm font-black text-white shadow-xs">
                @
              </span>
              <div className="min-w-0">
                <span className="text-base font-bold text-white tracking-tight block">
                  Threads 쇼핑제휴
                </span>
              </div>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium">Meta Threads Affiliate Studio</p>
            {!IS_STANDALONE && (
              <a
                href="https://www.buylife.xyz/programs"
                className="mt-2 inline-block text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                ← 다른 프로그램 보기
              </a>
            )}
          </div>

          {/* 메인 네비게이션 */}
          <nav className="flex flex-col space-y-1">
            <Link
              href={OVERVIEW_ITEM.href}
              className={`mb-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname?.startsWith(OVERVIEW_ITEM.href)
                  ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shadow-xs"
                  : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
              }`}
            >
              <span>{OVERVIEW_ITEM.icon}</span>
              <span>{OVERVIEW_ITEM.label}</span>
            </Link>

            <div className="pt-2 pb-1">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                작업 파이프라인
              </p>
            </div>

            <div className="relative flex flex-col space-y-1">
              {FLOW_STEPS.map((item, idx) => {
                const isActive = pathname?.startsWith(item.href);
                const isLast = idx === FLOW_STEPS.length - 1;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex gap-2.5 rounded-lg p-2 transition-colors ${
                      isActive
                        ? "bg-neutral-800/90 text-white border border-amber-500/40 shadow-xs"
                        : "hover:bg-neutral-800/50 text-neutral-300"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          isActive
                            ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-xs"
                            : "bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-neutral-200"
                        }`}
                      >
                        {item.step}
                      </span>
                      {!isLast && <span className="mt-1 w-px flex-1 bg-neutral-800 group-hover:bg-neutral-700" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold ${isActive ? "text-amber-300" : "text-neutral-200"}`}>
                        {item.icon} {item.label}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate leading-tight mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* 유틸리티 메뉴 */}
          <div className="mt-6 border-t border-neutral-800/80 pt-3">
            <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              도움말 &amp; 설정
            </p>
            <div className="space-y-1">
              {UTILITY_ITEMS.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30"
                        : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* 하단 계정 정보 및 로그아웃 */}
        <div className="mt-4 shrink-0 border-t border-neutral-800 pt-3">
          <div className="mb-2 px-2 flex items-center justify-between">
            <span className="truncate text-xs text-neutral-400" title={userEmail}>
              {userEmail}
            </span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-center text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 6 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              로그아웃
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
