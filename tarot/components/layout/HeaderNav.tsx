"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  History,
  Settings,
  Menu,
  X,
  Home,
  Grid
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

export function HeaderNav({
  userEmail,
  signOutAction
}: {
  userEmail?: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = pathname === "/";
  const isDraw = pathname === "/draw";
  const isHistory = pathname === "/history";
  const isSettings = pathname === "/settings";
  const isGuide = pathname === "/guide";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2a1f4e] bg-[#090614]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* 좌측 로고 및 버전 칩 */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-base sm:text-lg font-black text-white hover:opacity-90">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-700 text-white shadow-lg shadow-purple-500/25 border border-purple-400/30">
              🔮
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-white leading-tight">AIMaster 타로점</span>
              <span className="text-[10px] font-semibold text-purple-300">Mystic Midnight Edition</span>
            </div>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-300">
            <Sparkles className="h-2.5 w-2.5" />
            {APP_VERSION} LAB
          </span>
        </div>

        {/* 중앙 데스크톱 네비게이션 */}
        <nav className="hidden md:flex items-center gap-1.5 text-xs font-bold">
          <Link
            href="/"
            className={`rounded-xl px-3 py-2 transition-all ${
              isHome
                ? "bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-sm"
                : "text-slate-300 hover:bg-[#1a1236] hover:text-white"
            }`}
          >
            대시보드
          </Link>
          <Link
            href="/draw"
            className={`rounded-xl px-3 py-2 transition-all ${
              isDraw
                ? "bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-sm"
                : "text-slate-300 hover:bg-[#1a1236] hover:text-white"
            }`}
          >
            ✨ 카드 뽑기
          </Link>
          <Link
            href="/guide"
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition-all ${
              isGuide
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-300"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>📖 사용 매뉴얼</span>
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black text-amber-300 border border-amber-500/30">
              GUIDE
            </span>
          </Link>
          {userEmail && (
            <Link
              href="/history"
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition-all ${
                isHistory
                  ? "bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-sm"
                  : "text-slate-300 hover:bg-[#1a1236] hover:text-white"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>내 보관함</span>
            </Link>
          )}
          <Link
            href="/settings"
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition-all ${
              isSettings
                ? "bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-sm"
                : "text-slate-300 hover:bg-[#1a1236] hover:text-white"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>API 키 설정</span>
          </Link>
        </nav>

        {/* 우측 회원 메뉴 및 모바일 토글 */}
        <div className="flex items-center gap-2">
          {userEmail ? (
            <div className="hidden lg:flex items-center gap-2 text-xs">
              <span className="truncate max-w-[130px] text-slate-400 text-[11px]">{userEmail}</span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-[#2a1f4e] bg-[#120d24] px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  로그아웃
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition-colors shadow-md shadow-purple-600/30"
            >
              로그인
            </Link>
          )}

          {/* 모바일 햄버거 버튼 */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2a1f4e] bg-[#120d24] text-slate-300 hover:text-white md:hidden"
            aria-label="메뉴 토글"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 모바일 슬라이드 드로어 */}
      {mobileOpen && (
        <div className="border-b border-[#2a1f4e] bg-[#0e0920] px-4 py-4 md:hidden space-y-3">
          <nav className="flex flex-col gap-1.5 text-xs font-bold">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 ${isHome ? "bg-purple-500/20 text-purple-200" : "text-slate-300"}`}
            >
              대시보드
            </Link>
            <Link
              href="/draw"
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 ${isDraw ? "bg-purple-500/20 text-purple-200" : "text-slate-300"}`}
            >
              ✨ 카드 뽑기
            </Link>
            <Link
              href="/guide"
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 flex items-center justify-between ${
                isGuide ? "bg-amber-500/20 text-amber-300" : "text-amber-300/90"
              }`}
            >
              <span>📖 연동 & 사용 매뉴얼</span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                가이드
              </span>
            </Link>
            {userEmail && (
              <Link
                href="/history"
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2 ${isHistory ? "bg-purple-500/20 text-purple-200" : "text-slate-300"}`}
              >
                📖 내 보관함
              </Link>
            )}
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 ${isSettings ? "bg-purple-500/20 text-purple-200" : "text-slate-300"}`}
            >
              🔑 API 키 설정
            </Link>
          </nav>

          <div className="border-t border-[#2a1f4e] pt-3 flex flex-col gap-2">
            <a
              href={MAIN_SITE_URL}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <Home className="h-3.5 w-3.5" />
              AIMaster 메인으로
            </a>
            <a
              href={`${MAIN_SITE_URL}/programs`}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <Grid className="h-3.5 w-3.5" />
              전체 프로그램 보기
            </a>
            {userEmail && (
              <div className="pt-2 border-t border-[#2a1f4e] flex items-center justify-between text-xs text-slate-400">
                <span className="truncate max-w-[180px]">{userEmail}</span>
                <form action={signOutAction}>
                  <button type="submit" className="text-red-400 text-xs font-semibold">
                    로그아웃
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
