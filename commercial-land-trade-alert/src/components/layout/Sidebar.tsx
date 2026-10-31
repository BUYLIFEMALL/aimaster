"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";
import { BrandMark } from "@/components/ui/BrandMark";

// 지역 → 조건 → 거래 확인 순서로 쓰는 프로그램이라 메뉴도 그 순서대로 둔다.
const FLOW_STEPS = [
  { step: 1, href: "/districts", icon: "📍", label: "관심 지역", description: "전국 시·군·구 고르기" },
  { step: 2, href: "/conditions", icon: "🎯", label: "거래 조건", description: "용도·지목·금액·면적" },
  { step: 3, href: "/trades", icon: "🏢", label: "실거래 목록", description: "거르기·비교·CSV" },
];


// "API키등록·플랫폼연동"은 플랫폼 표준 메뉴명이다(2026-09-13).
const UTILITY_ITEMS = [
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

function NavContent({ pathname, userEmail }: { pathname: string | null; userEmail: string }) {
  return (
    <>
      {/* The account block sits right under the menu; on long menus only the menu scrolls so it stays in view. */}
      <div className="md:min-h-0 md:overflow-y-auto">
        <Link
          href="/dashboard"
          className={`mb-3 flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-bold ${
            pathname?.startsWith("/dashboard") ? "bg-[#e8f8ef] text-mx-link" : "text-[#475063] hover:bg-[#e8f8ef] hover:text-mx-link"
          }`}
        >
          🏠 대시보드
        </Link>

        <nav className="relative flex flex-col">
          {FLOW_STEPS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
                        return (
              <Link key={item.href} href={item.href} className="group relative flex gap-3 pb-1">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isActive
                        ? "bg-mx-primary text-white"
                        : "bg-[#eef1f5] text-[#5b6475]"
                    }`}
                  >
                    {item.step}
                  </span>
                  
                </div>
                <div className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 ${isActive ? "bg-[#e8f8ef]" : "group-hover:bg-[#f4f6f9]"}`}>
                  <p className={`text-sm font-bold ${isActive ? "text-mx-link" : "text-[#475063]"}`}>
                    {item.icon} {item.label}
                  </p>
                  <p className="text-xs text-mx-muted">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>


        <div className="mt-6 border-t border-mx-border pt-3">
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium ${
                  isActive ? "bg-[#e8f8ef] text-mx-link" : "text-[#475063] hover:bg-[#e8f8ef] hover:text-mx-link"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-3 shrink-0 rounded-2xl border border-mx-border bg-white p-3">
        <p className="text-[11px] text-mx-muted">로그인 계정</p>
        <p className="mb-2 truncate text-xs font-bold text-[#1f2937]">{userEmail}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex min-h-[36px] w-full items-center rounded-lg border border-mx-border px-3 text-left text-xs font-semibold text-mx-muted hover:border-mx-primary hover:text-mx-link"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 6 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            로그아웃
          </button>
        </form>
      </div>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <div className="min-w-0">
        <p className="text-[15px] font-extrabold leading-tight tracking-tight text-mx-text">
          <span className="text-mx-primary">상가·건물·토지</span> 실거래 알림
        </p>
        <p className="mt-0.5 text-[11px] font-bold text-[#7b8494]">{APP_VERSION}</p>
      </div>
    </div>
  );
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  // 휴대폰에서 메뉴를 누르고 다른 화면으로 이동하면 펼친 메뉴가 닫히도록, 펼친 경로를 기억한다.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const mobileOpen = openedAt !== null && openedAt === pathname;

  return (
    <>
      {/* 데스크톱(768px 이상): 좌측 고정 메뉴 */}
      <aside className="hidden border-r border-mx-border bg-white p-4 md:sticky md:top-0 md:flex md:h-screen md:w-[248px] md:shrink-0 md:flex-col">
        <div className="mb-5">
          <Brand />
          <a href="https://www.buylife.xyz/programs" className="mt-2 block px-2 text-xs text-mx-muted hover:text-mx-text">
            ← 다른 프로그램 보기
          </a>
        </div>
        <NavContent pathname={pathname} userEmail={userEmail} />
      </aside>

      {/* 휴대폰(767px 이하): 위쪽 바 + 접는 메뉴(☰) — 항목·순서는 데스크톱과 같다 */}
      <div className="sticky top-0 z-40 border-b border-mx-border bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <Brand />
          <button
            type="button"
            onClick={() => setOpenedAt(mobileOpen ? null : pathname)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-mx-border text-lg text-mx-text"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
        {mobileOpen && (
          <div className="max-h-[calc(100dvh-60px)] overflow-y-auto border-t border-mx-border px-4 pb-4 pt-3">
            <a href="https://www.buylife.xyz/programs" className="mb-3 block px-2 text-xs text-mx-muted hover:text-mx-text">
              ← 다른 프로그램 보기
            </a>
            <NavContent pathname={pathname} userEmail={userEmail} />
          </div>
        )}
      </div>
    </>
  );
}
