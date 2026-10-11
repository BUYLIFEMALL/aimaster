"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  LayoutDashboard,
  FileText,
  User,
  ListOrdered,
  Film,
  KeyRound,
  Download,
  FolderOpen,
  LogOut,
  X,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export type ActiveTab = "concept" | "character" | "script" | "canvas";

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onExportProject: () => void;
  onImportProjectClick: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  userEmail?: string;
  signOutAction?: () => void;
}

const FLOW_STEPS: {
  step: number;
  id: ActiveTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}[] = [
  {
    step: 1,
    id: "concept",
    label: "기획 & 시놉시스",
    description: "작품 컨셉, 5대 아트 스타일, 레이아웃",
    icon: FileText,
    iconColor: "text-emerald-500",
  },
  {
    step: 2,
    id: "character",
    label: "캐릭터 시트 설정",
    description: "인물 3인 외형 묘사, 참조 사진, 시트",
    icon: User,
    iconColor: "text-indigo-500",
  },
  {
    step: 3,
    id: "script",
    label: "시나리오 콘티 생성",
    description: "화수/컷수 조절, 컷별 연출·대사 콘티",
    icon: ListOrdered,
    iconColor: "text-purple-500",
  },
  {
    step: 4,
    id: "canvas",
    label: "웹툰 제작 & 뷰어",
    description: "표지 생성, 컷 일괄 렌더링, 롱스크롤 JPG",
    icon: Film,
    iconColor: "text-amber-500",
  },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  onOpenSettings,
  onExportProject,
  onImportProjectClick,
  isOpenMobile,
  onCloseMobile,
  userEmail,
  signOutAction,
}: SidebarProps) {
  const content = (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-4">
      <div className="space-y-4">
        {/* 1. 상단 로고 & 프로그램 정보 */}
        <div className="border-b border-slate-200/80 pb-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => {
                onSelectTab("concept");
                window.scrollTo({ top: 0, behavior: "smooth" });
                if (onCloseMobile) onCloseMobile();
              }}
              className="flex items-center gap-2.5 hover:opacity-90 transition group"
              title="메인 홈으로 이동"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                  {APP_NAME}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-bold text-slate-500">
                    {APP_VERSION}
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-emerald-500 text-white rounded tracking-wide">
                    FREE
                  </span>
                </div>
              </div>
            </Link>

            {/* 모바일 닫기 버튼 */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
                aria-label="메뉴 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* 메인 카탈로그 전체 프로그램 목록 링크 */}
          <a
            href="https://www.buylife.xyz/programs"
            className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium"
            title="AI Master 전체 프로그램 카탈로그 보기"
          >
            <span>← 다른 프로그램 보기</span>
          </a>
        </div>

        {/* 2. 대시보드 메인 */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              onSelectTab("concept");
              window.scrollTo({ top: 0, behavior: "smooth" });
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4 text-slate-500" />
            <span>대시보드 메인</span>
          </button>

          {/* 스텝퍼 섹션 라벨 */}
          <div className="px-1 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              작업 흐름 (STEP 1~4)
            </span>
          </div>

          {/* 핵심 작업 흐름 (1 -> 2 -> 3 -> 4) */}
          <nav className="relative flex flex-col">
            {FLOW_STEPS.map((item, idx) => {
              const isActive = activeTab === item.id;
              const isLast = idx === FLOW_STEPS.length - 1;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className="group relative flex w-full text-left gap-3 pb-2 transition-all cursor-pointer"
                >
                  {/* 스텝 번호 원형 배지 + 연결선 */}
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
                        isActive
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      }`}
                    >
                      {item.step}
                    </span>
                    {!isLast && (
                      <span className="mt-1 h-6 w-px bg-slate-200 group-hover:bg-slate-300" />
                    )}
                  </div>

                  {/* 라벨 + 한 줄 설명 */}
                  <div
                    className={`min-w-0 flex-1 rounded-xl px-2.5 py-1.5 transition-all ${
                      isActive
                        ? "bg-slate-100/90 border border-slate-200/80 shadow-2xs"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                      <span
                        className={`text-xs font-black truncate ${
                          isActive ? "text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 3. 구분선 및 유틸리티 항목 */}
        <div className="mt-4 border-t border-slate-200/90 pt-3 space-y-1">
          <div className="px-1 pb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              프로젝트 & 연동
            </span>
          </div>

          {/* 📁 프로젝트 저장 (내보내기) */}
          <button
            type="button"
            onClick={() => {
              onExportProject();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Download className="h-4 w-4 text-emerald-600" />
              <span>프로젝트 저장 (JSON)</span>
            </div>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
              내보내기
            </span>
          </button>

          {/* 📂 프로젝트 불러오기 */}
          <button
            type="button"
            onClick={() => {
              onImportProjectClick();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <FolderOpen className="h-4 w-4 text-indigo-600" />
              <span>프로젝트 불러오기</span>
            </div>
            <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200">
              가져오기
            </span>
          </button>

          {/* 🔑 API키등록·플랫폼연동 */}
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <KeyRound className="h-4 w-4 text-amber-500" />
            <span>API키등록·플랫폼연동</span>
          </button>
        </div>
      </div>

      {/* 4. 하단 고정 사용자 계정 & 로그아웃 */}
      <div className="mt-4 border-t border-slate-200/90 pt-3">
        <p
          className="truncate px-2 py-1 text-xs font-medium text-slate-500"
          title={userEmail}
        >
          {userEmail || "로그인 계정"}
        </p>

        <form action="/api/auth/logout" method="POST" className="mt-2">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* 데스크톱 고정 사이드바 */}
      <aside className="hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white md:sticky md:top-0 md:flex md:flex-col shadow-2xs z-20">
        {content}
      </aside>

      {/* 모바일 슬라이드 드로어 오버레이 */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] bg-white shadow-xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
