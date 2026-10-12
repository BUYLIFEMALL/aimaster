"use client";

import { useState } from "react";
import {
  ListMusic,
  LayoutDashboard,
  Music,
  Sliders,
  Film,
  KeyRound,
  BookOpen,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

interface SidebarProps {
  currentTab: 'media' | 'editor' | 'export';
  setTab: (tab: 'media' | 'editor' | 'export') => void;
  onOpenApiKey: () => void;
  onOpenHelp: () => void;
  userEmail?: string | null;
  trackCount: number;
  hasBackground: boolean;
}

// 공식 표준 작업 흐름 (docs/SIDEBAR_LAYOUT_STANDARD.md)
const FLOW_STEPS = [
  {
    step: 1,
    id: "media" as const,
    label: "미디어 센터",
    description: "음원 업로드 · 타임라인 · 배경",
    icon: Music,
  },
  {
    step: 2,
    id: "editor" as const,
    label: "편집 스튜디오",
    description: "10종 스펙트럼 · 14종 파티클 · FX",
    icon: Sliders,
  },
  {
    step: 3,
    id: "export" as const,
    label: "고속 렌더링",
    description: "WebCodecs 1080p MP4 인코딩",
    icon: Film,
  },
];

export function Sidebar({
  currentTab,
  setTab,
  onOpenApiKey,
  onOpenHelp,
  userEmail,
  trackCount,
  hasBackground,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleStepClick = (tabId: 'media' | 'editor' | 'export') => {
    setTab(tabId);
    setMobileOpen(false);
  };

  const renderNavContent = () => (
    <div className="flex flex-col min-h-0 shrink select-none">
      {/* 1. 프로그램명 & 버전 & 다른 프로그램 보기 */}
      <div className="border-b border-neutral-200 p-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xs">
            <ListMusic size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-neutral-900 leading-tight">
              {APP_NAME}
            </p>
            <p className="text-[11px] text-indigo-600 font-bold font-mono mt-0.5">
              {APP_VERSION}
            </p>
          </div>
        </div>
        <a
          className="mt-2.5 block text-xs text-neutral-500 hover:text-indigo-600 transition-colors font-medium"
          href="https://www.buylife.xyz/programs"
        >
          ← 다른 프로그램 보기
        </a>
      </div>

      {/* 2. 네비게이션 메뉴 본문 (내부 스크롤, flex-1 없이 자연스러운 높이 유지) */}
      <div className="overflow-y-auto p-3 space-y-3 min-h-0 shrink">
        {/* 대시보드 진입점 */}
        <button
          type="button"
          onClick={() => handleStepClick('media')}
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all text-left ${
            currentTab === 'media'
              ? "bg-indigo-50 text-indigo-700 shadow-2xs"
              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          }`}
        >
          <LayoutDashboard size={15} />
          <span>대시보드</span>
        </button>

        {/* 3. 번호가 붙은 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
        <div className="relative pt-1">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 mb-2">
            작업 흐름
          </p>
          {FLOW_STEPS.map(({ step, id, label, description, icon: Icon }, index) => {
            const active = currentTab === id;
            return (
              <div
                key={id}
                onClick={() => handleStepClick(id)}
                className="group relative flex gap-2.5 pb-2 cursor-pointer transition-all"
              >
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      active
                        ? "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-2xs ring-2 ring-indigo-100"
                        : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"
                    }`}
                  >
                    {step}
                  </span>
                  {index < FLOW_STEPS.length - 1 && (
                    <span className="mt-1 h-5 w-px bg-neutral-200" />
                  )}
                </div>
                <div
                  className={`flex-1 rounded-lg px-2 py-1 transition-all ${
                    active ? "bg-indigo-50/80" : "group-hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p
                      className={`flex items-center gap-1.5 text-xs font-bold ${
                        active ? "text-indigo-900" : "text-neutral-800"
                      }`}
                    >
                      <Icon size={13} className={active ? "text-indigo-600" : "text-neutral-500"} />
                      <span>{label}</span>
                    </p>
                    {id === 'media' && trackCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded-full">
                        {trackCount}곡
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] leading-tight text-neutral-500 truncate">
                    {description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. 구분선 아래: 연동 및 유틸리티 */}
        <div className="border-t border-neutral-200 pt-2.5 space-y-1">
          {/* API키등록·플랫폼연동 (정확한 표준 명칭 준수) */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenApiKey();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-all text-left"
          >
            <KeyRound size={14} className="text-emerald-600" />
            <span className="font-bold">🔑 API키등록·플랫폼연동</span>
          </button>

          {/* 사용 안내 */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenHelp();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-all text-left"
          >
            <BookOpen size={14} className="text-indigo-600" />
            <span>💡 사용 가이드</span>
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
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <ListMusic size={14} />
          </div>
          <div>
            <span className="text-xs font-bold text-neutral-900">{APP_NAME}</span>
            <span className="ml-1 text-[10px] text-indigo-600 font-mono font-bold">
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
