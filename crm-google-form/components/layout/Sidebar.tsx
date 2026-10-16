"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

// 접수 처리는 "구글폼 연결 → 접수 내역 확인" 순서로 진행되는 핵심 흐름이라 사이드바도 위→아래
// 스텝퍼로 보여준다. RCS 프로모션 발송은 이 흐름에 속하지 않는 부가 기능이라 번호 없이 별도로
// 두고, 발송 계정 설정·매뉴얼은 유틸리티로 맨 아래 분리한다.
const FLOW_STEPS = [
  { step: 1, href: "/sources", icon: "🔗", label: "구글폼 연결", description: "폼 등록 · 알림 채널 · 팔로우업" },
  { step: 2, href: "/submissions", icon: "📥", label: "접수 내역", description: "신청자 · 발송 상태 확인" },
];

const SECONDARY_ITEMS = [
  { href: "/promotions", icon: "📢", label: "RCS 프로모션 발송", description: "선택한 신청자에게 1회 발송" },
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
            pathname?.startsWith("/dashboard") ? "bg-mx-raised text-mx-text" : "text-mx-muted hover:bg-mx-raised hover:text-mx-text"
          }`}
        >
          🏠 대시보드
        </Link>

        <nav className="relative flex flex-col">
          {FLOW_STEPS.map((item, idx) => {
            const isActive = pathname?.startsWith(item.href);
            const isLast = idx === FLOW_STEPS.length - 1;
            return (
              <Link key={item.href} href={item.href} className="group relative flex gap-3 pb-1">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isActive
                        ? "bg-mx-primary text-white"
                        : "border border-mx-border bg-mx-raised text-mx-muted group-hover:text-mx-text"
                    }`}
                  >
                    {item.step}
                  </span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-mx-border" />}
                </div>
                <div className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 ${isActive ? "bg-mx-raised" : "group-hover:bg-mx-raised"}`}>
                  <p className={`text-sm font-bold ${isActive ? "text-mx-link" : "text-mx-text"}`}>
                    {item.icon} {item.label}
                  </p>
                  <p className="text-xs text-mx-muted">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 space-y-1">
          {SECONDARY_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 ${isActive ? "bg-mx-raised" : "hover:bg-mx-raised"}`}
              >
                <p className={`text-sm font-bold ${isActive ? "text-mx-link" : "text-mx-text"}`}>
                  {item.icon} {item.label}
                </p>
                <p className="text-xs text-mx-muted">{item.description}</p>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 border-t border-mx-border pt-3">
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium ${
                  isActive ? "bg-mx-raised text-mx-link" : "text-mx-muted hover:bg-mx-raised hover:text-mx-text"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-3 shrink-0 border-t border-mx-border pt-3">
        <p className="mb-1 truncate px-3 text-xs text-mx-muted">{userEmail}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-sm font-medium text-mx-muted hover:bg-mx-raised hover:text-mx-text"
          >
            로그아웃
          </button>
        </form>
      </div>
    </>
  );
}

function Brand() {
  return (
    <div>
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mx-primary text-sm">📋</span>
        <span className="text-base font-bold text-mx-text">구글폼 CRM 자동화</span>
      </div>
      <p className="mt-1 px-2 text-xs text-mx-muted">
        <span className="mx-chip-amber px-2 py-0.5">{APP_VERSION}</span>
      </p>
    </div>
  );
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 휴대폰에서 메뉴를 누르고 다른 화면으로 이동하면 펼친 메뉴를 닫는다.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 데스크톱(768px 이상): 좌측 고정 메뉴 */}
      <aside className="hidden border-r border-mx-border bg-mx-surface p-4 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
        <div className="mb-5">
          <Brand />
          <a href="https://www.buylife.xyz/programs" className="mt-2 block px-2 text-xs text-mx-muted hover:text-mx-text">
            ← 다른 프로그램 보기
          </a>
        </div>
        <NavContent pathname={pathname} userEmail={userEmail} />
      </aside>

      {/* 휴대폰(767px 이하): 위쪽 바 + 접는 메뉴(☰) — 항목·순서는 데스크톱과 같다 */}
      <div className="sticky top-0 z-40 border-b border-mx-border bg-mx-surface md:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <Brand />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
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
