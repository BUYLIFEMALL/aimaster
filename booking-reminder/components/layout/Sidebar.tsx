"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

const FLOW_STEPS = [
  {
    step: 1,
    href: "/reservations",
    icon: "📅",
    label: "예약 관리",
    description: "예약 접수 및 현황 관리",
  },
  {
    step: 2,
    href: "/reservations#rules",
    icon: "⚙️",
    label: "리마인드 규칙",
    description: "알림 시퀀스 및 조건 설정",
  },
  {
    step: 3,
    href: "/reservations#list",
    icon: "📊",
    label: "발송 현황",
    description: "15분 크론 발송 모니터링",
  },
];

const UTILITY_ITEMS = [
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* 모바일 상단 바 */}
      <header className="flex md:hidden items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-sm">
            📅
          </span>
          <div>
            <span className="font-bold text-sm text-slate-900">예약 리마인드</span>
            <span className="ml-1.5 inline-block rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              {APP_VERSION}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none"
          aria-label="메뉴 열기"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* 모바일 드롭다운 메뉴 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-3 space-y-3 z-30">
          <nav className="space-y-1">
            {FLOW_STEPS.map((item) => {
              const isActive = pathname === item.href || (item.href === "/reservations" && pathname === "/");
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                    isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                    {item.step}
                  </span>
                  <span>{item.icon} {item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-100 pt-2 space-y-1">
            {UTILITY_ITEMS.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            <p className="truncate mb-1">{userEmail}</p>
            <form action={signOutAction}>
              <button type="submit" className="text-red-500 font-semibold hover:underline">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 6 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                로그아웃
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 데스크톱 사이드바 */}
      <aside className="hidden md:flex w-64 flex-col justify-between border-r border-slate-200/90 bg-white p-5 sticky top-0 h-screen shrink-0">
        <div className="min-h-0 overflow-y-auto space-y-6">
          {/* 로고 & 타이틀 영역 */}
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-sm">
                📅
              </span>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">예약 리마인드</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                    {APP_VERSION}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    자동 가동 중
                  </span>
                </div>
              </div>
            </div>
            <a
              href="https://www.buylife.xyz/programs"
              className="mt-2.5 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              <span>←</span>
              <span>다른 프로그램 보기</span>
            </a>
          </div>

          {/* 3단계 플로우 위저드 스텝퍼 */}
          <div>
            <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              리마인드 자동화 플로우
            </div>
            <nav className="relative flex flex-col space-y-1">
              {FLOW_STEPS.map((item, idx) => {
                const isActive = pathname === item.href || (item.href === "/reservations" && pathname === "/");
                const isLast = idx === FLOW_STEPS.length - 1;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group relative flex gap-3 p-2 rounded-xl transition-all hover:bg-slate-50"
                  >
                    {/* 스텝 인디케이터 + 라인 */}
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-100"
                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                        }`}
                      >
                        {item.step}
                      </span>
                      {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                    </div>

                    {/* 라벨 + 설명 */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-bold flex items-center gap-1 ${
                          isActive ? "text-blue-700" : "text-slate-800"
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 유틸리티 메뉴 */}
          <div className="border-t border-slate-100 pt-4">
            <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              설정 & 도움말
            </div>
            <div className="space-y-1">
              {UTILITY_ITEMS.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-bold border border-blue-100"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* 하단 사용자 계정 정보 */}
        <div className="shrink-0 border-t border-slate-100 pt-4">
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="truncate text-xs font-medium text-slate-700">{userEmail}</p>
            <p className="text-[10px] text-slate-400">회원 전용 계정 연동</p>
          </div>
          <form action={signOutAction} className="mt-2">
            <button
              type="submit"
              className="w-full rounded-lg px-2.5 py-1.5 text-center text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
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
