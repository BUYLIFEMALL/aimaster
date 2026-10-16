"use client";

import { useState } from "react";
import {
  Sparkles,
  LayoutTemplate,
  FolderDown,
  KeyRound,
  BookOpen,
  LogOut,
  Menu,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export type TabType = "input" | "studio" | "history" | "guide";

interface SidebarProps {
  currentTab: TabType;
  setTab: (tab: TabType) => void;
  onOpenApiKey: () => void;
  onOpenHelp: () => void;
  userEmail?: string | null;
  hasKey: boolean;
  activeProjectTitle?: string;
  totalProjectsCount: number;
}

const FLOW_STEPS = [
  {
    step: 1,
    id: "input" as TabType,
    label: "1. 제품 정보 입력",
    description: "1초 스펙검색 · 가격 · 사진 등록",
    icon: FileSpreadsheet,
  },
  {
    step: 2,
    id: "studio" as TabType,
    label: "2. 12단 상세 스튜디오",
    description: "쿠팡/네이버 씬 기획 · AI 렌더링",
    icon: LayoutTemplate,
  },
  {
    step: 3,
    id: "history" as TabType,
    label: "3. 보관함 & 다운로드",
    description: "결과 보관 · 고화질 일괄 다운",
    icon: FolderDown,
  },
];

export function Sidebar({
  currentTab,
  setTab,
  onOpenApiKey,
  onOpenHelp,
  userEmail,
  hasKey,
  activeProjectTitle,
  totalProjectsCount,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleStepClick = (tabId: TabType) => {
    setTab(tabId);
    setMobileOpen(false);
  };

  const renderNavContent = () => (
    <div className="flex flex-col min-h-0 shrink select-none">
      {/* 1. 프로그램명 & 버전 & 다른 프로그램 보기 */}
      <div className="border-b border-neutral-200 p-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
            <LayoutTemplate size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-neutral-900 leading-tight">
              {APP_NAME}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-blue-600 font-bold font-mono">
                {APP_VERSION}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-600 font-semibold rounded-md border border-emerald-200">
                12단 Full
              </span>
            </div>
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
        {/* API 키 상태 배너 */}
        <div
          onClick={onOpenApiKey}
          className={`cursor-pointer rounded-xl p-2.5 text-xs transition-all border flex items-center justify-between ${
            hasKey
              ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-800 hover:bg-emerald-100/50"
              : "bg-amber-50/80 border-amber-200/80 text-amber-800 hover:bg-amber-100/60"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasKey ? (
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            ) : (
              <Clock size={13} className="text-amber-600 shrink-0 animate-pulse" />
            )}
            <span className="truncate font-semibold text-[11px]">
              {hasKey ? "Gemini 연동 완료" : "본인 API 키 필요"}
            </span>
          </div>
          <span className="text-[10px] font-bold underline shrink-0">
            {hasKey ? "관리" : "등록"}
          </span>
        </div>

        {/* 3단계 번호형 작업 흐름 */}
        <div className="space-y-1">
          <p className="px-2 text-[11px] font-bold text-neutral-400 tracking-wider">
            WORKFLOW
          </p>
          <nav className="space-y-1 mt-1">
            {FLOW_STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = currentTab === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleStepClick(s.id)}
                  className={`w-full flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-900 border border-blue-200/80 shadow-2xs"
                      : "text-neutral-700 hover:bg-neutral-100/80 border border-transparent"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-xs font-bold leading-tight ${
                          isActive ? "text-blue-900" : "text-neutral-900"
                        }`}
                      >
                        {s.label}
                      </p>
                      {s.id === "history" && totalProjectsCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                          {totalProjectsCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight mt-0.5 truncate">
                      {s.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 현재 작업 중인 상품 표시 */}
        {activeProjectTitle && (
          <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              현재 작업 상품
            </span>
            <p className="text-xs font-bold text-slate-800 truncate mt-0.5" title={activeProjectTitle}>
              {activeProjectTitle}
            </p>
          </div>
        )}

        {/* 4. 표준 하단 액션: 연동 & 사용 매뉴얼 + API키등록·플랫폼연동 */}
        <div className="border-t border-neutral-200 pt-2.5 space-y-1">
          {/* 📖 연동 & 사용 매뉴얼 (최상단 지침 7번 이행) */}
          <button
            type="button"
            onClick={() => handleStepClick("guide")}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left ${
              currentTab === "guide"
                ? "bg-blue-50 text-blue-900 border border-blue-200/80 shadow-2xs"
                : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen size={15} className="text-blue-600 shrink-0" />
              <span>📖 연동 & 사용 매뉴얼</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700 font-bold">
              안내
            </span>
          </button>

          {/* API키등록·플랫폼연동 (정확한 표준 명칭 준수) */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenApiKey();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-all text-left"
          >
            <KeyRound size={14} className="text-emerald-600 shrink-0" />
            <span className="font-bold">🔑 API키등록·플랫폼연동</span>
          </button>
        </div>

        {/* 5. 계정 이메일·로그아웃 (마지막 메뉴 바로 아래 12px 간격으로 바짝 밀착) */}
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

      {/* 모바일 상단 바 */}
      <header className="md:hidden flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white">
            <LayoutTemplate size={14} />
          </div>
          <span className="text-xs font-black text-neutral-900 truncate">
            {APP_NAME}
          </span>
          <span className="text-[10px] font-bold text-blue-600 font-mono">
            {APP_VERSION}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
          aria-label="메뉴 열기"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* 모바일 오버레이 드로어 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-4/5 max-w-xs flex-1 flex-col bg-white pt-2 shadow-2xl">
            <div className="flex items-center justify-between px-4 pb-2 border-b border-neutral-200">
              <span className="text-xs font-bold text-neutral-500">메뉴</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderNavContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
