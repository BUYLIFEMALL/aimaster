"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Key,
  HelpCircle,
  LogOut,
  Mic,
  Music,
  Sparkles,
  FileText,
  Activity,
  Compass,
  Cpu,
} from "lucide-react";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { AnalysisMode } from "@/lib/types";

interface SidebarProps {
  userEmail?: string | null;
  selectedMode: AnalysisMode;
  onSelectMode: (mode: AnalysisMode) => void;
  onOpenApiKey: () => void;
  onOpenGuide: () => void;
  hasResult?: boolean;
}

export default function Sidebar({
  userEmail,
  selectedMode,
  onSelectMode,
  onOpenApiKey,
  onOpenGuide,
  hasResult = false,
}: SidebarProps) {
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "https://www.buylife.xyz";
    } catch {
      window.location.href = "https://www.buylife.xyz";
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 select-none">
      {/* 1. 상단 링크: 다른 프로그램 보기 */}
      <div className="p-3 border-b border-slate-100">
        <Link
          href="https://www.buylife.xyz/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 font-medium"
        >
          <ArrowLeft size={13} />
          <span>다른 프로그램 보기</span>
        </Link>
      </div>

      {/* 2. 타이틀 & 버전 */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Activity size={18} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm tracking-tight leading-tight">
              {APP_NAME}
            </h1>
            <p className="text-[11px] font-semibold text-indigo-600 font-mono">
              {APP_VERSION}
            </p>
          </div>
        </div>
      </div>

      {/* 3. 분석 모드 선택 */}
      <div className="p-3 border-b border-slate-100">
        <p className="text-[11px] font-bold text-slate-400 px-2 mb-2 uppercase tracking-wider">
          분석 엔진 모드
        </p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onSelectMode("auto")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              selectedMode === "auto"
                ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80 shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Sparkles size={15} className={selectedMode === "auto" ? "text-indigo-600" : "text-slate-400"} />
            <span className="flex-1 text-left">스마트 자동 판별</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">
              추천
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode("speech")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              selectedMode === "speech"
                ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80 shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Mic size={15} className={selectedMode === "speech" ? "text-indigo-600" : "text-slate-400"} />
            <span className="flex-1 text-left">음성 인텔리전스 · 회의록</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode("music")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              selectedMode === "music"
                ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80 shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Music size={15} className={selectedMode === "music" ? "text-indigo-600" : "text-slate-400"} />
            <span className="flex-1 text-left">음악 분석 · Suno v5 역설계</span>
          </button>
        </div>
      </div>

      {/* 4. 번호형 3단계 워크플로우 안내 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        <p className="text-[11px] font-bold text-slate-400 px-2 mb-2 uppercase tracking-wider">
          작업 워크플로우
        </p>
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                1
              </span>
              <span>오디오 파일 등록</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
              mp3, wav, m4a 등 음성 또는 음악 음원을 드래그 앤 드롭 업로드
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Gemini 멀티모달 분석</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
              화자 분리, 감정, 포렌식, 4대 스템, 채보 및 Suno v5 프롬프트 추출
            </p>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                3
              </span>
              <span>리포트 및 문서 생성</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
              회의록/인터뷰 문서 자동 생성 마크다운 복사 및 프롬프트 원클릭 복사
            </p>
          </div>
        </div>

        {/* 안내 카드 */}
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-100 text-slate-700">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-1">
            <Cpu size={14} className="text-indigo-600" />
            <span>나노 단위 오디오 해체</span>
          </div>
          <p className="text-[11px] text-indigo-950/80 leading-relaxed">
            고주파 절단면 포렌식부터 화자별 대화 점유율, 회의록 의결사항까지 전문가 수준의 분석을 원클릭으로 제공합니다.
          </p>
        </div>
      </div>

      {/* 5. 하단 유틸리티 및 계정 */}
      <div className="p-3 border-t border-slate-100 space-y-1 bg-slate-50/40">
        <button
          type="button"
          onClick={onOpenApiKey}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <Key size={14} className="text-amber-500" />
          <span>🔑 API키등록·플랫폼연동</span>
        </button>

        <button
          type="button"
          onClick={onOpenGuide}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <HelpCircle size={14} className="text-blue-500" />
          <span>💡 사용 가이드</span>
        </button>

        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between px-1">
          <div className="truncate max-w-[150px]">
            <p className="text-[10px] text-slate-400 font-medium">로그인 계정</p>
            <p className="text-xs text-slate-700 font-bold truncate">
              {userEmail || "회원"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="로그아웃"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
