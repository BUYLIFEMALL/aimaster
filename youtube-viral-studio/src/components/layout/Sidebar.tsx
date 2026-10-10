"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import {
  Flame,
  Search,
  Sparkles,
  Link2,
  Bookmark,
  Key,
  HelpCircle,
  ExternalLink,
  LogOut,
  User,
} from "lucide-react";

interface SidebarProps {
  userEmail?: string;
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();

  const navGroups = [
    {
      group: "발굴 & 벤치마킹",
      items: [
        {
          name: "조회수 폭발 쇼츠 찾기",
          href: "/viral-shorts",
          icon: Search,
          badge: "핵심",
        },
        {
          name: "황금 채널 발굴기",
          href: "/golden-channels",
          icon: Sparkles,
        },
        {
          name: "실시간 터진 영상",
          href: "/trending-videos",
          icon: Flame,
          badge: "실시간",
        },
        {
          name: "쇼츠 원본 찾기",
          href: "/source-finder",
          icon: Link2,
        },
      ],
    },
    {
      group: "보관 & 관리",
      items: [
        {
          name: "즐겨찾기 보관함",
          href: "/favorites",
          icon: Bookmark,
        },
      ],
    },
    {
      group: "설정 & 가이드",
      items: [
        {
          name: "YouTube API 키 설정",
          href: "/settings",
          icon: Key,
        },
        {
          name: "이용 가이드",
          href: "/guide",
          icon: HelpCircle,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen select-none shrink-0 sticky top-0">
      {/* 헤더 & 프로그램 타이틀 */}
      <div className="p-5 border-b border-gray-100">
        <Link href="/viral-shorts" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-900 text-base leading-tight">
                {APP_NAME}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                골든 파인더 엔진
              </span>
              <span className="text-[11px] text-gray-500 font-mono">
                {APP_VERSION}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* 내비게이션 메뉴 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.group}>
            <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {group.group}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-red-50 text-red-600 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-red-600" : "text-gray-500"
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* AIMaster 플랫폼 허브 복귀 링크 */}
        <div className="pt-2 border-t border-gray-100">
          <a
            href="https://buylife.xyz/dashboard"
            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <span>AIMaster 홈으로 이동</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      {/* 하단 사용자 계정 & 로그아웃 */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-gray-800 truncate" title={userEmail}>
                {userEmail || "사용자"}
              </p>
              <p className="text-[10px] text-gray-500">본인 API 키 연동 모드</p>
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
