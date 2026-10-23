"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";
import {
  Film,
  Sliders,
  Download,
  BookOpen,
  Home,
  Grid,
  Menu,
  X,
  LogOut,
  Sparkles,
  Zap
} from "lucide-react";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDashboard = pathname === "/dashboard" || pathname === "/";
  const isGuide = pathname === "/guide";

  return (
    <>
      {/* 모바일 상단 바 (767px 이하 노출) */}
      <header className="flex h-16 w-full items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-bold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Film className="h-4 w-4" />
          </span>
          <span className="truncate">상세페이지 GIF 자동화</span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
            {APP_VERSION}
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#30363d] bg-[#0d1117] text-gray-300 hover:text-white"
          aria-label="메뉴 열기"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* 모바일 드로어 백드롭 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 사이드바 본체 (데스크톱 고정 & 모바일 슬라이드 드로어) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#30363d] bg-[#161b22] transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:h-screen md:shrink-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* 상단 브랜드 헤더 */}
        <div className="border-b border-[#30363d] p-5">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white hover:opacity-90"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 shadow-lg shadow-amber-500/20">
                <Film className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-white">VideoToGIF</span>
                <span className="text-[11px] font-medium text-amber-400">상세페이지 GIF 자동화</span>
              </div>
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                <Sparkles className="h-2.5 w-2.5" />
                {APP_VERSION} LAB
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#30363d] text-gray-400 md:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            WASM 로컬 무손실 · 8MiB 상세페이지 압축
          </p>
        </div>

        {/* 네비게이션 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* 작업 파이프라인 메뉴 (1-2-3 단계) */}
          <div>
            <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              GIF 생성 파이프라인
            </div>
            <nav className="space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  isDashboard
                    ? "border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-transparent text-amber-300 shadow-sm"
                    : "text-gray-300 hover:bg-[#1f2937] hover:text-white"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                    isDashboard
                      ? "bg-amber-400 text-slate-950 font-black shadow-sm"
                      : "bg-[#0d1117] text-gray-400 border border-[#30363d]"
                  }`}
                >
                  1
                </span>
                <div className="flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>동영상 파일 등록</span>
                    <span className="text-[10px] text-amber-400/80">최대 20개</span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-normal text-gray-400">
                    MP4 · MOV · WEBM 일괄 큐 등록
                  </p>
                </div>
              </Link>

              <div className="flex items-start gap-3 rounded-xl px-3 py-2 text-xs text-gray-400">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0d1117] text-[11px] font-black text-gray-400 border border-[#30363d]">
                  2
                </span>
                <div className="flex-1">
                  <div className="font-bold text-gray-300">WASM 8MiB 최적화</div>
                  <p className="mt-0.5 text-[11px] text-gray-400">색상표 최적화 고화질 변환</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl px-3 py-2 text-xs text-gray-400">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0d1117] text-[11px] font-black text-gray-400 border border-[#30363d]">
                  3
                </span>
                <div className="flex-1">
                  <div className="font-bold text-gray-300">고화질 GIF 다운로드</div>
                  <p className="mt-0.5 text-[11px] text-gray-400">쇼핑몰 상세페이지 즉시 삽입</p>
                </div>
              </div>
            </nav>
          </div>

          {/* 사용 매뉴얼 가이드 메뉴 그룹 (DESIGN.md 9번 필수 원칙) */}
          <div className="border-t border-[#30363d] pt-4">
            <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              가이드북 & 매뉴얼
            </div>
            <Link
              href="/guide"
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                isGuide
                  ? "border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-transparent text-amber-300 shadow-sm"
                  : "text-gray-300 hover:bg-[#1f2937] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-bold text-amber-200">📖 연동 & 사용 매뉴얼</div>
                  <div className="text-[10px] text-gray-400 font-normal">플랫폼별 규격 & 8MiB 비법</div>
                </div>
              </div>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                GUIDE
              </span>
            </Link>
          </div>

          {/* AIMaster 패밀리 메뉴 */}
          <div className="border-t border-[#30363d] pt-4 space-y-1">
            <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              플랫폼 바로가기
            </div>
            <a
              href={MAIN_SITE_URL}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-300 hover:bg-[#1f2937] hover:text-white"
            >
              <Home className="h-4 w-4 text-gray-400" />
              <span>AIMaster 메인</span>
            </a>
            <a
              href={`${MAIN_SITE_URL}/programs`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-300 hover:bg-[#1f2937] hover:text-white"
            >
              <Grid className="h-4 w-4 text-gray-400" />
              <span>전체 프로그램 보기</span>
            </a>
          </div>
        </div>

        {/* 하단 회원 정보 및 로그아웃 */}
        <div className="border-t border-[#30363d] bg-[#0d1117] p-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              WASM 엔진 준비됨
            </span>
            <span className="text-[10px] text-gray-400">100% Client-side</span>
          </div>
          <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-2.5">
            <div className="text-[10px] text-gray-400">접속 계정</div>
            <div className="truncate text-xs font-bold text-gray-200 mt-0.5">{userEmail || "일반 회원"}</div>
            <form action={signOutAction} className="mt-2.5">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
