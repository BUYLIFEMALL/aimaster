"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutGrid, 
  PlayCircle, 
  Code2, 
  Sparkles, 
  KeyRound, 
  BookOpen, 
  LogOut,
  ArrowLeft,
  Component
} from "lucide-react";
import { APP_VERSION, PROGRAM_NAME } from "@/lib/version";

interface SidebarProps {
  userEmail?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ userEmail = "buylifemall@naver.com", activeTab = "gallery", onTabChange }) => {
  const pathname = usePathname();

  const navItems = [
    {
      id: "gallery",
      step: "1",
      title: "컴포넌트 갤러리",
      desc: "12대 필수 UI 요소 둘러보기",
      icon: LayoutGrid,
      href: "/?tab=gallery",
    },
    {
      id: "demos",
      step: "2",
      title: "인터랙티브 데모실",
      desc: "10종 실사용 시뮬레이터",
      icon: PlayCircle,
      href: "/?tab=demos",
    },
    {
      id: "code",
      step: "3",
      title: "코드 라이브러리",
      desc: "클린 TSX 원클릭 복사",
      icon: Code2,
      href: "/?tab=code",
    },
    {
      id: "ai",
      step: "4",
      title: "AI 컴포넌트 생성기",
      desc: "프롬프트 기반 자동 빌드",
      icon: Sparkles,
      href: "/?tab=ai",
    },
  ];

  const handleItemClick = (id: string) => {
    if (onTabChange) {
      onTabChange(id);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* 1. 브랜드 헤더 */}
      <div className="p-5 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
            <Component className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-sm leading-tight tracking-tight">
                {PROGRAM_NAME}
              </span>
            </div>
            <span className="inline-block text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md mt-0.5">
              {APP_VERSION}
            </span>
          </div>
        </Link>
        <Link
          href="https://www.buylife.xyz/programs"
          className="mt-3 flex items-center text-xs text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          다른 프로그램 보기
        </Link>
      </div>

      {/* 2. 작업 흐름 네비게이션 */}
      <div className="min-h-0 shrink overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        <div>
          <div className="px-3 mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              작업 흐름
            </span>
          </div>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === "/" && activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                    isActive
                      ? "bg-blue-50/80 text-blue-700 font-semibold shadow-2xs border border-blue-100/70"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium leading-none">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-normal mt-1 truncate">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 부가 설정 메뉴 */}
        <div>
          <div className="px-3 mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              설정 및 안내
            </span>
          </div>
          <div className="space-y-1">
            <Link
              href="/settings"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                pathname === "/settings"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <KeyRound className="w-4 h-4 text-slate-400" />
              API키등록·플랫폼연동
            </Link>
            <Link
              href="/guide"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                pathname === "/guide"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-4 h-4 text-slate-400" />
              연동 & 사용 매뉴얼
            </Link>
          </div>
        </div>
      </div>

      {/* 4. 하단 로그인 계정 정보 & 로그아웃 (표준 바짝 붙은 형태) */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white border border-slate-200/60 shadow-2xs">
          <div className="min-w-0 flex-1 mr-2">
            <p className="text-[11px] text-slate-400 leading-tight">로그인 계정</p>
            <p className="text-xs font-medium text-slate-700 truncate" title={userEmail}>
              {userEmail}
            </p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
};
