"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { LayoutDashboard, BarChart3, Search, KeyRound, LogOut, Menu, X } from "lucide-react";

interface SidebarProps {
  userEmail?: string;
}

// 공식 표준 작업 흐름 (docs/SIDEBAR_LAYOUT_STANDARD.md): 번호는 실제 사용 순서와 같다.
const OVERVIEW_ITEM = { href: "/dashboard", label: "대시보드", icon: LayoutDashboard };
const FLOW_STEPS = [
  { step: 1, href: "/channel-analysis", label: "채널 분석", description: "채널·영상 지표 진단", icon: BarChart3 },
  { step: 2, href: "/keyword-analysis", label: "키워드 분석", description: "검색 결과 영상·채널 분석", icon: Search },
];
const UTILITY_ITEMS = [{ href: "/settings", label: "API키등록·플랫폼연동", icon: KeyRound }];

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-b border-neutral-200 p-5">
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3 group">
        <div className="w-9 h-9 shrink-0 flex items-center justify-center transition-transform group-hover:scale-105">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
            <path
              d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
              fill="#FF0000"
            />
            <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FFFFFF" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2">{APP_NAME}</p>
          <p className="mt-0.5 text-xs text-neutral-400 font-mono">{APP_VERSION}</p>
        </div>
      </Link>
      <a className="mt-2.5 block text-xs text-neutral-500 hover:text-neutral-900 transition-colors" href="https://www.buylife.xyz/programs">
        ← 다른 프로그램 보기
      </a>
    </div>
  );
}

function NavBody({ userEmail, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const OverviewIcon = OVERVIEW_ITEM.icon;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex-1 overflow-y-auto p-3">
      <Link
        href={OVERVIEW_ITEM.href}
        onClick={onNavigate}
        className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive(OVERVIEW_ITEM.href) ? "bg-red-50 text-red-700 font-bold" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
        }`}
      >
        <OverviewIcon size={16} />
        <span>{OVERVIEW_ITEM.label}</span>
      </Link>

      {/* 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
      <div className="relative">
        {FLOW_STEPS.map(({ step, href, label, description, icon: Icon }, index) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} className="group relative flex gap-3 pb-2 transition-all">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    active ? "bg-red-600 text-white shadow-xs" : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"
                  }`}
                >
                  {step}
                </span>
                {index < FLOW_STEPS.length - 1 && <span className="mt-1 h-6 w-px bg-neutral-200" />}
              </div>
              <div className={`flex-1 rounded-lg px-2 py-1.5 transition-all ${active ? "bg-red-50" : "group-hover:bg-neutral-50"}`}>
                <p className={`flex items-center gap-2 text-sm font-bold ${active ? "text-red-900" : "text-neutral-800"}`}>
                  <Icon size={15} />
                  <span>{label}</span>
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">{description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 구분선 아래: 연동/유틸리티 */}
      <div className="mt-1 border-t border-neutral-200 pt-3 space-y-1">
        {UTILITY_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              isActive(href) ? "bg-red-50 text-red-700 font-bold" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      {/* 하단: 사용자 이메일과 로그아웃 */}
      <div className="mt-3 border-t border-neutral-200 pt-3 space-y-1">
        <p className="truncate px-3 py-1.5 text-xs text-neutral-500" title={userEmail}>
          {userEmail || "로그인 계정"}
        </p>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <LogOut size={16} />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

export function Sidebar({ userEmail }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 데스크톱: 고정 좌측 바 */}
      <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-white md:sticky md:top-0 md:flex select-none">
        <Brand />
        <NavBody userEmail={userEmail} />
      </aside>

      {/* 모바일: 상단 바 + 펼침 메뉴 (같은 항목·순서) */}
      <div className="md:hidden sticky top-0 z-40 border-b border-neutral-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-sm font-bold text-neutral-900">
            {APP_NAME} <span className="ml-1 text-xs font-mono font-normal text-neutral-400">{APP_VERSION}</span>
          </Link>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <div className="max-h-[80vh] overflow-y-auto border-t border-neutral-200">
            <Brand onNavigate={() => setOpen(false)} />
            <NavBody userEmail={userEmail} onNavigate={() => setOpen(false)} />
          </div>
        )}
      </div>
    </>
  );
}
