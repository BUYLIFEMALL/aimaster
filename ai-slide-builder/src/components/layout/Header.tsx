"use client";

import React from "react";
import { HelpCircle, Key, Sparkles } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

interface HeaderProps {
  onOpenGuide: () => void;
  onOpenApiKey: () => void;
  hasApiKey: boolean;
  userEmail?: string | null;
}

export default function Header({ onOpenGuide, onOpenApiKey, hasApiKey, userEmail }: HeaderProps) {
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "https://www.buylife.xyz";
    } catch {
      window.location.href = "https://www.buylife.xyz";
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {APP_NAME}
            </span>
          </h1>
          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {APP_VERSION}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          텍스트 및 기획 문서를 분석하여 전문 프레젠테이션 JSON 구성안을 자동 생성하고 슬라이드별로 편집하세요.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenApiKey}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            hasApiKey
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 animate-pulse"
          }`}
        >
          <Key size={13} />
          <span>{hasApiKey ? "Gemini 연동됨" : "API 키 등록 필요"}</span>
        </button>

        <button
          type="button"
          onClick={onOpenGuide}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition shadow-2xs"
        >
          <HelpCircle size={14} className="text-blue-600" />
          <span>도움말</span>
        </button>

        {/* 상단 로그인 계정 정보 및 로그아웃 버튼 */}
        <div className="h-4 w-px bg-slate-200 mx-1" />

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-semibold text-slate-800 max-w-[140px] truncate" title={userEmail || "회원"}>
            {userEmail || "회원"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          title="로그아웃"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition"
        >
          <span>로그아웃</span>
        </button>
      </div>
    </header>
  );
}
