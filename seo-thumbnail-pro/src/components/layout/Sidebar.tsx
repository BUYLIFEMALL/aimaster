"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  FileText,
  Sliders,
  Image as ImageIcon,
  KeyRound,
  LogOut,
  Menu,
  X,
  BookOpen,
} from "lucide-react";
import { APP_VERSION, PROGRAM_NAME } from "@/lib/version";

interface SidebarProps {
  userEmail?: string;
  activeStep: number;
  onSelectStep: (step: number) => void;
  onOpenApiKeyModal: () => void;
  onOpenGuideModal: () => void;
}

// 공식 표준 작업 흐름 (docs/SIDEBAR_LAYOUT_STANDARD.md): 번호는 실제 사용 순서와 같다.
const FLOW_STEPS = [
  {
    step: 1,
    label: "기획 및 전략",
    description: "대본 분석 & 3대 A/B 전략",
    icon: FileText,
  },
  {
    step: 2,
    label: "썸네일 상세 설정",
    description: "장르·분위기·피사체 인물",
    icon: Sliders,
  },
  {
    step: 3,
    label: "결과물 & 피드백",
    description: "16:9 고화질 렌더링 & 수정",
    icon: ImageIcon,
  },
];

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-b border-[#222d42] p-5 bg-[#0c0f17]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 text-white shadow-lg shadow-red-500/20">
          <Sparkles size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-[#f8fafc] leading-snug line-clamp-1">
            {PROGRAM_NAME}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20 rounded">
              {APP_VERSION}
            </span>
            <span className="text-[10px] text-amber-400 font-semibold">PRO CANVAS</span>
          </div>
        </div>
      </div>
      <a
        className="mt-3.5 flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors font-medium"
        href="https://www.buylife.xyz/programs"
      >
        <span>← 다른 프로그램 보기</span>
      </a>
    </div>
  );
}

function NavBody({
  userEmail,
  activeStep,
  onSelectStep,
  onOpenApiKeyModal,
  onOpenGuideModal,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 flex flex-col justify-between overflow-y-auto p-3.5 bg-[#0c0f17]">
      {/* 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
      <div className="space-y-1.5">
        <p className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          작업 워크플로우
        </p>
        <div className="relative pt-1">
          {FLOW_STEPS.map(({ step, label, description, icon: Icon }, index) => {
            const active = activeStep === step;
            return (
              <button
                key={step}
                type="button"
                onClick={() => {
                  onSelectStep(step);
                  if (onNavigate) onNavigate();
                }}
                className="w-full group relative flex gap-3 pb-3 text-left transition-all"
              >
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      active
                        ? "bg-gradient-to-br from-red-500 to-amber-500 text-white shadow-md shadow-red-500/30 ring-4 ring-red-500/20"
                        : "bg-[#182030] text-slate-400 group-hover:bg-[#222d42] group-hover:text-slate-200"
                    }`}
                  >
                    {step}
                  </span>
                  {index < FLOW_STEPS.length - 1 && (
                    <span className="mt-1 h-7 w-px bg-[#222d42]" />
                  )}
                </div>
                <div
                  className={`flex-1 rounded-xl px-3 py-2 transition-all ${
                    active
                      ? "bg-[#131824] border border-red-500/40 shadow-sm"
                      : "hover:bg-[#131824]/60 border border-transparent"
                  }`}
                >
                  <p
                    className={`flex items-center gap-1.5 text-xs font-bold ${
                      active ? "text-white" : "text-slate-300"
                    }`}
                  >
                    <Icon size={14} className={active ? "text-red-400" : "text-slate-500"} />
                    <span>{label}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                    {description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 구분선 아래: 매뉴얼 & 연동/유틸리티 */}
        <div className="mt-3 border-t border-[#222d42] pt-3 space-y-1">
          {/* 매뉴얼 메뉴: DESIGN.md 9대 핵심 원칙 필수 구현 */}
          <button
            type="button"
            onClick={() => {
              onOpenGuideModal();
              if (onNavigate) onNavigate();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 hover:bg-[#182030] hover:text-amber-400 transition-colors border border-[#222d42]/40"
          >
            <BookOpen size={15} className="text-amber-400" />
            <span>📖 연동 & 사용 매뉴얼</span>
          </button>

          {/* API 키 연동 */}
          <button
            type="button"
            onClick={() => {
              onOpenApiKeyModal();
              if (onNavigate) onNavigate();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 hover:bg-[#182030] hover:text-red-400 transition-colors border border-[#222d42]/40"
          >
            <KeyRound size={15} className="text-red-400" />
            <span>🔑 API키등록·플랫폼연동</span>
          </button>
        </div>
      </div>

      {/* 하단 고정: 사용자 이메일과 로그아웃 */}
      <div className="mt-6 border-t border-[#222d42] pt-4 space-y-2">
        <div className="px-3 py-2 bg-[#131824] rounded-xl border border-[#222d42]">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">로그인 계정</p>
          <p className="truncate text-xs font-bold text-slate-200" title={userEmail}>
            {userEmail || "회원"}
          </p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
          >
            <LogOut size={14} />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

export function Sidebar({
  userEmail,
  activeStep,
  onSelectStep,
  onOpenApiKeyModal,
  onOpenGuideModal,
}: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 데스크톱: 고정 좌측 바 (md:w-64) */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#222d42] bg-[#0c0f17] md:sticky md:top-0 md:flex select-none z-30">
        <Brand />
        <NavBody
          userEmail={userEmail}
          activeStep={activeStep}
          onSelectStep={onSelectStep}
          onOpenApiKeyModal={onOpenApiKeyModal}
          onOpenGuideModal={onOpenGuideModal}
        />
      </aside>

      {/* 모바일: 상단 바 + 펼침 메뉴 */}
      <div className="md:hidden sticky top-0 z-40 border-b border-[#222d42] bg-[#0c0f17]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 text-white shadow-md">
              <Sparkles size={16} />
            </div>
            <span className="text-sm font-extrabold text-[#f8fafc]">{PROGRAM_NAME}</span>
            <span className="text-[10px] font-mono text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
              {APP_VERSION}
            </span>
          </div>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-300 hover:bg-[#182030]"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <div className="max-h-[85vh] overflow-y-auto border-t border-[#222d42] bg-[#0c0f17]">
            <Brand onNavigate={() => setOpen(false)} />
            <NavBody
              userEmail={userEmail}
              activeStep={activeStep}
              onSelectStep={onSelectStep}
              onOpenApiKeyModal={onOpenApiKeyModal}
              onOpenGuideModal={onOpenGuideModal}
              onNavigate={() => setOpen(false)}
            />
          </div>
        )}
      </div>
    </>
  );
}
