"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";
import { BrandMark } from "@/components/ui/BrandMark";

// 100. 골든 랜드 프롭테크 인텔리전스 HUD 사이드바 네비게이션
const FLOW_STEPS = [
  { step: 1, href: "/watch", icon: "🎯", label: "매물 감시(예약 설정)", description: "네이버 화면·조건·수집 간격" },
  { step: 2, href: "/settings", icon: "📨", label: "받는 방법", description: "텔레그램·이메일·카카오톡" },
  { step: 3, href: "/results", icon: "📑", label: "수집 결과", description: "통계·추이·매물 표" },
  { step: 4, href: "/trades", icon: "🏢", label: "실거래 내역", description: "내역·지역 추가·조건" },
];

const UTILITY_ITEMS = [
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

function NavContent({ pathname, userEmail }: { pathname: string | null; userEmail: string }) {
  return (
    <>
      <div className="md:min-h-0 md:overflow-y-auto">
        <Link
          href="/dashboard"
          className={`mb-3 flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold transition-all ${
            pathname?.startsWith("/dashboard")
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
              : "text-gray-300 hover:bg-[#121824] hover:text-amber-400"
          }`}
        >
          🏠 대시보드
        </Link>

        <nav className="relative flex flex-col gap-1.5">
          {FLOW_STEPS.map((item) => {
            const isActive =
              pathname?.startsWith(item.href) ||
              (item.href === "/trades" && (pathname?.startsWith("/districts") || pathname?.startsWith("/conditions")));
            return (
              <div key={item.href}>
                {item.step === 4 && (
                  <p className="mx-2 mb-2 mt-2 border-t border-[#1E293B] pt-3 text-[11px] font-bold text-amber-500/80">
                    실거래 레이더
                  </p>
                )}
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all ${
                    isActive
                      ? "bg-amber-500/15 border border-amber-500/30 text-white"
                      : "hover:bg-[#121824] text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-colors ${
                        isActive
                          ? "bg-gradient-to-br from-amber-500 to-amber-700 text-black shadow-md shadow-amber-500/20"
                          : "bg-[#161F30] text-gray-400 border border-[#1E293B]"
                      }`}
                    >
                      {item.step}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${isActive ? "text-amber-400" : "text-gray-200"}`}>
                      {item.icon} {item.label}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{item.description}</p>
                  </div>
                </Link>
              </div>
            );
          })}
        </nav>

        <a
          href="/downloads/commercial-land-trade-alert-extension-latest.zip"
          className="mt-4 flex min-h-[48px] items-center justify-center rounded-xl btn-3d-gold px-3 text-sm font-black text-black"
        >
          ⬇ 확장 프로그램 받기 ({APP_VERSION})
        </a>

        <div className="mt-4 pt-1 space-y-1">
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[44px] items-center rounded-xl px-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "text-gray-400 hover:bg-[#121824] hover:text-gray-200"
                }`}
              >
                {item.icon} <span className="ml-2">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 border-t border-[#1E293B] px-3 pt-3 text-xs space-y-1">
          <p className="mb-1 font-bold text-gray-400">🔗 함께 쓰는 부동산 프로그램</p>
          <a
            href="https://real-estate-sales.buylife.xyz/listings"
            className="block py-1 text-gray-400 hover:text-amber-400 transition"
          >
            🏢 아파트·빌라 실거래 투자분석
          </a>
          <a
            href="https://realty-listing-alert.buylife.xyz/dashboard"
            className="block py-1 text-gray-400 hover:text-amber-400 transition"
          >
            🔔 아파트 실시간 매물 알림
          </a>
        </div>
      </div>

      <div className="mt-4 shrink-0 rounded-2xl border border-[#1E293B] bg-[#121824] p-3 shadow-md">
        <p className="text-[11px] text-gray-400 font-mono">ACCOUNT</p>
        <p className="mb-2 truncate text-xs font-bold text-gray-200">{userEmail}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex min-h-[36px] w-full items-center justify-center rounded-lg border border-[#1E293B] bg-[#0B0F17] px-3 text-xs font-semibold text-gray-400 hover:border-rose-500/50 hover:text-rose-400 transition"
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 6 }}
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            로그아웃
          </button>
        </form>
      </div>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <BrandMark size={36} />
      <div className="min-w-0">
        <p className="text-[14px] font-black leading-tight tracking-tight text-white">
          <span className="text-amber-400">상업용지·토지</span> 레이더
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {APP_VERSION}
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold font-mono">PROPTECH HUD</span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const mobileOpen = openedAt !== null && openedAt === pathname;

  return (
    <>
      {/* 데스크톱(768px 이상): 좌측 고정 메뉴 */}
      <aside className="hidden border-r border-[#1E293B] bg-[#0B0F17] p-4 md:sticky md:top-0 md:flex md:h-screen md:w-[256px] md:shrink-0 md:flex-col shadow-2xl">
        <div className="mb-5 pb-3 border-b border-[#1E293B]/70">
          <Brand />
          <a
            href="https://www.buylife.xyz/programs"
            className="mt-2.5 block px-1 text-xs text-gray-400 hover:text-amber-400 transition"
          >
            ← 다른 프로그램 보기
          </a>
        </div>
        <NavContent pathname={pathname} userEmail={userEmail} />
      </aside>

      {/* 휴대폰(767px 이하): 위쪽 바 + 접는 메뉴(☰) */}
      <div className="sticky top-0 z-40 border-b border-[#1E293B] bg-[#0B0F17] md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Brand />
          <button
            type="button"
            onClick={() => setOpenedAt(mobileOpen ? null : pathname)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1E293B] bg-[#121824] text-lg text-amber-400"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
        {mobileOpen && (
          <div className="max-h-[calc(100dvh-60px)] overflow-y-auto border-t border-[#1E293B] bg-[#0B0F17] px-4 pb-4 pt-3">
            <a
              href="https://www.buylife.xyz/programs"
              className="mb-3 block px-1 text-xs text-gray-400 hover:text-amber-400 transition"
            >
              ← 다른 프로그램 보기
            </a>
            <NavContent pathname={pathname} userEmail={userEmail} />
          </div>
        )}
      </div>
    </>
  );
}
