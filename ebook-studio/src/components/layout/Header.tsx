"use client";

import React from "react";
import { Menu, ExternalLink, Download, KeyRound, HelpCircle, Eye, Sparkles } from "lucide-react";
import { EbookProject } from "@/lib/types";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onPreviewFull: () => void;
  onQuickDownloadHtml: () => void;
  project: EbookProject;
  hasApiKey: boolean;
}

export function Header({
  onOpenMobileSidebar,
  onOpenSettings,
  onOpenHelp,
  onPreviewFull,
  onQuickDownloadHtml,
  project,
  hasApiKey,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden"
          aria-label="사이드바 열기"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-800 tracking-tight">
            {project.title || "새 전자책 프로젝트"}
          </span>
          {project.subtitle && (
            <span className="hidden sm:inline text-xs text-slate-400">
              — {project.subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* API 키 상태 뱃지 */}
        <button
          type="button"
          onClick={onOpenSettings}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
            hasApiKey
              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70"
              : "bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100/70"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              hasApiKey ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
            }`}
          />
          <span>{hasApiKey ? "Gemini 준비됨" : "API 키 필요"}</span>
        </button>

        {/* 새 탭에서 읽기 (전체화면) */}
        <button
          type="button"
          onClick={onPreviewFull}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-2xs"
          title="독립 브라우저 창에서 전체화면으로 읽기"
        >
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">전체화면 읽기</span>
        </button>

        {/* 단일 HTML 빠른 받기 */}
        <button
          type="button"
          onClick={onQuickDownloadHtml}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs shadow-indigo-100"
          title="독립형 단일 HTML 파일로 즉시 다운로드"
        >
          <Download className="w-3.5 h-3.5" />
          <span>HTML 받기</span>
        </button>
      </div>
    </header>
  );
}
