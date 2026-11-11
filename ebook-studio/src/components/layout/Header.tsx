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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#272B38] bg-[#141720] px-4 text-[#E2E8F0]">
      {/* 좌측 로고 및 프로젝트명 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1E2433] hover:text-white md:hidden"
          aria-label="사이드바 열기"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#D97706] to-[#78350F] text-xs font-black text-white shadow-xs">
            📖
          </span>
          <span className="text-xs font-black text-white tracking-tight">
            eBook Studio
          </span>
          <span className="text-slate-600 font-light">/</span>
          <span className="text-xs font-bold text-[#FBBF24] truncate max-w-[140px] sm:max-w-[240px]">
            {project.title || "새 전자책 프로젝트"}
          </span>
        </div>
      </div>

      {/* 중앙 빠른 액션: 예시 살펴보기, 새 프로젝트, 이용 가이드 */}
      <div className="hidden lg:flex items-center gap-1.5">
        <button
          type="button"
          onClick={onLoadSample}
          className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-[#FBBF24] hover:bg-[#1E2433] flex items-center gap-1.5 transition"
        >
          <BookMarked className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>예시 살펴보기</span>
        </button>
        <button
          type="button"
          onClick={onNewProject}
          className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-[#FBBF24] hover:bg-[#1E2433] flex items-center gap-1.5 transition"
        >
          <FilePlus className="w-3.5 h-3.5 text-slate-400" />
          <span>새 프로젝트</span>
        </button>
        <button
          type="button"
          onClick={onOpenHelp}
          className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-[#FBBF24] hover:bg-[#1E2433] flex items-center gap-1.5 transition"
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
              ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/40"
              : "bg-amber-950/40 text-amber-400 border-amber-800/60 hover:bg-amber-900/40"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              hasApiKey ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
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
          className="px-2.5 py-1 text-xs font-bold text-slate-200 bg-[#1E2433] hover:bg-[#272B38] border border-[#2D3748] rounded-lg transition hidden sm:inline-flex"
          title="독립형 단일 HTML 파일로 즉시 다운로드"
        >
          HTML
        </button>

        <button
          type="button"
          onClick={handleDownloadEpub}
          disabled={isDownloadingEpub}
          className="px-2.5 py-1 text-xs font-bold text-slate-200 bg-[#1E2433] hover:bg-[#272B38] border border-[#2D3748] rounded-lg transition hidden md:inline-flex disabled:opacity-50"
          title="모바일 리더기 호환 EPUB 다운로드"
        >
          EPUB
        </button>

        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={isDownloadingZip}
          className="px-2.5 py-1 text-xs font-bold text-slate-200 bg-[#1E2433] hover:bg-[#272B38] border border-[#2D3748] rounded-lg transition hidden sm:inline-flex disabled:opacity-50"
          title="Vercel Drop 업로드용 ZIP 번들 다운로드"
        >
          웹 배포용
        </button>

        {/* 전체화면 확대 읽기: 3D 엠보싱 골드 버튼 */}
        <button
          type="button"
          onClick={onPreviewFull}
          className="btn-3d btn-3d-amber-book flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white shadow-2xs"
          title="독립 브라우저 창에서 크게 보기"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">전체화면</span>
        </button>
      </div>
    </header>
  );
}
