"use client";

import React from "react";
import Link from "next/link";
import { KeyRound, Sparkles, CheckCircle, ExternalLink } from "lucide-react";
import { PROGRAM_NAME } from "@/lib/version";

interface HeaderProps {
  hasApiKey?: boolean;
  userEmail?: string;
  onOpenAiGenerator?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ hasApiKey = false, userEmail = "buylifemall@naver.com", onOpenAiGenerator }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-slate-800">
          {PROGRAM_NAME}
        </h1>
        <span className="hidden sm:inline-block text-xs text-slate-400">
          | React 19 & Tailwind CSS 기반 웹 UI 자동 생성 & 컴포넌트 라이브러리
        </span>
      </div>

      <div className="flex items-center gap-3">
        {onOpenAiGenerator && (
          <button
            onClick={onOpenAiGenerator}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI 컴포넌트 생성기
          </button>
        )}

        {hasApiKey ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Gemini API 연동됨
          </div>
        ) : (
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-2.5 py-1 rounded-full font-medium transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            API 키 등록 필요
          </Link>
        )}

        <div className="h-4 w-px bg-slate-200 mx-1"></div>

        <Link
          href="https://ai.google.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
        >
          Google AI
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </header>
  );
};
