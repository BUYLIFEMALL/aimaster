"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// 실거래 알림은 "관심 지역 설정 → 실거래 내역 확인"으로 이어지는 단계형 흐름이라, 사이드바도
// 그 순서를 위→아래 스텝퍼로 보여준다. 대시보드는 두 단계를 요약해서 보여주는 조회성 진입
// 화면이라 순서 밖(스텝퍼 위)에 번호 없이 둔다. 설정 페이지는 API 키 등록과 텔레그램 연동이
// 한 페이지에 같이 있어서 "API키등록·플랫폼연동" 라벨 하나로 유틸리티 섹션에 분리한다.
const OVERVIEW_ITEM = { href: "/dashboard", icon: "🏠", label: "대시보드" };

const FLOW_STEPS = [
  {
    step: 1,
    href: "/districts",
    icon: "📍",
    label: "관심 지역 설정",
    description: "자치구 선택 + 조회 주기 설정",
  },
  {
    step: 2,
    href: "/listings",
    icon: "🏢",
    label: "실거래 내역",
    description: "수집된 실거래 확인 + AI 투자 분석",
  },
];

const UTILITY_ITEMS = [{ href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" }];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const isOverviewActive = pathname?.startsWith(OVERVIEW_ITEM.href);

  return (
    <aside className="flex w-full flex-col border-b border-white/10 bg-dark-50 p-4 md:h-full md:w-64 md:justify-between md:border-b-0 md:border-r">
      <div>
        <div className="mb-4 md:mb-6">
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="gold-text block px-2 text-lg font-semibold hover:opacity-80"
          >
            부동산 실거래 투자분석 자동화
          </a>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="block px-2 text-xs text-neutral-500 hover:text-gold-light"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        <Link
          href={OVERVIEW_ITEM.href}
          className={`mb-3 block rounded-lg px-3 py-2 text-sm font-medium ${
            isOverviewActive
              ? "bg-dark-100 text-gold-light"
              : "text-neutral-300 hover:bg-dark-100 hover:text-gold-light"
          }`}
        >
          {OVERVIEW_ITEM.icon} {OVERVIEW_ITEM.label}
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
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isActive
                        ? "bg-gold-gradient text-dark-50"
                        : "bg-dark-100 text-neutral-400 group-hover:bg-dark-100/70"
                    }`}
                  >
                    {item.step}
                  </span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-white/10" />}
                </div>

                {/* 라벨 + 설명 */}
                <div
                  className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 ${
                    isActive ? "bg-dark-100" : "group-hover:bg-dark-100/60"
                  }`}
                >
                  <p className={`text-sm font-bold ${isActive ? "text-gold-light" : "text-neutral-200"}`}>
                    {item.icon} {item.label}
                  </p>
                  <p className="text-xs text-neutral-500">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-white/10 pt-3">
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-dark-100 text-gold-light"
                    : "text-neutral-300 hover:bg-dark-100 hover:text-gold-light"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4 md:mt-0">
        <p className="mb-2 truncate px-2 text-xs text-neutral-500">{userEmail}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-400 hover:bg-dark-100"
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
