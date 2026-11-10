"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

// 실거래 알림 스텝퍼 흐름
const FLOW_STEPS = [
  { step: 1, href: "/districts", icon: "📍", label: "관심 지역 설정", description: "자치구 선택 + 조회 주기 설정" },
  { step: 2, href: "/listings", icon: "🏢", label: "실거래 내역", description: "수집된 실거래 확인 + AI 투자 분석" },
];

const UTILITY_ITEMS = [
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

const ONSITE_ITEM = { href: "/onsite", icon: "📷", label: "임장 노트" };
const REPORT_ITEM = { href: "/report", icon: "📄", label: "주소 리포트" };
const NEWS_ITEM = { href: "/news", icon: "📰", label: "지역 뉴스" };

function NavContent({ pathname, userEmail }: { pathname: string | null; userEmail: string }) {
  return (
    <>
      <div className="md:min-h-0 md:overflow-y-auto">
        <Link
          href="/dashboard"
          className={`mb-3 flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold transition-all ${
            pathname?.startsWith("/dashboard")
              ? "bg-[#03C75A]/10 text-[#03C75A] border-l-4 border-[#03C75A]"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
                      isActive
                        ? "bg-[#03C75A] text-white shadow-sm"
                        : "border border-slate-200 bg-slate-50 text-slate-500 group-hover:border-slate-300 group-hover:text-slate-900"
                    }`}
                  >
                    {item.step}
                  </span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                </div>
                <div
                  className={`min-w-0 flex-1 rounded-xl px-2.5 py-1.5 transition-all ${
                    isActive
                      ? "bg-[#03C75A]/10 text-[#03C75A]"
                      : "group-hover:bg-slate-100"
                  }`}
                >
                  <p className={`text-sm font-bold ${isActive ? "text-[#03C75A]" : "text-slate-900"}`}>
                    {item.icon} {item.label}
                  </p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 border-t border-slate-200 pt-3">
          {[ONSITE_ITEM, REPORT_ITEM, NEWS_ITEM, ...UTILITY_ITEMS].map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[42px] items-center rounded-xl px-3 text-sm font-bold transition-all ${
                  isActive
                    ? "bg-[#03C75A]/10 text-[#03C75A] border-l-4 border-[#03C75A]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="mr-2 text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 border-t border-slate-200 px-3 pt-3 text-xs">
          <p className="mb-1 font-bold text-slate-500">🔗 함께 쓰는 부동산 프로그램</p>
          <a
            href="https://realty-listing-alert.buylife.xyz/dashboard"
            className="block py-1 font-medium text-slate-600 hover:text-[#03C75A]"
          >
            🔔 아파트 실시간 매물 알림
          </a>
          <a
            href="https://commercial-land-trade-alert.buylife.xyz/watch"
            className="block py-1 font-medium text-slate-600 hover:text-[#03C75A]"
          >
            🏬 상가·건물·토지 매물 알림
          </a>
        </div>
      </div>

      <div className="mt-3 shrink-0 border-t border-slate-200 pt-3">
        <p className="mb-1 truncate px-3 text-xs font-medium text-slate-500">{userEmail}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex min-h-[40px] w-full items-center rounded-xl px-3 text-left text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
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
    <div>
      <div className="flex items-center gap-2.5 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#03C75A] to-[#009B42] text-base text-white shadow-sm">
          🏢
        </span>
        <div>
          <span className="text-sm font-black tracking-tight text-slate-900 block leading-tight">
            부동산 실거래 분석
          </span>
          <span className="text-[10px] font-bold text-slate-400">네이버 부동산 매트릭스</span>
        </div>
      </div>
      <p className="mt-2 px-2">
        <span className="inline-flex items-center rounded-full border border-[#03C75A]/30 bg-[#03C75A]/10 px-2.5 py-0.5 text-[11px] font-extrabold text-[#03C75A]">
          {APP_VERSION}
        </span>
      </p>
    </div>
  );
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 데스크톱(768px 이상): 좌측 고정 메뉴 */}
      <aside className="hidden border-r border-slate-200 bg-white p-4 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col shadow-[2px_0_12px_rgba(0,0,0,0.02)]">
        <div className="mb-5">
          <Brand />
          <a
            href="https://www.buylife.xyz/programs"
            className="mt-3 block px-2 text-xs font-semibold text-slate-400 hover:text-[#03C75A] transition-colors"
          >
            ← 다른 프로그램 보기
          </a>
        </div>
        <NavContent pathname={pathname} userEmail={userEmail} />
      </aside>

      {/* 휴대폰(767px 이하): 위쪽 바 + 접는 메뉴(☰) */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Brand />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-lg text-slate-700 hover:bg-slate-50"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
        {mobileOpen && (
          <div className="max-h-[calc(100dvh-60px)] overflow-y-auto border-t border-slate-200 px-4 pb-4 pt-3 bg-white">
            <a
              href="https://www.buylife.xyz/programs"
              className="mb-3 block px-2 text-xs font-semibold text-slate-400 hover:text-[#03C75A]"
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
