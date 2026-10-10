"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import {
  LayoutDashboard,
  Flame,
  Sparkles,
  TrendingUp,
  Link2,
  Bookmark,
  KeyRound,
  BookOpen,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  userEmail?: string;
}

// 공식 표준 작업 흐름 (1 -> 2 -> 3 -> 4 -> 5)
const flow = [
  { href: "/viral-shorts", label: "떡상 쇼츠 발굴", icon: Flame },
  { href: "/golden-channels", label: "황금 채널 발굴", icon: Sparkles },
  { href: "/trending-videos", label: "실시간 터진 영상", icon: TrendingUp },
  { href: "/source-finder", label: "쇼츠 원본 찾기", icon: Link2 },
  { href: "/favorites", label: "즐겨찾기 보관함", icon: Bookmark },
];

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-white md:sticky md:top-0 md:flex select-none">
      {/* 1. 헤더 브랜딩 & 버전 (유튜브 공식 로고 적용) */}
      <div className="border-b border-neutral-200 p-5">
        <Link href="/viral-shorts" className="flex items-center gap-3 group">
          {/* 공식 YouTube 로고 아이콘 */}
          <div className="w-9 h-9 shrink-0 flex items-center justify-center transition-transform group-hover:scale-105">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
              <path
                d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
                fill="#FF0000"
              />
              <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FFFFFF" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2">
              {APP_NAME}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400 font-mono">{APP_VERSION}</p>
          </div>
        </Link>
        <a
          className="mt-2.5 block text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
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
            href="/viral-shorts"
            className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              pathname === "/viral-shorts"
                ? "bg-sky-50 text-sky-700 font-bold"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            <LayoutDashboard size={16} />
            <span>대시보드</span>
          </Link>

          {/* 핵심 작업 흐름: 번호 배지와 세로 연결선 (1 -> 2 -> 3 -> 4 -> 5) */}
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
                          ? "bg-red-600 text-white shadow-xs"
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
                      active ? "bg-red-50" : "group-hover:bg-neutral-50"
                    }`}
                  >
                    <p
                      className={`flex items-center gap-2 text-sm font-bold ${
                        active ? "text-red-900" : "text-neutral-800"
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
          <form action="/api/auth/logout" method="POST">
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
