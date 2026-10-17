"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

const OVERVIEW_ITEM = { href: "/dashboard", icon: "🏠", label: "대시보드" };

const FLOW_STEPS = [
  {
    step: 1,
    href: "/candidates",
    icon: "📰",
    label: "게시글 주제 수집",
    description: "HTTP/RSS/Perplexity 소재 발굴",
  },
  {
    step: 2,
    href: "/posts",
    icon: "📸",
    label: "게시글 관리",
    description: "AI 캡션·이미지 생성 및 게시",
  },
];

const UTILITY_ITEMS = [
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 라우트 이동 시 모바일 메뉴 자동 닫힘
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const renderNavLinks = () => (
    <>
      <div className="mb-5 px-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-sm shadow-sm">
            📸
          </span>
          <span className="text-base font-bold text-slate-100">
            INSTA 포스팅 자동화
          </span>
          <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-2 py-0.5 text-[11px] font-bold text-pink-400">
            {APP_VERSION}
          </span>
        </div>
        <a
          href="https://www.buylife.xyz/programs"
          className="mt-2 block text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← 다른 프로그램 보기
        </a>
      </div>

      <Link
        href={OVERVIEW_ITEM.href}
        className={`mb-4 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all ${
          pathname === OVERVIEW_ITEM.href
            ? "border border-pink-500/40 bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-purple-600/15 text-pink-300 shadow-sm"
            : "text-slate-300 hover:bg-[#1f2433] hover:text-slate-100"
        }`}
      >
        <span>{OVERVIEW_ITEM.icon}</span>
        <span>{OVERVIEW_ITEM.label}</span>
      </Link>

      <div className="mb-2 px-2 text-[11px] font-semibold text-slate-400">
        포스팅 파이프라인
      </div>
      <nav className="relative flex flex-col space-y-1">
        {FLOW_STEPS.map((item, idx) => {
          const isActive = pathname?.startsWith(item.href);
          const isLast = idx === FLOW_STEPS.length - 1;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex gap-3 rounded-xl p-2 transition-all hover:bg-[#1f2433]"
            >
              {/* 스텝 번호 + 연결선 */}
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isActive
                      ? "bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-sm"
                      : "bg-[#0d0f17] text-slate-400 border border-[#262c3d] group-hover:border-slate-500 group-hover:text-slate-200"
                  }`}
                >
                  {item.step}
                </span>
                {!isLast && <span className="mt-1 w-px flex-1 bg-[#262c3d]" />}
              </div>

              {/* 라벨 + 설명 */}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-bold transition-colors ${
                    isActive ? "text-pink-300" : "text-slate-300 group-hover:text-slate-100"
                  }`}
                >
                  {item.icon} {item.label}
                </p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 border-t border-[#262c3d] pt-3.5">
        <div className="mb-1.5 px-2 text-[11px] font-semibold text-slate-400">
          도움말 & 설정
        </div>
        {UTILITY_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? "border border-pink-500/30 bg-pink-500/10 text-pink-300 font-bold"
                  : "text-slate-400 hover:bg-[#1f2433] hover:text-slate-200"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {/* 1. 모바일(375px) 상단 고정 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-[#262c3d] bg-[#161922]/95 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-sm shadow-sm">
            📸
          </span>
          <span className="text-sm font-bold text-slate-100">
            INSTA 포스팅 자동화
          </span>
          <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-2 py-0.5 text-[10px] font-bold text-pink-400">
            {APP_VERSION}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="메뉴 열기"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#262c3d] bg-[#0d0f17] text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? (
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

      {/* 2. 모바일 슬라이드 오버레이 드로어 */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* 딤드 배경 */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* 슬라이드 메뉴 패널 */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#161922] p-5 border-r border-[#262c3d] flex flex-col justify-between shadow-2xl">
            <div className="overflow-y-auto">
              {renderNavLinks()}
            </div>

            <div className="mt-4 shrink-0 border-t border-[#262c3d] pt-3">
              <p className="mb-2 truncate px-2 text-xs text-slate-400">{userEmail}</p>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-[#262c3d] bg-[#0d0f17] px-3 py-2 text-center text-xs font-semibold text-slate-300 hover:bg-[#1f2433] hover:text-white transition-colors"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 3. 데스크톱(1440px) 좌측 고정 사이드바 */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:shrink-0 md:sticky md:top-0 md:h-screen md:justify-between bg-[#161922] border-r border-[#262c3d] p-5">
        <div className="min-h-0 overflow-y-auto pr-1">
          {renderNavLinks()}
        </div>

        <div className="mt-4 shrink-0 border-t border-[#262c3d] pt-3.5">
          <p className="mb-2 truncate px-2 text-xs text-slate-400">{userEmail}</p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-xl border border-[#262c3d] bg-[#0d0f17] px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-[#1f2433] hover:text-white transition-colors"
            >
              로그아웃
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
