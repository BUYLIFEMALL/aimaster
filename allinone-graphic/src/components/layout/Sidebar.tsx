"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Palette,
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
  Sparkles,
} from "lucide-react";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { CATEGORY_GROUPS } from "@/lib/constants";

interface SidebarProps {
  userEmail?: string | null;
  selectedCategory: string;
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
      window.location.href = "https://www.buylife.xyz";
    } catch {
      window.location.href = "https://www.buylife.xyz";
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen flex-shrink-0 select-none z-20">
      {/* 1. 상단 브랜딩 & 다른 프로그램 보기 */}
      <div className="p-4 border-b border-slate-100 flex-shrink-0">
        <a
          href="https://www.buylife.xyz"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors mb-2.5 group font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-indigo-500" />
          <span>다른 프로그램 보기</span>
        </a>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 flex-shrink-0">
            <Palette className="w-5 h-5 drop-shadow-xs" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-extrabold text-slate-900 truncate tracking-tight">
              {APP_NAME}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded-full">
                {APP_VERSION}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">123종 프리셋</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4단계 파이프라인 워크플로우 안내 */}
      <div className="px-3.5 py-2.5 bg-indigo-50/50 border-b border-indigo-100 text-[11px] text-slate-700 flex-shrink-0">
        <div className="font-extrabold text-indigo-900 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1">🎨 4단계 그래픽 파이프라인</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">FIGMA PRO</span>
        </div>
        <div className="space-y-0.5 text-slate-500 text-[10.5px]">
          <div>1. 123종 프리셋 탐색</div>
          <div>2. 필드 변수 튜닝</div>
          <div>3. AI 마스킹/인페인팅</div>
          <div>4. 벡터/HD 에셋 추출</div>
        </div>
      </div>

      {/* 3. 대분류 및 19개 직군 탐색 메뉴 */}
      <div className="min-h-0 shrink overflow-y-auto custom-scrollbar p-2 space-y-1">
        {/* 전체 보기 */}
        <button
          onClick={() => onSelectCategory("ALL")}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedCategory === "ALL"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
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
                  <ChevronDown className="w-3 h-3 text-indigo-500" />
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
                            ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <IconComp className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
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

      {/* 4. 유틸리티 메뉴 (연동&사용 매뉴얼, API 키, 퀵 가이드 모달) */}
      <div className="p-2 border-t border-slate-200 bg-white flex-shrink-0 space-y-1">
        <Link
          href="/guide"
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          <span>📖 연동 & 사용 매뉴얼</span>
        </Link>

        <button
          onClick={onOpenApiKey}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Key className="w-3.5 h-3.5 text-indigo-600" />
          <span>🔑 API키등록·플랫폼연동</span>
        </button>

        <button
          onClick={onOpenGuide}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>💡 퀵 팁 팝업</span>
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
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
