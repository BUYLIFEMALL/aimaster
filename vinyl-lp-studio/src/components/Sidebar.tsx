"use client";

// AIMaster 표준 좌측 사이드바 — 바이닐 다크 레트로 콘솔 스타일 (2026-10-17 v1.08 agy 리뉴얼)
// 딥 옵시디언 나이트(#0c0d12) 베이스 + 바이닐 골드/앰버 포인트 + 📖 연동 & 사용 매뉴얼 표준 탑재.
import { useState } from "react";
import Link from "next/link";
import {
  Disc,
  LayoutDashboard,
  Music,
  Palette,
  Gauge,
  Film,
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
  activeView?: "studio" | "guide";
  onSelectStep?: (step: number) => void;
  onOpenApiKeyModal?: () => void;
  onOpenGuide?: () => void;
  onOpenHelpModal?: () => void;
  onOpenHistory?: () => void;
}

const OVERVIEW_ITEM = { id: 0, label: "대시보드", icon: LayoutDashboard };
const FLOW_STEPS = [
  {
    step: 1,
    id: "step-1-metadata",
    label: "미디어 & 메타데이터",
    description: "LP/CD 선택 · 앨범명 · 아티스트",
    icon: Music,
  },
  {
    step: 2,
    id: "step-2-artwork",
    label: "비주얼 아트워크",
    description: "스타일 프롬프트 · AI 추천 · 업로드",
    icon: Palette,
  },
  {
    step: 3,
    id: "step-3-turntable",
    label: "턴테이블 & RPM",
    description: "재생 속도 설정 · 실시간 회전",
    icon: Gauge,
  },
  {
    step: 4,
    id: "step-4-export",
    label: "애니메이션 내보내기",
    description: "60fps MP4 비디오 · 루프 GIF",
    icon: Film,
  },
];

export function Sidebar({
  userEmail,
  activeStep = 1,
  activeView = "studio",
  onSelectStep,
  onOpenApiKeyModal,
  onOpenGuide,
  onOpenHelpModal,
  onOpenHistory,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleStepClick = (stepNum: number, elementId: string) => {
    if (onSelectStep) onSelectStep(stepNum);
    setMobileOpen(false);
    const target = document.getElementById(elementId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleOverviewClick = () => {
    if (onSelectStep) onSelectStep(0);
    setMobileOpen(false);
    const firstStep = document.getElementById("step-1-metadata");
    if (firstStep) {
      firstStep.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const renderNavContent = () => (
    <div className="flex flex-col min-h-0 shrink select-none bg-[#0c0d12]">
      {/* 1. 프로그램명 & 버전 & 다른 프로그램 보기 */}
      <div className="border-b border-[#272b3f] p-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg shadow-amber-500/20 ring-1 ring-white/10">
            <Disc size={18} className="animate-spin-disc" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white leading-snug truncate">
              {APP_NAME}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 font-mono">
                {APP_VERSION}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Retro Studio</span>
            </div>
          </div>
        </div>
        <a
          className="mt-3 block text-[11px] text-slate-400 hover:text-amber-400 transition-colors font-medium"
          href="https://www.buylife.xyz/programs"
        >
          ← 다른 프로그램 보기
        </a>
      </div>

      {/* 2. 네비게이션 메뉴 본문 (내부 스크롤) */}
      <div className="overflow-y-auto p-3 space-y-3 min-h-0 shrink">
        {/* 대시보드 진입점 */}
        <button
          type="button"
          onClick={handleOverviewClick}
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all text-left ${
            activeStep === 0
              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
              : "text-slate-300 hover:bg-[#141620] hover:text-white"
          }`}
        >
          <LayoutDashboard size={15} className={activeStep === 0 ? "text-amber-400" : "text-slate-400"} />
          <span>{OVERVIEW_ITEM.label}</span>
        </button>

        {/* 3. 번호가 붙은 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
        <div className="relative pt-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">
            작업 흐름 (Workflow)
          </p>
          {FLOW_STEPS.map(({ step, id, label, description, icon: Icon }, index) => {
            const active = activeStep === step;
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
                        ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-500/40"
                        : "bg-[#1b1e2c] border border-[#272b3f] text-slate-400 group-hover:bg-[#272b3f] group-hover:text-white"
                    }`}
                  >
                    {step}
                  </span>
                  {index < FLOW_STEPS.length - 1 && (
                    <span className="mt-1 h-5 w-px bg-[#272b3f]" />
                  )}
                </div>
                <div
                  className={`flex-1 rounded-lg px-2 py-1 transition-all ${
                    active ? "bg-amber-500/10 border border-amber-500/20" : "group-hover:bg-[#141620]"
                  }`}
                >
                  <p
                    className={`flex items-center gap-1.5 text-xs font-bold ${
                      active ? "text-amber-300" : "text-slate-200"
                    }`}
                  >
                    <Icon size={13} className={active ? "text-amber-400" : "text-slate-400"} />
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
        <div className="border-t border-[#272b3f] pt-2.5 space-y-1">
          {/* API키등록·플랫폼연동 (정확한 표준 명칭 준수) */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenApiKeyModal?.();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-[#141620] hover:text-white transition-all text-left"
          >
            <KeyRound size={14} className="text-emerald-400" />
            <span className="font-bold">🔑 API키등록·플랫폼연동</span>
          </button>

          {/* 📖 연동 & 사용 매뉴얼 (최상단 공통 지침 필수 메뉴) */}
          {onOpenGuide ? (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenGuide();
              }}
              className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all text-left ${
                activeView === "guide" || activeStep === 99
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                  : "text-slate-300 hover:bg-[#141620] hover:text-white"
              }`}
            >
              <BookOpen size={14} className={activeView === "guide" || activeStep === 99 ? "text-amber-400" : "text-slate-400"} />
              <span>📖 연동 & 사용 매뉴얼</span>
            </button>
          ) : (
            <Link
              href="/guide"
              onClick={() => setMobileOpen(false)}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-[#141620] hover:text-white transition-all text-left"
            >
              <BookOpen size={14} className="text-amber-400" />
              <span>📖 연동 & 사용 매뉴얼</span>
            </Link>
          )}

          {/* 작업 히스토리 */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenHistory?.();
            }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-[#141620] hover:text-slate-200 transition-all text-left"
          >
            <Sliders size={14} className="text-orange-400" />
            <span>⚙️ 작업 히스토리</span>
          </button>
        </div>

        {/* 5. 계정 이메일·로그아웃 (마지막 메뉴 바로 아래 8~16px 간격으로 바짝 밀착) */}
        <div className="border-t border-[#272b3f] pt-2.5 space-y-1 shrink-0">
          <p
            className="truncate px-2 py-1 text-[11px] text-slate-500 font-mono"
            title={userEmail || undefined}
          >
            {userEmail || "로그인 계정"}
          </p>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
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
      <aside className="hidden md:flex h-screen w-60 shrink-0 flex-col border-r border-[#272b3f] bg-[#0c0d12] sticky top-0 z-30 shadow-xl">
        {renderNavContent()}
      </aside>

      {/* 모바일: 상단 바 + 펼침 드로어 메뉴 */}
      <div className="md:hidden sticky top-0 z-40 border-b border-[#272b3f] bg-[#0c0d12] px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white">
            <Disc size={14} />
          </div>
          <div>
            <span className="text-xs font-bold text-white">{APP_NAME}</span>
            <span className="ml-1 text-[10px] text-amber-400 font-mono font-bold">
              {APP_VERSION}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-[#141620] hover:text-white"
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* 모바일 펼침 메뉴 드로어 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex">
          <div className="w-72 bg-[#0c0d12] border-r border-[#272b3f] h-full shadow-2xl flex flex-col">
            <div className="flex justify-end p-2 border-b border-[#272b3f]">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-[#141620] hover:text-white"
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
