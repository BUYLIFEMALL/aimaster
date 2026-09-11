"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

const OVERVIEW_ITEM = { href: "/dashboard", icon: "🏠", label: "대시보드" };

const FLOW_STEPS = [
  {
    step: 1,
    href: "/settings",
    icon: "🔑",
    label: "네이버 연동·카페 등록",
    description: "네이버 계정 연결 및 게시판 등록",
  },
  {
    step: 2,
    href: "/posts",
    icon: "📝",
    label: "게시글 관리",
    description: "AI로 작성하고 카페에 게시",
  },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-neutral-200 bg-white p-4 md:h-full md:w-64 md:justify-between md:border-b-0 md:border-r">
      <div>
        <div className="mb-4 md:mb-6">
          <div className="px-2 text-lg font-semibold text-neutral-900">
            네이버 카페 자동화
          </div>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="block px-2 text-xs text-neutral-500 hover:text-neutral-900"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        <nav className="flex flex-col">
          <Link
            href={OVERVIEW_ITEM.href}
            className={`mb-2 block rounded-lg px-3 py-2 text-sm font-medium ${
              pathname?.startsWith(OVERVIEW_ITEM.href)
                ? "bg-sky-50 text-sky-700"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            {OVERVIEW_ITEM.icon} {OVERVIEW_ITEM.label}
          </Link>

          <div className="relative flex flex-col">
            {FLOW_STEPS.map((item, idx) => {
              const isActive = pathname?.startsWith(item.href);
              const isLast = idx === FLOW_STEPS.length - 1;
              return (
                <Link key={item.href} href={item.href} className="group relative flex gap-3 pb-1">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isActive
                          ? "bg-sky-600 text-white"
                          : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"
                      }`}
                    >
                      {item.step}
                    </span>
                    {!isLast && <span className="mt-1 w-px flex-1 bg-neutral-200" />}
                  </div>

                  <div
                    className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 ${
                      isActive ? "bg-sky-50" : "group-hover:bg-neutral-50"
                    }`}
                  >
                    <p className={`text-sm font-bold ${isActive ? "text-sky-700" : "text-neutral-800"}`}>
                      {item.icon} {item.label}
                    </p>
                    <p className="text-xs text-neutral-500">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
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
