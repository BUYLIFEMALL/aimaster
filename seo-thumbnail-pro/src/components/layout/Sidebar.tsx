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
  ExternalLink,
} from "lucide-react";
import { APP_VERSION, PROGRAM_NAME } from "@/lib/version";

interface SidebarProps {
  userEmail?: string;
  activeStep: number;
  onSelectStep: (step: number) => void;
  onOpenApiKeyModal: () => void;
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
    <div className="border-b border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xs">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
            {PROGRAM_NAME}
          </p>
          <p className="mt-0.5 text-xs text-indigo-600 font-mono font-semibold">
            {APP_VERSION}
          </p>
        </div>
      </div>
      <a
        className="mt-3 flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium"
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
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 flex flex-col justify-between overflow-y-auto p-3">
      {/* 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
      <div className="space-y-1">
        <p className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
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
                        ? "bg-indigo-600 text-white shadow-xs ring-4 ring-indigo-50"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    }`}
                  >
                    {step}
                  </span>
                  {index < FLOW_STEPS.length - 1 && (
                    <span className="mt-1 h-7 w-px bg-slate-200" />
                  )}
                </div>
                <div
                  className={`flex-1 rounded-xl px-2.5 py-1.5 transition-all ${
                    active ? "bg-indigo-50/80 border border-indigo-100" : "group-hover:bg-slate-50"
                  }`}
                >
                  <p
                    className={`flex items-center gap-1.5 text-xs font-bold ${
                      active ? "text-indigo-950" : "text-slate-800"
                    }`}
                  >
                    <Icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} />
                    <span>{label}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 구분선 아래: 연동/유틸리티 (정확한 명칭: 🔑 API키등록·플랫폼연동) */}
        <div className="mt-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => {
              onOpenApiKeyModal();
              if (onNavigate) onNavigate();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            <KeyRound size={15} className="text-indigo-600" />
            <span>🔑 API키등록·플랫폼연동</span>
          </button>
        </div>
      </div>

      {/* 하단 고정: 사용자 이메일과 로그아웃 */}
      <div className="mt-6 border-t border-slate-200 pt-4 space-y-2">
        <div className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">로그인 계정</p>
          <p className="truncate text-xs font-bold text-slate-700" title={userEmail}>
            {userEmail || "회원"}
          </p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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
}: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 데스크톱: 고정 좌측 바 (md:w-60) */}
      <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:sticky md:top-0 md:flex select-none z-30">
        <Brand />
        <NavBody
          userEmail={userEmail}
          activeStep={activeStep}
          onSelectStep={onSelectStep}
          onOpenApiKeyModal={onOpenApiKeyModal}
        />
      </aside>

      {/* 모바일: 상단 바 + 펼침 메뉴 */}
      <div className="md:hidden sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Sparkles size={14} />
            </div>
            <span className="text-sm font-bold text-slate-900">{PROGRAM_NAME}</span>
            <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
              {APP_VERSION}
            </span>
          </div>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <div className="max-h-[85vh] overflow-y-auto border-t border-slate-200 bg-white">
            <Brand onNavigate={() => setOpen(false)} />
            <NavBody
              userEmail={userEmail}
              activeStep={activeStep}
              onSelectStep={onSelectStep}
              onOpenApiKeyModal={onOpenApiKeyModal}
              onNavigate={() => setOpen(false)}
            />
          </div>
        )}
      </div>
    </>
  );
}
