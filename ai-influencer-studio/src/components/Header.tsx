"use client";

import { Sparkles, Key, HelpCircle, History, ExternalLink, ShieldCheck } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

interface HeaderProps {
  userEmail?: string | null;
  hasApiKey: boolean;
  historyCount: number;
  onOpenApiKeyModal: () => void;
  onOpenHelpModal: () => void;
  onOpenHistory: () => void;
}

export function Header({
  userEmail,
  hasApiKey,
  historyCount,
  onOpenApiKeyModal,
  onOpenHelpModal,
  onOpenHistory,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#141721]/95 backdrop-blur-md border-b border-[#282e42] px-4 lg:px-6 py-3 flex items-center justify-between shadow-lg">
      {/* 좌측 로고 & 타이틀 */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20 border border-rose-400/30">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-base md:text-lg text-slate-100 tracking-tight">
              {APP_NAME}
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/40">
              {APP_VERSION} VOGUE EDITORIAL
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-400">
            초현실적 가상 인플루언서 화보 & 인스타 캡션 자동 생성 스튜디오
          </p>
        </div>
      </div>

      {/* 우측 도구 및 계정 메뉴 */}
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
        {/* 히스토리 버튼 */}
        <button
          onClick={onOpenHistory}
          className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-[#1c202e] hover:bg-[#252b3d] border border-[#282e42] rounded-lg transition-colors cursor-pointer"
          title="작업 히스토리 보관함"
        >
          <History className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">히스토리</span>
          {historyCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
              {historyCount}
            </span>
          )}
        </button>

        {/* 도움말 버튼 */}
        <button
          onClick={onOpenHelpModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-[#1c202e] hover:bg-[#252b3d] border border-[#282e42] rounded-lg transition-colors cursor-pointer"
          title="사용 가이드 & 팁"
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">가이드</span>
        </button>

        {/* API 키 설정 버튼 */}
        <button
          onClick={onOpenApiKeyModal}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
            hasApiKey
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25"
              : "bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30 animate-pulse"
          }`}
          title="본인 Google Gemini API 키 설정"
        >
          <Key className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{hasApiKey ? "API 키 연동됨" : "API 키 등록 필요"}</span>
          <span className="sm:hidden">API 키</span>
        </button>

        {/* 메인 사이트 이동 */}
        <a
          href="https://www.buylife.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-300 transition-colors"
        >
          <span>AIMaster</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        {/* 회원 이메일 표시 */}
        {userEmail && (
          <div className="hidden xl:flex items-center gap-1.5 pl-2 border-l border-[#282e42] text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="max-w-[130px] truncate font-medium text-slate-300">{userEmail}</span>
          </div>
        )}
      </div>
    </header>
  );
}
