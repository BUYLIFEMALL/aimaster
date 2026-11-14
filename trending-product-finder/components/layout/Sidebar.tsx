"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

// 상품소싱은 "발굴 → 분석 → 소싱" 순서로 진행하는 퀀트 파이프라인 흐름
const FLOW_STEPS = [
  { step: 1, href: "/watchlist", icon: "🔍", label: "키워드 발굴 & 감시", description: "관심 카테고리·급상승 키워드" },
  { step: 2, href: "/reports", icon: "📊", label: "트렌드·기회점수", description: "AI 기회점수 리포트 분석" },
  { step: 3, href: "/sourcing", icon: "🌏", label: "5대 마켓 소싱 · 마진계산", description: "실제 원가비교 + 역마진 방어" },
];

const UTILITY_ITEMS = [
  { href: "/coupang-reviews", icon: "🧩", label: "쿠팡 상품소싱기" },
  { href: "/naver-reviews", icon: "🟢", label: "스마트스토어 상품소싱기" },
  { href: "/factory-quotes", icon: "🏭", label: "공장 견적 비교" },
  { href: "/fees", icon: "🧾", label: "플랫폼별 판매수수료" },
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

function NavContent({ pathname, userEmail }: { pathname: string | null; userEmail: string }) {
  const dashboardActive = pathname?.startsWith("/dashboard");

  return (
    <>
      <div className="md:min-h-0 md:overflow-y-auto">
        <Link
          href="/dashboard"
          className={`mb-3 flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold transition-all ${
            dashboardActive
              ? "border border-mx-primary/40 bg-mx-raised text-mx-link shadow-sm shadow-mx-primary/10"
              : "text-mx-muted hover:bg-mx-raised hover:text-mx-text"
          }`}
        >
          <span className="text-base">📡</span> 실시간 레이더 대시보드
        </Link>

        <nav className="relative flex flex-col">
          {FLOW_STEPS.map((item, idx) => {
            const isActive = pathname?.startsWith(item.href);
            const isLast = idx === FLOW_STEPS.length - 1;
            return (
              <Link key={item.href} href={item.href} className="group relative flex gap-3 pb-1">
                {/* 스텝 번호 + 연결선 */}
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
                      isActive
                        ? "bg-mx-primary text-[#04101A] shadow-md shadow-mx-primary/30"
                        : "border border-mx-border bg-mx-raised text-mx-muted group-hover:border-mx-primary/40 group-hover:text-mx-text"
                    }`}
                  >
                    {item.step}
                  </span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-mx-border" />}
                </div>

                {/* 라벨 + 설명 */}
                <div
                  className={`min-w-0 flex-1 rounded-xl px-2.5 py-1.5 transition-all ${
                    isActive
                      ? "border border-mx-primary/30 bg-mx-raised"
                      : "hover:bg-mx-raised/60"
                  }`}
                >
                  <p className={`text-sm font-bold ${isActive ? "text-mx-link" : "text-mx-text"}`}>
                    {item.icon} {item.label}
                  </p>
                  <p className="text-xs text-mx-muted">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-mx-border pt-4">
          <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-mx-muted">
            소싱 도구 & 환경설정
          </div>
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[42px] items-center rounded-xl px-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "border border-mx-primary/30 bg-mx-raised text-mx-link"
                    : "text-mx-muted hover:bg-mx-raised hover:text-mx-text"
                }`}
              >
                <span className="mr-2 text-sm">{item.icon}</span> {item.label}
              </Link>
            );
          })}
          <a
            href="/downloads/trending-product-finder-extension-latest.zip"
            download
            className="mt-3 flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-mx-primary/40 bg-mx-primary/10 px-3 text-xs font-bold text-mx-link transition-all hover:bg-mx-primary/20"
          >
            <span>⬇ 크롬 확장프로그램 받기</span>
            <span className="rounded-md bg-mx-primary px-2 py-0.5 text-[11px] font-black text-[#04101A]">{APP_VERSION}</span>
          </a>
        </div>
      </div>

      <div className="mt-4 shrink-0 border-t border-mx-border pt-3">
        <div className="mb-2 flex items-center justify-between px-3">
          <p className="truncate text-xs font-semibold text-mx-text">{userEmail}</p>
          <span className="rounded-full bg-mx-primary/20 px-2 py-0.5 text-[10px] font-extrabold text-mx-link">PRO</span>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex min-h-[40px] w-full items-center rounded-lg px-3 text-left text-xs font-semibold text-mx-muted transition-colors hover:bg-mx-raised hover:text-mx-danger"
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
    <div>
      <div className="flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#06B6D4] to-[#0284C7] text-lg text-white shadow-md shadow-mx-primary/20">
          📈
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-black tracking-tight text-mx-text">실시간 트렌드 발굴기</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-mx-primary/15 px-2 py-0.5 text-[10px] font-black text-mx-link">QUANT RADAR</span>
            <span className="text-[10px] font-bold text-mx-muted">{APP_VERSION}</span>
          </div>
        </div>
      </div>
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
      <aside className="hidden border-r border-mx-border bg-mx-surface p-4 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
        <div className="mb-5">
          <Brand />
          <a
            href="https://www.buylife.xyz/programs"
            className="mt-3 block px-2 text-xs font-semibold text-mx-muted transition-colors hover:text-mx-link"
          >
            ← AIMaster 프로그램 목록
          </a>
        </div>
        <NavContent pathname={pathname} userEmail={userEmail} />
      </aside>

      {/* 휴대폰(767px 이하): 위쪽 바 + 접는 메뉴 */}
      <div className="sticky top-0 z-40 border-b border-mx-border bg-mx-surface md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Brand />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-mx-border text-lg text-mx-text"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
        {mobileOpen && (
          <div className="max-h-[calc(100dvh-60px)] overflow-y-auto border-t border-mx-border px-4 pb-4 pt-3">
            <a
              href="https://www.buylife.xyz/programs"
              className="mb-3 block px-2 text-xs font-semibold text-mx-muted hover:text-mx-text"
            >
              ← AIMaster 프로그램 목록
            </a>
            <NavContent pathname={pathname} userEmail={userEmail} />
          </div>
        )}
      </div>
    </>
  );
}
