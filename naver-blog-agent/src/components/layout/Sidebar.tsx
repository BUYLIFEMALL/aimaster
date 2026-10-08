"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PenLine,
  Send,
  BookOpen,
} from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

const flow = [
  { href: "/collector", label: "떡상 콘텐츠 수집", icon: Flame },
  { href: "/", label: "콘텐츠 생성", icon: PenLine },
  { href: "/queue", label: "콘텐츠 보관함", icon: Send },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-white md:sticky md:top-0 md:flex">
      {/* 1. 헤더 브랜딩 & 버전 */}
      <div className="border-b border-neutral-200 p-5">
        <p className="text-lg font-bold text-neutral-900">네이버 블로그 에이전트</p>
        <p className="mt-1 text-xs text-neutral-400">{APP_VERSION}</p>
        <a
          className="mt-2 block text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
          href="https://www.buylife.xyz/programs"
        >
          ← 다른 프로그램 보기
        </a>
      </div>

      {/* 2. 내비게이션 영역 */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div>
          {/* 최상단 대시보드 */}
          <Link
            href="/dashboard"
            className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              pathname === "/dashboard"
                ? "bg-sky-50 text-sky-700 font-bold"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            <LayoutDashboard size={16} />
            <span>대시보드</span>
          </Link>

          {/* 핵심 작업 흐름: 번호 배지와 세로 연결선 (1 -> 2 -> 3) */}
          <div className="relative">
            {flow.map(({ href, label, icon: Icon }, index) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="group relative flex gap-3 pb-2 transition-all"
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                        active
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {index < flow.length - 1 && (
                      <span className="mt-1 h-4 w-px bg-neutral-200" />
                    )}
                  </div>
                  <div
                    className={`flex-1 rounded-lg px-2 py-1.5 transition-all ${
                      active ? "bg-amber-50" : "group-hover:bg-neutral-50"
                    }`}
                  >
                    <p
                      className={`flex items-center gap-2 text-sm font-bold ${
                        active ? "text-amber-900" : "text-neutral-800"
                      }`}
                    >
                      <Icon size={15} />
                      <span>{label}</span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 3. 구분선 및 하단 연동/유틸리티 & 사용자 계정 정보 */}
        <div className="mt-1 border-t border-neutral-200 pt-3 space-y-1">
          {/* API키등록·플랫폼연동 */}
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              pathname === "/settings"
                ? "bg-sky-50 text-sky-700 font-bold"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            <KeyRound size={16} />
            <span>API키등록·플랫폼연동</span>
          </Link>

          {/* 연동 & 사용 매뉴얼 */}
          <Link
            href="/guide"
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              pathname === "/guide"
                ? "bg-sky-50 text-sky-700 font-bold"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            <BookOpen size={16} />
            <span>연동 & 사용 매뉴얼</span>
          </Link>

          {/* 로그인 계정 */}
          <p
            className="mt-1 truncate px-3 py-1.5 text-xs text-neutral-500"
            title={userEmail}
          >
            {userEmail || "로그인 계정"}
          </p>

          {/* 로그아웃 버튼 */}
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              <LogOut size={16} />
              <span>로그아웃</span>
            </button>
          </form>
        </div>
      </nav>
    </aside>
  );
}
