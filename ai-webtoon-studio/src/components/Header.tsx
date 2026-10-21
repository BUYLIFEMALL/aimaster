"use client";

import {
  Sparkles,
  Download,
  FileArchive,
} from "lucide-react";

interface HeaderProps {
  /** 회원 본인 Gemini 키 등록 여부(v1.27 — 키 원문은 서버에만) */
  hasApiKey: boolean;
  onDownloadZip: () => void;
  onDownloadMergedJpg: () => void;
  onOpenMobileNav?: () => void;
  hasCutsToDownload?: boolean;
}

export function Header({
  hasApiKey,
  onDownloadZip,
  onDownloadMergedJpg,
  onOpenMobileNav,
}: HeaderProps) {
  return (
    <header className="bg-[#121620] border-b border-[#232b3e] shadow-sm sticky top-0 z-10">
      {/* Top Main Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Mobile Menu Button + Marketing Slogan */}
        <div className="flex items-center gap-3">
          {onOpenMobileNav && (
            <button
              type="button"
              onClick={onOpenMobileNav}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-[#181d2a] hover:text-white md:hidden cursor-pointer"
              aria-label="사이드 메뉴 열기"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* 마케팅 슬로건 문구 */}
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-xs shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm sm:text-[15px] font-bold text-slate-200 tracking-tight">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300 bg-clip-text text-transparent font-black">
                AI와 함께
              </span>{" "}
              시놉시스부터 캐릭터 시트, 세로 스크롤 완성 원고까지 한 곳에서 완성하세요.
            </p>
          </div>
        </div>

        {/* Right: API 상태 및 일괄 저장 액션 버튼 */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <div className="hidden sm:block text-[11px]" role="status">
            {hasApiKey ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Gemini API 연동 완료 (브라우저 격리 보관)
              </span>
            ) : (
              <span className="text-amber-400 font-medium flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                ⚠️ 좌측 [API키등록·플랫폼연동] 메뉴에서 본인 Gemini API 키를 등록해주세요
              </span>
            )}
          </div>

          {/* Quick Action: ZIP 일괄 저장 */}
          <button
            type="button"
            onClick={onDownloadZip}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-400 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition shadow-sm cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            title="모든 컷 이미지를 ZIP으로 일괄 압축 다운로드"
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>이미지 일괄 저장 (.zip)</span>
          </button>

          {/* Quick Action: 전체 이어붙여 저장 (JPG) */}
          <button
            type="button"
            onClick={onDownloadMergedJpg}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-400 text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition shadow-sm cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            title="모든 컷을 세로 롱스크롤 웹툰 단일 이미지로 합성 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
            <span>전체 이어붙여 저장 (JPG)</span>
          </button>
        </div>
      </div>
    </header>
  );
}
