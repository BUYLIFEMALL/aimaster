"use client";

import React, { useState } from "react";
import {
  Menu,
  ExternalLink,
  Download,
  KeyRound,
  HelpCircle,
  Eye,
  Sparkles,
  BookOpen,
  FilePlus,
  Archive,
  BookMarked,
} from "lucide-react";
import { EbookProject } from "@/lib/types";
import { buildStandaloneHtml, buildWebDeployZip, buildEpubBlob } from "@/lib/template";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onPreviewFull: () => void;
  onQuickDownloadHtml: () => void;
  onLoadSample: () => void;
  onNewProject: () => void;
  project: EbookProject;
  hasApiKey: boolean;
}

export function Header({
  onOpenMobileSidebar,
  onOpenSettings,
  onOpenHelp,
  onPreviewFull,
  onQuickDownloadHtml,
  onLoadSample,
  onNewProject,
  project,
  hasApiKey,
}: HeaderProps) {
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isDownloadingEpub, setIsDownloadingEpub] = useState(false);

  // EPUB 다운로드
  const handleDownloadEpub = async () => {
    setIsDownloadingEpub(true);
    try {
      const epubBlob = await buildEpubBlob(project);
      const url = URL.createObjectURL(epubBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(project.title || "ebook").replace(/[\\/:*?"<>|\n]/g, " ").trim()}.epub`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error("EPUB export failed:", e);
    } finally {
      setIsDownloadingEpub(false);
    }
  };

  // 웹 배포용 ZIP 다운로드
  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      const zipBlob = await buildWebDeployZip(project);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(project.title || "ebook").replace(/[\\/:*?"<>|\n]/g, " ").trim()} — 웹 배포용.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error("ZIP export failed:", e);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4">
      {/* 좌측 로고 및 프로젝트명 */}
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
          <span className="text-xs font-black text-slate-900 tracking-tight">
            eBook Studio
          </span>
          <span className="text-slate-300 font-light">/</span>
          <span className="text-xs font-bold text-slate-700 truncate max-w-[140px] sm:max-w-[240px]">
            {project.title || "새 전자책 프로젝트"}
          </span>
        </div>
      </div>

      {/* 중앙 빠른 액션: 예시 살펴보기, 새 프로젝트, 이용 가이드 */}
      <div className="hidden lg:flex items-center gap-1.5">
        <button
          type="button"
          onClick={onLoadSample}
          className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 flex items-center gap-1.5 transition"
        >
          <BookMarked className="w-3.5 h-3.5 text-indigo-500" />
          <span>예시 살펴보기</span>
        </button>
        <button
          type="button"
          onClick={onNewProject}
          className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 flex items-center gap-1.5 transition"
        >
          <FilePlus className="w-3.5 h-3.5 text-slate-400" />
          <span>새 프로젝트</span>
        </button>
        <button
          type="button"
          onClick={onOpenHelp}
          className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 flex items-center gap-1.5 transition"
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>이용 가이드</span>
        </button>
      </div>

      {/* 우측 내보내기 & API 설정 단추 */}
      <div className="flex items-center gap-2">
        {/* API 키 상태 뱃지 */}
        <button
          type="button"
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
            hasApiKey
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              hasApiKey ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
            }`}
          />
          <span className="hidden sm:inline">
            {hasApiKey ? "Gemini 준비됨" : "API 키 등록"}
          </span>
          <span className="sm:hidden">API</span>
        </button>

        {/* 내보내기 3종: HTML, EPUB, 웹 배포용 */}
        <button
          type="button"
          onClick={onQuickDownloadHtml}
          className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition hidden sm:inline-flex"
          title="독립형 단일 HTML 파일로 즉시 다운로드"
        >
          HTML
        </button>

        <button
          type="button"
          onClick={handleDownloadEpub}
          disabled={isDownloadingEpub}
          className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition hidden md:inline-flex disabled:opacity-50"
          title="모바일 리더기 호환 EPUB 다운로드"
        >
          EPUB
        </button>

        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={isDownloadingZip}
          className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition hidden sm:inline-flex disabled:opacity-50"
          title="Vercel Drop 업로드용 ZIP 번들 다운로드"
        >
          웹 배포용
        </button>

        {/* 전체화면 확대 읽기 */}
        <button
          type="button"
          onClick={onPreviewFull}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-2xs"
          title="독립 브라우저 창에서 크게 보기"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">전체화면</span>
        </button>
      </div>
    </header>
  );
}
