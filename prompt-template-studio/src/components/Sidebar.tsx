"use client";

import { useState } from "react";
import {
  Layers,
  LayoutDashboard,
  PlusCircle,
  HardDriveDownload,
  KeyRound,
  BookOpen,
  LogOut,
  Menu,
  X,
  FileCode,
  Sparkles,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

interface SidebarProps {
  currentTab: "library" | "backup" | "guide";
  setTab: (tab: "library" | "backup" | "guide") => void;
  onOpenCreate: () => void;
  onOpenApiKey: () => void;
  onOpenHelp: () => void;
  userEmail?: string | null;
  totalCount: number;
}

const FLOW_STEPS = [
  {
    step: 1,
    id: "library" as const,
    label: "템플릿 라이브러리",
    description: "카테고리별 템플릿 · 검색 · 실행",
    icon: Layers,
  },
  {
    step: 2,
    id: "create" as const,
    label: "새 프롬프트 제작",
    description: "AI 3단 제안 · {{변수}} 자동 태깅",
    icon: PlusCircle,
  },
  {
    step: 3,
    id: "backup" as const,
    label: "백업 & 동기화",
    description: "JSON 내보내기 · 가져오기 복원",
    icon: HardDriveDownload,
  },
];

export function Sidebar({
  currentTab,
  setTab,
  onOpenCreate,
  onOpenApiKey,
  onOpenHelp,
  userEmail,
  totalCount,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleStepClick = (stepId: string) => {
    if (stepId === "library") {
      setTab("library");
    } else if (stepId === "create") {
      onOpenCreate();
    } else if (stepId === "backup") {
      setTab("backup");
    } else if (stepId === "guide") {
      setTab("guide");
    }
    setMobileOpen(false);
  };

  const renderNavContent = () => (
    <div className="flex flex-col min-h-0 shrink select-none">
      {/* 1. 프로그램명 & 버전 & 다른 프로그램 보기 */}
      <div className="border-b border-neutral-200 p-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
            <FileCode size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-neutral-900 leading-tight">
              {APP_NAME}
            </p>
            <p className="text-[11px] text-blue-600 font-bold font-mono mt-0.5">
              {APP_VERSION}
            </p>
          </div>
        </div>
        <a
          className="mt-2.5 block text-xs text-neutral-500 hover:text-blue-600 transition-colors font-medium"
          href="https://www.buylife.xyz/programs"
        >
          ← 다른 프로그램 보기
        </a>
      </div>

      {/* 2. 네비게이션 메뉴 본문 */}
      <div className="overflow-y-auto p-3 space-y-3 min-h-0 shrink">
        {/* 대시보드 진입점 */}
        <button
          type="button"
          onClick={() => handleStepClick("library")}
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all text-left ${
            currentTab === "library"
              ? "bg-blue-50 text-blue-700 font-black shadow-2xs"
              : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          <LayoutDashboard size={14} className={currentTab === "library" ? "text-blue-600" : "text-neutral-500"} />
          <span>대시보드 홈</span>
        </button>

        {/* 3. 번호형 3단계 핵심 작업 흐름 (docs/SIDEBAR_LAYOUT_STANDARD.md 규격) */}
        <div className="space-y-1 pt-1">
          <p className="px-3 text-[10px] font-black uppercase tracking-wider text-neutral-400">
            핵심 작업 흐름
          </p>

          {FLOW_STEPS.map(({ step, id, label, description }) => {
            const isActive = (id === "library" && currentTab === "library") || (id === "backup" && currentTab === "backup");

            return (
              <div
                key={id}
                onClick={() => handleStepClick(id)}
                className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {/* 원형 단계 번호 */}
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black transition-colors ${
                    isActive
                      ? "bg-white text-blue-700"
                      : "bg-neutral-200 text-neutral-600 group-hover:bg-neutral-300"
                  }`}
                >
                  {step}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`font-bold truncate ${isActive ? "text-white" : "text-neutral-800"}`}>
                      {label}
                    </p>
                    {id === "library" && totalCount > 0 && (
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full ${
                        isActive ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700"
                      }`}>
                        {totalCount}개
                      </span>
                    )}
                  </div>
                  <p className={`mt-0.5 text-[10px] leading-tight truncate ${
                    isActive ? "text-blue-100" : "text-neutral-500"
                  }`}>
                    {description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. 구분선 아래: 연동 및 유틸리티 */}
        <div className="border-t border-neutral-200 pt-2.5 space-y-1">
          {/* 📖 연동 & 사용 매뉴얼 (최상단 지침 7번 준수) */}
          <button
            type="button"
            onClick={() => handleStepClick("guide")}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all text-left cursor-pointer ${
              currentTab === "guide"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            <BookOpen size={14} className={currentTab === "guide" ? "text-white" : "text-blue-600"} />
            <span>📖 연동 &amp; 사용 매뉴얼</span>
          </button>

          {/* API키등록·플랫폼연동 (정확한 표준 명칭 준수) */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenApiKey();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-all text-left cursor-pointer"
          >
            <KeyRound size={14} className="text-emerald-600" />
            <span className="font-bold">🔑 API키등록·플랫폼연동</span>
          </button>

          {/* 간편 팝업 가이드 */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenHelp();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-all text-left cursor-pointer"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>💡 팝업 빠른 안내</span>
          </button>
        </div>

        {/* 5. 계정 이메일·로그아웃 (2026-10-12 주인님 확정: 마지막 메뉴 바로 아래 8~16px 간격으로 바짝 밀착) */}
        <div className="border-t border-neutral-200 pt-2.5 space-y-1 shrink-0">
          <p
            className="truncate px-2 py-1 text-[11px] text-neutral-500 font-mono"
            title={userEmail || undefined}
          >
            {userEmail || "로그인 계정"}
          </p>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <LogOut size={14} />
              <span>로그아웃</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 데스크톱: 표준 고정 좌측 바 (md:w-60) */}
      <aside className="hidden md:flex h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-white sticky top-0 z-30 shadow-2xs">
        {renderNavContent()}
      </aside>

      {/* 모바일: 상단 바 + 펼침 드로어 메뉴 */}
      <div className="md:hidden sticky top-0 z-40 border-b border-neutral-200 bg-white px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
            <FileCode size={14} />
          </div>
          <div>
            <span className="text-xs font-bold text-neutral-900">{APP_NAME}</span>
            <span className="ml-1 text-[10px] text-blue-600 font-mono font-bold">
              {APP_VERSION}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100"
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* 모바일 펼침 메뉴 모달 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex">
          <div className="w-72 bg-white h-full shadow-xl flex flex-col">
            <div className="flex justify-end p-2 border-b border-neutral-100">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X size={18} />
              </button>
            </div>
            {renderNavContent()}
          </div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
