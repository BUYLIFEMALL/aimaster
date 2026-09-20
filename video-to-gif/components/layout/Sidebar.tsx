"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const dashboardActive = pathname === "/dashboard" || pathname?.startsWith("/dashboard/");

  return (
    <aside className="flex w-full flex-col border-b border-neutral-200 bg-white p-4 md:min-h-screen md:w-64 md:justify-between md:border-b-0 md:border-r">
      <div>
        <div className="mb-4 md:mb-6">
          <Link href="/dashboard" className="block px-2 text-lg font-semibold text-neutral-900">
            상세페이지 GIF 자동화
          </Link>
          <a href={`${MAIN_SITE_URL}/programs`} className="block px-2 text-xs text-neutral-500 hover:text-neutral-900">
            ← 다른 프로그램 보기
          </a>
        </div>

        <nav className="relative flex flex-col">
          <Link href="/dashboard" className="group relative flex gap-3 pb-1">
            <div className="flex flex-col items-center">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${dashboardActive ? "bg-amber-500 text-white" : "bg-neutral-100 text-neutral-500"}`}>
                1
              </span>
            </div>
            <div className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 ${dashboardActive ? "bg-amber-50" : "group-hover:bg-neutral-50"}`}>
              <p className={`text-sm font-bold ${dashboardActive ? "text-amber-700" : "text-neutral-800"}`}>🎞️ GIF 변환 작업</p>
              <p className="text-xs text-neutral-500">동영상 업로드 · 변환 · 다운로드</p>
            </div>
          </Link>
        </nav>

        <div className="mt-6 border-t border-neutral-200 pt-3">
          <a href={MAIN_SITE_URL} className="block rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
            🏠 AIMaster 메인으로
          </a>
          <a href={`${MAIN_SITE_URL}/programs`} className="block rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
            🧩 전체 프로그램 보기
          </a>
        </div>
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-4 md:mt-0">
        <p className="mb-2 truncate px-2 text-xs text-neutral-500">{userEmail}</p>
        <form action={signOutAction}>
          <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
