"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Sparkles,
  Mic,
  Music,
  Cpu,
  LogOut,
  Menu,
  X,
  BookOpen,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { AnalysisMode } from "@/lib/types";

interface SidebarProps {
  userEmail?: string | null;
  selectedMode: AnalysisMode;
  onSelectMode: (mode: AnalysisMode) => void;
  onOpenApiKey: () => void;
  onOpenGuide?: () => void;
  hasResult?: boolean;
}

const FLOW_STEPS = [
  {
    step: 1,
    label: "오디오 파일 등록",
    description: "WAV, MP3, M4A, FLAC 등 음원 업로드",
  },
  {
    step: 2,
    label: "Gemini 멀티모달 분석",
    description: "화자 분리, 포렌식, 4대 스템, Suno 역설계",
  },
  {
    step: 3,
    label: "회의록 & 프롬프트 추출",
    description: "마크다운 회의록 및 프롬프트 원클릭 복사",
  },
];

export default function Sidebar({
  userEmail,
  selectedMode,
  onSelectMode,
  onOpenApiKey,
  onOpenGuide,
  hasResult = false,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "https://www.buylife.xyz";
    } catch {
      window.location.href = "https://www.buylife.xyz";
    }
  };

  const isGuidePage = pathname === "/guide";

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      <div className="min-h-0 shrink overflow-y-auto custom-scrollbar p-3.5 space-y-4">
        {/* 1. 브랜드 헤더 & 버전 */}
        <div className="pb-3 border-b border-[#1a2333]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00f0ff]/20 to-[#7000ff]/20 border border-[#00f0ff]/40 flex items-center justify-center text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.25)] shrink-0">
              <Activity size={18} className="animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-white text-sm tracking-tight leading-tight truncate">
                  {APP_NAME}
                </h1>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-block rounded-full bg-[#00f0ff]/10 px-2 py-0.5 text-[10px] font-mono font-bold text-[#00f0ff] border border-[#00f0ff]/30">
                  {APP_VERSION} AUDIO LAB
                </span>
              </div>
            </div>
          </div>
          <a
            href="https://www.buylife.xyz/programs"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#00f0ff] transition-colors font-medium px-1.5 py-0.5 rounded hover:bg-slate-800/50"
          >
            <span>←</span>
            <span>다른 프로그램 보기</span>
          </a>
        </div>

        {/* 2. 분석 엔진 모드 선택 */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 px-1 mb-1.5 uppercase tracking-wider font-mono">
            ENGINE MODE
          </p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onSelectMode("auto");
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedMode === "auto" && !isGuidePage
                  ? "bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
              }`}
            >
              <Sparkles size={14} className={selectedMode === "auto" ? "text-[#00f0ff]" : "text-slate-400"} />
              <span className="flex-1 text-left">스마트 자동 판별</span>
              <span className="text-[10px] bg-[#00f0ff]/20 text-[#00f0ff] px-1.5 py-0.5 rounded-full font-bold">
                AI Auto
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectMode("speech");
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedMode === "speech" && !isGuidePage
                  ? "bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
              }`}
            >
              <Mic size={14} className={selectedMode === "speech" ? "text-[#00f0ff]" : "text-slate-400"} />
              <span className="flex-1 text-left">음성 인텔리전스 · 회의록</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectMode("music");
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedMode === "music" && !isGuidePage
                  ? "bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
              }`}
            >
              <Music size={14} className={selectedMode === "music" ? "text-[#00f0ff]" : "text-slate-400"} />
              <span className="flex-1 text-left">음악 분석 · Suno v5</span>
            </button>
          </div>
        </div>

        {/* 3. 작업 워크플로우 */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 px-1 mb-2 uppercase tracking-wider font-mono">
            WORKFLOW
          </p>
          <div className="relative pl-1">
            {FLOW_STEPS.map((item, idx) => {
              const isLast = idx === FLOW_STEPS.length - 1;
              return (
                <div key={item.step} className="group relative flex gap-2.5 pb-2.5">
                  <div className="flex flex-col items-center">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold font-mono bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
                      {item.step}
                    </span>
                    {!isLast && <span className="mt-1 w-px flex-1 bg-slate-800" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-200 leading-tight">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 나노 단위 오디오 해체 안내 카드 */}
          <div className="mt-1.5 p-2.5 rounded-xl bg-gradient-to-br from-[#0c1324] to-[#070b14] border border-[#00f0ff]/20 text-slate-300">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#00f0ff] mb-1">
              <Cpu size={13} className="text-[#00f0ff]" />
              <span>나노 단위 오디오 해체</span>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              고주파 포렌식부터 화자별 점유율, 회의록 및 Suno v5 역설계까지 원클릭 제공합니다.
            </p>
          </div>
        </div>

        {/* 4. 유틸리티 메뉴 */}
        <div className="pt-2 border-t border-[#1a2333] space-y-1">
          <p className="text-[10px] font-bold text-slate-400 px-1 mb-1.5 uppercase tracking-wider font-mono">
            GUIDE & SETTINGS
          </p>

          <Link
            href="/guide"
            onClick={() => setMobileOpen(false)}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              isGuidePage
                ? "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen size={14} className={isGuidePage ? "text-[#f59e0b]" : "text-amber-400"} />
              <span>📖 연동 & 사용 매뉴얼</span>
            </div>
            <span className="rounded bg-[#f59e0b]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#f59e0b] border border-[#f59e0b]/30">
              GUIDE
            </span>
          </Link>

          <button
            type="button"
            onClick={() => {
              onOpenApiKey();
              setMobileOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all border border-transparent"
          >
            <KeyRound size={14} className="text-cyan-400" />
            <span>🔑 API키등록·플랫폼연동</span>
          </button>
        </div>
      </div>

      {/* 5. 사용자 계정 및 로그아웃 */}
      <div className="border-t border-[#1a2333] p-3 bg-[#080d19]/80 flex items-center justify-between">
        <div className="truncate max-w-[155px]">
          <p className="text-[10px] text-slate-400 font-medium">로그인 계정</p>
          <p className="text-xs text-slate-200 font-bold truncate" title={userEmail || "회원"}>
            {userEmail || "회원"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="로그아웃"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 데스크톱 사이드바 */}
      <aside className="hidden md:flex w-64 bg-[#0a0e19] border-r border-[#1a2333] flex-col h-screen shrink-0">
        {sidebarContent}
      </aside>

      {/* 모바일 햄버거 헤더 바 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0a0e19] border-b border-[#1a2333] z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00f0ff]/20 border border-[#00f0ff]/40 flex items-center justify-center text-[#00f0ff]">
            <Activity size={15} />
          </div>
          <span className="font-bold text-sm text-white truncate">{APP_NAME}</span>
          <span className="rounded bg-[#00f0ff]/10 px-1.5 py-0.5 text-[9px] font-mono text-[#00f0ff] border border-[#00f0ff]/30">
            {APP_VERSION}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          aria-label="메뉴 열기"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 모바일 드로어 메뉴 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex">
          <div className="w-72 bg-[#0a0e19] border-r border-[#1a2333] h-full flex flex-col pt-14">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
