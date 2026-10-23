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
    // 매뉴얼 화면에서 넘어올 때는 입력 패널이 다시 보인 뒤에 스크롤해야 해서 한 박자 늦춘다.
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
      <div className="border-b border-if-border p-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white shadow-xs">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-if-text leading-snug truncate">
              {APP_NAME}
            </p>
            <p className="text-[11px] text-pink-400 font-bold font-mono">
              {APP_VERSION}
            </p>
          </div>
        </div>
        <a
          className="mt-2.5 block text-xs text-if-muted hover:text-pink-400 transition-colors font-medium"
          href="https://www.buylife.xyz/programs"
        >
          ← 다른 프로그램 보기
        </a>
      </div>

      {/* 2. 네비게이션 메뉴 본문 (flex-1 없이 내부 스크롤) */}
      <div className="overflow-y-auto p-3 space-y-3 min-h-0 shrink">
        {/* 대시보드 진입점 */}
        <button
          type="button"
          onClick={handleOverviewClick}
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all text-left ${
            activeStep === 0 && !guideActive
              ? "bg-pink-500/10 text-pink-300 shadow-2xs"
              : "text-if-muted hover:bg-if-raised hover:text-if-text"
          }`}
        >
          <LayoutDashboard size={15} />
          <span>{OVERVIEW_ITEM.label}</span>
        </button>

        {/* 3. 번호가 붙은 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
        <div className="relative pt-1">
          <p className="text-[10px] font-bold text-if-muted uppercase tracking-wider px-2 mb-2">
            작업 흐름
          </p>
          {FLOW_STEPS.map(({ step, id, label, description, icon: Icon }, index) => {
            const active = activeStep === step && !guideActive;
            return (
              <div
                key={id}
                onClick={() => handleStepClick(step, id)}
                className="group relative flex gap-2.5 pb-2 cursor-pointer transition-all"
              >
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      active
                        ? "bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-2xs ring-2 ring-pink-500/20"
                        : "bg-if-raised text-if-muted group-hover:bg-if-raised"
                    }`}
                  >
                    {step}
                  </span>
                  {index < FLOW_STEPS.length - 1 && (
                    <span className="mt-1 h-5 w-px bg-if-raised" />
                  )}
                </div>
                <div
                  className={`flex-1 rounded-lg px-2 py-1 transition-all ${
                    active ? "bg-pink-500/10" : "group-hover:bg-if-raised"
                  }`}
                >
                  <p
                    className={`flex items-center gap-1.5 text-xs font-bold ${
                      active ? "text-pink-300" : "text-if-text"
                    }`}
                  >
                    <Icon size={13} className={active ? "text-pink-400" : "text-if-muted"} />
                    <span>{label}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-if-muted truncate">
                    {description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. 구분선 아래: 연동 및 유틸리티 */}
        <div className="border-t border-if-border pt-2.5 space-y-1">
          {/* API키등록·플랫폼연동 (정확한 표준 명칭 준수) */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenApiKeyModal?.();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-if-text hover:bg-if-raised hover:text-if-text transition-all text-left"
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
            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all text-left ${
              guideActive ? "bg-pink-500/10 text-pink-300 font-bold" : "text-if-muted hover:bg-if-raised hover:text-if-text"
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
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-if-muted hover:bg-if-raised hover:text-if-text transition-all text-left"
          >
            <Sliders size={14} className="text-amber-400" />
            <span>⚙️ 작업 히스토리</span>
          </button>
        </div>

        {/* 5. 계정 이메일·로그아웃 (2026-10-12 주인님 확정: 마지막 메뉴 바로 아래 8~16px 간격으로 바짝 밀착) */}
        <div className="border-t border-if-border pt-2.5 space-y-1 shrink-0">
          <p
            className="truncate px-2 py-1 text-[11px] text-if-muted font-mono"
            title={userEmail || undefined}
          >
            {userEmail || "로그인 계정"}
          </p>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-if-muted hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
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
      {/* 데스크톱: 표준 고정 좌측 바 (md:w-60 또는 md:w-64) */}
      <aside className="hidden md:flex h-screen w-60 shrink-0 flex-col border-r border-if-border bg-if-surface sticky top-0 z-30 shadow-2xs">
        {renderNavContent()}
      </aside>

      {/* 모바일: 상단 바 + 펼침 드로어 메뉴 */}
      <div className="md:hidden sticky top-0 z-40 border-b border-if-border bg-if-surface px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500 text-white">
            <Sparkles size={14} />
          </div>
          <div>
            <span className="text-xs font-bold text-if-text">{APP_NAME}</span>
            <span className="ml-1 text-[10px] text-pink-400 font-mono font-bold">
              {APP_VERSION}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-if-muted hover:bg-if-raised"
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* 모바일 펼침 메뉴 모달 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex">
          <div className="w-72 bg-if-surface h-full shadow-xl flex flex-col">
            <div className="flex justify-end p-2 border-b border-if-border">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-if-muted hover:bg-if-raised"
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
