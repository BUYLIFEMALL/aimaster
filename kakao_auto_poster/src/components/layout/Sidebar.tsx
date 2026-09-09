"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// 대시보드는 순서 개념이 없는 개요 화면이라 번호 없이 스텝퍼 위에 별도로 둔다.
const OVERVIEW_ITEM = { href: "/dashboard", icon: "🏠", label: "대시보드" };

// "주제 등록 → 리포트 확인"은 순서가 있는 핵심 작업 흐름이라 번호 스텝퍼로 표시한다
// (insta_auto_poster Sidebar.tsx와 동일한 패턴).
const FLOW_STEPS = [
  {
    step: 1,
    href: "/topics",
    icon: "📌",
    label: "관심 주제 등록",
    description: "정보를 받아볼 주제/키워드 등록",
  },
  {
    step: 2,
    href: "/reports",
    icon: "📰",
    label: "리포트 확인",
    description: "AI가 생성한 정보 콘텐츠 보기",
  },
];

// 수신자 관리 메뉴는 API키등록보다 자주 쓰이는 화면이라 분리해서 위쪽에 배치한다.
const RECIPIENT_ITEMS = [
  { href: "/recipients", icon: "📣", label: "카카오톡 수신자 목록" },
  { href: "/broadcast-log", icon: "📨", label: "발송 내역" },
];

const SETTINGS_ITEMS = [{ href: "/settings", icon: "🔑", label: "API키등록" }];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-neutral-200 bg-white p-4 md:h-full md:w-64 md:justify-between md:border-b-0 md:border-r">
      <div>
        <div className="mb-4 md:mb-6">
          <div className="px-2 text-lg font-semibold text-neutral-900">
            카카오톡 뉴스레터 자동화
          </div>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="block px-2 text-xs text-neutral-500 hover:text-neutral-900"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        <Link
          href={OVERVIEW_ITEM.href}
          className={`mb-3 block rounded-lg px-3 py-2 text-sm font-bold ${
            pathname?.startsWith(OVERVIEW_ITEM.href)
              ? "bg-yellow-50 text-yellow-800"
              : "text-neutral-800 hover:bg-neutral-50"
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
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isActive
                        ? "bg-yellow-500 text-white"
                        : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"
                    }`}
                  >
                    {item.step}
                  </span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-neutral-200" />}
                </div>

                <div className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 ${isActive ? "bg-yellow-50" : "group-hover:bg-neutral-50"}`}>
                  <p className={`text-sm font-bold ${isActive ? "text-yellow-800" : "text-neutral-800"}`}>
                    {item.icon} {item.label}
                  </p>
                  <p className="text-xs text-neutral-500">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-neutral-200 pt-3">
          {RECIPIENT_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-yellow-50 text-yellow-800" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-3 border-t border-neutral-200 pt-3">
          {SETTINGS_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-yellow-50 text-yellow-800" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-4 md:mt-0">
        <p className="mb-2 truncate px-2 text-xs text-neutral-500">{userEmail}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
