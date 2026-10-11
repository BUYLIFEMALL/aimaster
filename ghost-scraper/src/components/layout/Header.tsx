"use client";

import React from "react";
import { HelpCircle, Settings, Menu, Globe, ShieldCheck } from "lucide-react";
import { AppSettings } from "@/lib/types";

interface HeaderProps {
  settings: AppSettings;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onOpenMobileNav: () => void;
}

export function Header({
  settings,
  onOpenHelp,
  onOpenSettings,
  onOpenMobileNav,
}: HeaderProps) {
  const hasKey = Boolean(settings.geminiApiKey?.trim());

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700 tracking-tight">
            시스템 온라인
          </span>
          <span className="hidden sm:inline-flex text-[10px] text-slate-400 font-mono">
            · AI 웹 데이터 추출기
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* API 키 상태 칩 */}
        <button
          type="button"
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer ${
            hasKey
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
          }`}
          title="Gemini API 키 설정 상태"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{hasKey ? "Gemini 연동 완료" : "API 키 등록 필요"}</span>
        </button>

        {/* 도움말 버튼 */}
        <button
          type="button"
          onClick={onOpenHelp}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          title="상세 사용 매뉴얼 (가이드)"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* 설정 버튼 */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          title="API 키 및 환경설정"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
