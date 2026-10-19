"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";
import { 
  Home, 
  Search, 
  FileText, 
  Sparkles, 
  ClipboardList, 
  Key, 
  BookOpen, 
  LogOut, 
  Menu, 
  X,
  ExternalLink
} from "lucide-react";

const OVERVIEW_ITEM = { href: "/dashboard", icon: Home, label: "대시보드" };

const FLOW_STEPS = [
  {
    step: 1,
    href: "/candidates",
    icon: Search,
    label: "게시글 주제 수집",
    description: "카페에 올릴 글감 자동 수집",
  },
  {
    step: 2,
    href: "/drafts",
    icon: FileText,
    label: "AI 자동 글쓰기(초안)",
    description: "제목/본문 확인·수정 후 초안 저장",
  },
  {
    step: 3,
    href: "/write",
    icon: Sparkles,
    label: "AI 자동 글쓰기(수동)",
    description: "주제를 입력해 AI로 새 글 생성",
  },
  {
    step: 4,
    href: "/posts",
    icon: ClipboardList,
    label: "게시글 관리",
    description: "저장한 초안을 카페에 게시",
  },
];

const UTILITY_ITEMS = [
  { 
    href: "/guide", 
    icon: BookOpen, 
    label: "연동 & 사용 매뉴얼", 
    badge: "가이드북",
    highlight: true 
  },
  { 
    href: "/settings", 
    icon: Key, 
    label: "API키등록·플랫폼연동",
    badge: null,
    highlight: false
  },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* 모바일 상단 네비게이션 헤더 (767px 이하) */}
      <div className="flex h-16 w-full items-center justify-between border-b border-emerald-100 bg-white px-4 md:hidden sticky top-0 z-40 shadow-xs">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#03c75a] text-white font-bold text-sm shadow-xs">
            ☕
          </div>
          <span className="text-base font-bold text-slate-900">네이버 카페 포스팅</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#03c75a] border border-emerald-200">
            {APP_VERSION}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          aria-label="메뉴 토글"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* 모바일 백드롭 오버레이 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* 메인 사이드바 컨테이너 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out md:static md:w-64 md:translate-x-0 md:h-screen md:sticky md:top-0 md:shrink-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-1 flex-col overflow-y-auto p-4">
          {/* 브랜드 헤더 */}
          <div className="mb-5 px-1 pt-1">
            <div className="flex items-center justify-between">
              <Link href="/dashboard" onClick={closeMobile} className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#03c75a] text-white text-lg font-bold shadow-sm">
                  ☕
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-slate-900 tracking-tight">네이버 카페 포스팅</span>
                  <span className="text-[11px] font-medium text-slate-400">플로우 위저드 에디션</span>
                </div>
              </Link>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-[#03c75a] border border-emerald-200">
                {APP_VERSION}
              </span>
            </div>

            <a
              href="https://www.buylife.xyz/programs"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#03c75a] transition-colors"
            >
              <span>← 다른 프로그램 보기</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* 메인 네비게이션 */}
          <nav className="flex flex-col space-y-1">
            <Link
              href={OVERVIEW_ITEM.href}
              onClick={closeMobile}
              className={`mb-2 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                pathname === OVERVIEW_ITEM.href
                  ? "bg-[#e8f9f0] text-[#029a45] shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <OVERVIEW_ITEM.icon className={`h-4 w-4 ${pathname === OVERVIEW_ITEM.href ? "text-[#03c75a]" : "text-slate-500"}`} />
              <span>{OVERVIEW_ITEM.label}</span>
            </Link>

            {/* 4단계 플로우 위저드 스텝퍼 */}
            <div className="pt-2 pb-1">
              <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                4단계 포스팅 파이프라인
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
                    onClick={closeMobile}
                    className={`group relative flex gap-3 rounded-xl p-2 transition-all ${
                      isActive ? "bg-emerald-50/70" : "hover:bg-slate-50"
                    }`}
                  >
                    {/* 스텝 번호 + 연결선 */}
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                          isActive
                            ? "bg-[#03c75a] text-white shadow-xs"
                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                        }`}
                      >
                        {item.step}
                      </span>
                      {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                    </div>

                    {/* 라벨 + 설명 */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <item.icon className={`h-3.5 w-3.5 ${isActive ? "text-[#03c75a]" : "text-slate-400"}`} />
                        <p className={`text-sm font-bold truncate ${isActive ? "text-[#029a45]" : "text-slate-800"}`}>
                          {item.label}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* 유틸리티 메뉴 (가이드북 & API키 연동) */}
          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              설정 & 매뉴얼
            </p>
            <div className="space-y-1">
              {UTILITY_ITEMS.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-[#e8f9f0] text-[#029a45] shadow-xs"
                        : item.highlight
                        ? "bg-amber-50/80 text-amber-900 hover:bg-amber-100/80 border border-amber-200/60"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className={`h-4 w-4 ${
                        isActive ? "text-[#03c75a]" : item.highlight ? "text-amber-600" : "text-slate-500"
                      }`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-amber-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* 하단 사용자 계정 및 로그아웃 */}
        <div className="shrink-0 border-t border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-2 flex items-center gap-2 px-1">
            <div className="h-2 w-2 rounded-full bg-[#03c75a]" />
            <p className="truncate text-xs font-medium text-slate-600" title={userEmail}>
              {userEmail}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors shadow-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>로그아웃</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
