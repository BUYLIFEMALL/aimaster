"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  LayoutDashboard,
  User,
  CalendarDays,
  Smile,
  ShoppingBag,
  Send,
  KeyRound,
  BookOpen,
  Sliders,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

interface SidebarProps {
  userEmail?: string | null;
  activeStep?: number;
  onSelectStep?: (step: number) => void;
  onOpenApiKeyModal?: () => void;
  onOpenHelpModal?: () => void;
  onOpenHistory?: () => void;
  /** 화면 안 매뉴얼이 열려 있으면 true — 매뉴얼 메뉴를 선택 상태로, 단계 메뉴는 선택 해제로 보여 준다. */
  guideActive?: boolean;
}

// 공식 표준 작업 흐름 (docs/SIDEBAR_LAYOUT_STANDARD.md): 번호는 실제 사용 순서와 같다.
const OVERVIEW_ITEM = { id: 0, label: "대시보드", icon: LayoutDashboard };
const FLOW_STEPS = [
  {
    step: 1,
    id: "step-1-appearance",
    label: "외형 스타일링",
    description: "성별·국적·나이·헤어스타일",
    icon: User,
  },
  {
    step: 2,
    id: "step-2-routine",
    label: "일과 & 앵글 기획",
    description: "인플루언서 하루 5대 타임라인",
    icon: CalendarDays,
  },
  {
    step: 3,
    id: "step-3-styling",
    label: "표정·포즈 & 연출",
    description: "셀카 각도·의상·장소·조명·필름",
    icon: Smile,
  },
  {
    step: 4,
    id: "step-4-admode",
    label: "광고/공구 모드",
    description: "PPL 제품 사진 1:1 합성 & 5대 광고",
    icon: ShoppingBag,
  },
  {
    step: 5,
    id: "step-5-generate",
    label: "화보 & 캡션 생성",
    description: "Gemini 3 Pro 화보 & 3종 캡션",
    icon: Send,
  },
];

export function Sidebar({
  userEmail,
  activeStep = 1,
  onSelectStep,
  onOpenApiKeyModal,
  onOpenHelpModal,
  onOpenHistory,
  guideActive = false,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleStepClick = (stepNum: number, elementId: string) => {
    if (onSelectStep) onSelectStep(stepNum);
    setMobileOpen(false);
    setTimeout(() => document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const handleOverviewClick = () => {
    if (onSelectStep) onSelectStep(0);
    setMobileOpen(false);
    setTimeout(() => document.getElementById("step-1-appearance")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const renderNavContent = () => (
    <div className="flex flex-col min-h-0 shrink select-none">
      {/* 1. 프로그램명 & 버전 & 다른 프로그램 보기 */}
      <div className="border-b border-[#282e42] p-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 text-white shadow-md shadow-rose-500/20 border border-rose-400/30">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-100 leading-snug truncate">
              {APP_NAME}
            </p>
            <p className="text-[11px] text-rose-300 font-bold font-mono">
              {APP_VERSION} VOGUE
            </p>
          </div>
        </div>
        <a
          className="mt-2.5 block text-xs text-slate-400 hover:text-rose-300 transition-colors font-medium"
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
          onClick={handleOverviewClick}
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all text-left cursor-pointer ${
            activeStep === 0 && !guideActive
              ? "bg-rose-500/20 text-rose-200 border border-rose-500/40 shadow-xs"
              : "text-slate-400 hover:bg-[#1c202e] hover:text-slate-100"
          }`}
        >
          <LayoutDashboard size={15} />
          <span>{OVERVIEW_ITEM.label}</span>
        </button>

        {/* 3. 번호가 붙은 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
        <div className="relative pt-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
            에디토리얼 작업 파이프라인
          </p>
          {FLOW_STEPS.map(({ step, id, label, description, icon: Icon }, index) => {
            const active = activeStep === step && !guideActive;
            return (
              <div
                key={id}
                onClick={() => handleStepClick(step, id)}
                className="group relative flex gap-2.5 pb-2.5 cursor-pointer transition-all"
              >
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      active
                        ? "bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-500/30"
                        : "bg-[#1c202e] text-slate-400 group-hover:bg-[#252b3d] group-hover:text-slate-200 border border-[#282e42]"
                    }`}
                  >
                    {step}
                  </span>
                  {index < FLOW_STEPS.length - 1 && (
                    <span className="mt-1 h-5 w-px bg-[#282e42]" />
                  )}
                </div>
                <div
                  className={`flex-1 rounded-lg px-2.5 py-1.5 transition-all ${
                    active ? "bg-rose-500/15 border border-rose-500/30" : "group-hover:bg-[#1c202e]"
                  }`}
                >
                  <p
                    className={`flex items-center gap-1.5 text-xs font-bold ${
                      active ? "text-rose-200" : "text-slate-200"
                    }`}
                  >
                    <Icon size={13} className={active ? "text-rose-400" : "text-slate-400"} />
                    <span>{label}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-slate-400 truncate">
                    {description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. 구분선 아래: 연동 및 유틸리티 */}
        <div className="border-t border-[#282e42] pt-2.5 space-y-1">
          {/* API키등록·플랫폼연동 */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenApiKeyModal?.();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-[#1c202e] hover:text-white transition-all text-left cursor-pointer"
          >
            <KeyRound size={14} className="text-emerald-400" />
            <span className="font-bold">🔑 API키등록·플랫폼연동</span>
          </button>

          {/* 사용 안내 */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenHelpModal?.();
            }}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all text-left cursor-pointer ${
              guideActive ? "bg-rose-500/20 text-rose-200 font-bold border border-rose-500/40" : "text-slate-400 hover:bg-[#1c202e] hover:text-slate-200"
            }`}
          >
            <BookOpen size={14} className="text-indigo-400" />
            <span>📖 연동 &amp; 사용 매뉴얼</span>
          </button>

          {/* 작업 히스토리 */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenHistory?.();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-[#1c202e] hover:text-slate-200 transition-all text-left cursor-pointer"
          >
            <Sliders size={14} className="text-amber-400" />
            <span>⚙️ 작업 히스토리</span>
          </button>
        </div>

        {/* 5. 계정 이메일·로그아웃 */}
        <div className="border-t border-[#282e42] pt-2.5 space-y-1 shrink-0">
          <p
            className="truncate px-2 py-1 text-[11px] text-slate-400 font-mono"
            title={userEmail || undefined}
          >
            {userEmail || "로그인 계정"}
          </p>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer"
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
      {/* 데스크톱: 표준 고정 좌측 바 */}
      <aside className="hidden md:flex h-screen w-60 shrink-0 flex-col border-r border-[#282e42] bg-[#141721] sticky top-0 z-30 shadow-xl">
        {renderNavContent()}
      </aside>

      {/* 모바일: 상단 바 + 펼침 드로어 메뉴 */}
      <div className="md:hidden sticky top-0 z-40 border-b border-[#282e42] bg-[#141721] px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500 text-white shadow-xs">
            <Sparkles size={14} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-100">{APP_NAME}</span>
            <span className="ml-1 text-[10px] text-rose-300 font-mono font-bold">
              {APP_VERSION}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-[#1c202e] cursor-pointer"
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* 모바일 펼침 메뉴 모달 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex">
          <div className="w-72 bg-[#141721] h-full shadow-2xl flex flex-col border-r border-[#282e42]">
            <div className="flex justify-end p-2 border-b border-[#282e42]">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-[#1c202e] cursor-pointer"
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
