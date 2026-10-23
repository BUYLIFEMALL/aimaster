"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Download, Menu } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

interface HeaderProps {
  userEmail: string;
  onOpenMobileNav?: () => void;
}

export function Header({ userEmail, onOpenMobileNav }: HeaderProps) {
  return (
    <header className="flex md:hidden items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile Hamburger Button + Logo */}
      <div className="flex items-center gap-2.5">
        {onOpenMobileNav && (
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="사이드 메뉴 열기"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-black text-xs shadow-xs">
            N
          </span>
          <span className="text-sm font-black text-slate-900 tracking-tight">
            네이버 블로그 에이전트
          </span>
          <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
            {APP_VERSION}
          </span>
        </div>
      </div>

      {/* Right: Chrome Extension Download Badge */}
      <div className="flex items-center gap-2">
        <a
          href="/downloads/naver-blog-agent-extension-latest.zip"
          download="naver-blog-agent-extension-latest.zip"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-400 border border-amber-500 text-slate-900 shadow-2xs active:scale-95 transition-transform"
          title="네이버 스마트에디터 ONE 자동 발행 전용 크롬 확장 다운로드"
        >
          <Download className="w-3 h-3 text-slate-900" />
          <span>확장 ZIP</span>
        </a>
      </div>
    </header>
  );
}
