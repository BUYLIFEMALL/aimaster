"use client";

import React from "react";
import Link from "next/link";
import { HelpCircle, Settings, Menu, ShieldCheck } from "lucide-react";
import { AppSettings } from "@/lib/types";
import { APP_NAME } from "@/lib/version";

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenMobileNav: () => void;
}

export function Header({ settings, onOpenSettings, onOpenMobileNav }: HeaderProps) {
  const hasKey = Boolean(settings.geminiApiKey?.trim());

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-mx-border bg-mx-surface/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-mx-border text-mx-text md:hidden"
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-mx-success" />
          <span className="text-sm font-bold tracking-tight text-mx-text md:hidden">{APP_NAME}</span>
          <span className="hidden text-sm font-bold tracking-tight text-mx-text md:inline">시스템 온라인</span>
          <span className="hidden font-mono text-xs text-mx-muted sm:inline">· AI 웹 데이터 추출기</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* API 키 상태 칩 */}
        <button
          type="button"
          onClick={onOpenSettings}
          className={`${hasKey ? "mx-chip-green" : "mx-chip-amber"} min-h-[36px] cursor-pointer`}
          title="Gemini API 키 설정 상태"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{hasKey ? "Gemini 연동 완료" : "API 키 등록 필요"}</span>
          <span className="sm:hidden">{hasKey ? "연동됨" : "키 필요"}</span>
        </button>

        <Link
          href="/guide"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-mx-muted hover:bg-mx-raised hover:text-mx-text"
          title="연동 & 사용 매뉴얼"
          aria-label="연동 & 사용 매뉴얼"
        >
          <HelpCircle className="h-5 w-5" />
        </Link>

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-mx-muted hover:bg-mx-raised hover:text-mx-text"
          title="API 키 및 환경설정"
          aria-label="API 키 및 환경설정"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
