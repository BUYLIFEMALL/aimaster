"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Key,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  LayoutGrid,
  Code,
  Gamepad2,
  Cpu,
  Video,
  Palette,
  BookOpen,
  Camera,
  Briefcase,
  Megaphone,
  TrendingUp,
  Users,
  Scale,
  ShoppingBag,
  Utensils,
  Shirt,
  GraduationCap,
  Activity,
  Home,
  Calendar,
} from "lucide-react";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { CATEGORY_GROUPS, JobCategoryKey } from "@/lib/constants";

interface SidebarProps {
  userEmail?: string | null;
  selectedCategory: string; // "ALL" or JobCategoryKey
  onSelectCategory: (cat: string) => void;
  onOpenApiKey: () => void;
  onOpenGuide: () => void;
  onOpenMagicEditor?: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Code,
  Gamepad2,
  Cpu,
  Video,
  Palette,
  BookOpen,
  Camera,
  Briefcase,
  Megaphone,
  TrendingUp,
  Users,
  Scale,
  ShoppingBag,
  Utensils,
  Shirt,
  GraduationCap,
  Activity,
  Home,
  Calendar,
};

export default function Sidebar({
  userEmail,
  selectedCategory,
  onSelectCategory,
  onOpenApiKey,
  onOpenGuide,
  onOpenMagicEditor,
}: SidebarProps) {
  // 5대 그룹 아코디언 열림 상태 (기본 모두 열림)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "IT 및 기술": true,
    "창작 및 예술": true,
    "비즈니스 및 마케팅": true,
    "커머스 및 자영업": true,
    "전문 서비스 및 라이프": true,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "https://aimaster.buylife.xyz";
    } catch {
      window.location.href = "https://aimaster.buylife.xyz";
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen flex-shrink-0 select-none z-20">
      {/* 1. 상단 브랜딩 & 다른 프로그램 보기 */}
      <div className="p-4 border-b border-slate-100 flex-shrink-0">
        <a
          href="https://aimaster.buylife.xyz"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors mb-2 group font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>다른 프로그램 보기</span>
        </a>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-slate-900 truncate tracking-tight">
              {APP_NAME}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded">
                {APP_VERSION}
              </span>
              <span className="text-[10px] text-slate-400">123종 프리셋</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 3단계 번호형 워크플로우 안내 */}
      <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200/70 text-[11px] text-slate-600 flex-shrink-0">
        <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
          <span>🎯</span> 작업 흐름
        </div>
        <div className="space-y-0.5 text-slate-500 text-[10.5px]">
          <div>1. 직군&템플릿 선택</div>
          <div>2. 상세 옵션 & 파일 첨부</div>
          <div>3. 생성 & 매직 인페인팅</div>
        </div>
      </div>

      {/* 3. 대분류 및 19개 직군 탐색 메뉴 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {/* 전체 보기 */}
        <button
          onClick={() => onSelectCategory("ALL")}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            selectedCategory === "ALL"
              ? "bg-amber-50 text-amber-700 font-semibold"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>전체 템플릿 보기 (123)</span>
        </button>

        {/* 5대 그룹 아코디언 */}
        {CATEGORY_GROUPS.map((group) => {
          const isOpen = openGroups[group.title];
          return (
            <div key={group.title} className="pt-2">
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
              >
                <span>{group.title}</span>
                {isOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>

              {isOpen && (
                <div className="mt-0.5 space-y-0.5 pl-1">
                  {group.items.map((item) => {
                    const isSelected = selectedCategory === item.key;
                    const IconComp = ICON_MAP[item.icon] || Sparkles;
                    return (
                      <button
                        key={item.key}
                        onClick={() => onSelectCategory(item.key)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                          isSelected
                            ? "bg-amber-50 text-amber-700 font-semibold"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. 유틸리티 메뉴 (API 키, 가이드) */}
      <div className="p-2 border-t border-slate-200 bg-white flex-shrink-0 space-y-1">
        <button
          onClick={onOpenApiKey}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Key className="w-3.5 h-3.5 text-amber-600" />
          <span>🔑 API키등록·플랫폼연동</span>
        </button>

        <button
          onClick={onOpenGuide}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>💡 사용 가이드</span>
        </button>
      </div>

      {/* 5. 계정 & 로그아웃 (표준 밀착 배치) */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-slate-400 font-medium truncate">로그인 계정</div>
          <div className="text-xs font-semibold text-slate-800 truncate" title={userEmail || ""}>
            {userEmail || "회원"}
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="로그아웃"
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
