"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Music,
  Sliders,
  Film,
  KeyRound,
  BookOpen,
  LogOut,
  Menu,
  X,
  Play,
  Sparkles,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

interface SidebarProps {
  currentTab: 'media' | 'editor' | 'export' | 'guide';
  setTab: (tab: 'media' | 'editor' | 'export' | 'guide') => void;
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

  const handleStepClick = (tabId: 'media' | 'editor' | 'export' | 'guide') => {
    setTab(tabId);
    setMobileOpen(false);
  };

  const renderNavContent = () => (
    <div className="flex flex-col min-h-0 shrink select-none bg-[#0f0f0f] text-[#f1f1f1]">
      {/* 1. 프로그램명 & 버전 & 다른 프로그램 보기 (유튜브 레드 로고) */}
      <div className="border-b border-[#272727] p-4 shrink-0 bg-[#0f0f0f]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff0000] text-white shadow-md shadow-red-900/30">
            <Play size={16} fill="currentColor" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white leading-tight truncate">
              {APP_NAME}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-[#ff0000] font-black font-mono px-1.5 py-0.2 rounded bg-red-950/60 border border-red-900/40">
                {APP_VERSION}
              </span>
              <span className="text-[10px] text-[#888888] font-bold">
                YouTube Dark
              </span>
            </div>
          </div>
        </div>
        <a
          className="mt-2.5 block text-xs text-[#888888] hover:text-[#ff0000] transition-colors font-medium"
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
          onClick={() => handleStepClick('media')}
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all text-left cursor-pointer ${
            currentTab === 'media'
              ? "bg-[#272727] text-white shadow-xs"
              : "text-[#aaaaaa] hover:bg-[#181818] hover:text-white"
          }`}
        >
          <LayoutDashboard size={15} className={currentTab === 'media' ? "text-[#ff0000]" : "text-[#777777]"} />
          <span>스튜디오 홈</span>
        </button>

        {/* 3. 번호가 붙은 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
        <div className="relative pt-1">
          <p className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-2 mb-2">
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
                        ? "bg-[#ff0000] text-white shadow-md shadow-red-900/40 ring-2 ring-red-500/20"
                        : "bg-[#212121] text-[#888888] group-hover:bg-[#272727] group-hover:text-white"
                    }`}
                  >
                    {step}
                  </span>
                  {index < FLOW_STEPS.length - 1 && (
                    <span className="mt-1 h-5 w-px bg-[#272727]" />
                  )}
                </div>
                <div
                  className={`flex-1 rounded-xl px-2.5 py-1.5 transition-all ${
                    active ? "bg-[#1f1f1f] border border-[#333333]" : "hover:bg-[#181818]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p
                      className={`flex items-center gap-1.5 text-xs font-bold ${
                        active ? "text-white" : "text-[#cccccc]"
                      }`}
                    >
                      <Icon size={13} className={active ? "text-[#ff0000]" : "text-[#777777]"} />
                      <span>{label}</span>
                    </p>
                    {id === 'media' && trackCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-red-950/80 text-red-300 border border-red-900/50 rounded-full">
                        {trackCount}곡
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] leading-tight text-[#888888] truncate">
                    {description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. 구분선 아래: 연동 및 유틸리티 */}
        <div className="border-t border-[#272727] pt-2.5 space-y-1">
          {/* 📖 연동 & 사용 매뉴얼 (최상단 지침 7번 준수) */}
          <button
            type="button"
            onClick={() => handleStepClick('guide')}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all text-left cursor-pointer ${
              currentTab === 'guide'
                ? "bg-[#ff0000] text-white shadow-md shadow-red-900/30"
                : "text-[#cccccc] hover:bg-[#1f1f1f] hover:text-white"
            }`}
          >
            <BookOpen size={14} className={currentTab === 'guide' ? "text-white" : "text-[#ff0000]"} />
            <span>📖 연동 & 사용 매뉴얼</span>
          </button>

          {/* API키등록·플랫폼연동 (정확한 표준 명칭 준수) */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenApiKey();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-[#cccccc] hover:bg-[#1f1f1f] hover:text-white transition-all text-left cursor-pointer"
          >
            <KeyRound size={14} className="text-emerald-400" />
            <span className="font-bold">🔑 API키등록·플랫폼연동</span>
          </button>

          {/* 퀵 도움말 */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenHelp();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-[#888888] hover:bg-[#1f1f1f] hover:text-white transition-all text-left cursor-pointer"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>💡 퀵 도움말</span>
          </button>
        </div>

        {/* 5. 계정 이메일·로그아웃 (마지막 메뉴 바로 아래 8~16px 간격으로 바짝 밀착) */}
        <div className="border-t border-[#272727] pt-2.5 space-y-1 shrink-0">
          <p
            className="truncate px-2 py-1 text-[11px] text-[#888888] font-mono"
            title={userEmail || undefined}
          >
            {userEmail || "로그인 계정"}
          </p>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[#aaaaaa] hover:bg-red-950/40 hover:text-red-400 transition-colors cursor-pointer"
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
      {/* 데스크톱: 표준 고정 좌측 바 (md:w-60, 다크 테마) */}
      <aside className="hidden md:flex h-screen w-60 shrink-0 flex-col border-r border-[#272727] bg-[#0f0f0f] sticky top-0 z-30 shadow-md">
        {renderNavContent()}
      </aside>

      {/* 모바일: 상단 바 + 펼침 드로어 메뉴 */}
      <div className="md:hidden sticky top-0 z-40 border-b border-[#272727] bg-[#0f0f0f] px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-9 items-center justify-center rounded-lg bg-[#ff0000] text-white">
            <Play size={13} fill="currentColor" />
          </div>
          <div>
            <span className="text-xs font-bold text-white">{APP_NAME}</span>
            <span className="ml-1 text-[10px] text-[#ff0000] font-mono font-bold">
              {APP_VERSION}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-[#aaaaaa] hover:bg-[#212121] hover:text-white cursor-pointer"
          aria-label="메뉴 열기"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* 모바일 펼침 메뉴 모달 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex">
          <div className="w-72 bg-[#0f0f0f] h-full shadow-2xl flex flex-col border-r border-[#272727]">
            <div className="flex justify-end p-2 border-b border-[#272727]">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="메뉴 닫기"
                className="p-1.5 rounded-lg text-[#aaaaaa] hover:bg-[#212121] hover:text-white cursor-pointer"
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
