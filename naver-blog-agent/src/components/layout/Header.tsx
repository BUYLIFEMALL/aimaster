"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION } from "@/lib/version";

export function Header({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <header className="flex md:hidden items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white font-bold text-xs">
          N
        </span>
        <span className="text-sm font-bold text-neutral-900">네이버 블로그 에이전트</span>
        <span className="rounded bg-neutral-100 px-1 py-0.5 text-[10px] text-neutral-600">
          {APP_VERSION}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <Link href="/dashboard" className="text-neutral-700 font-medium hover:text-neutral-900">
          대시보드
        </Link>
        <Link href="/collector" className="text-rose-600 font-semibold hover:text-rose-700">
          🔥 글감
        </Link>
        <Link href="/guide" className="text-neutral-500 hover:text-neutral-900">
          매뉴얼
        </Link>
        <Link href="/settings" className="text-neutral-500 hover:text-neutral-900">
          설정
        </Link>
      </div>
    </header>
  );
}
