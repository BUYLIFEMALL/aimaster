"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Download,
  FileArchive,
  Calendar,
  CloudSun,
} from "lucide-react";
import { AppSettings } from "@/lib/storage";

interface HeaderProps {
  settings: AppSettings;
  onDownloadZip: () => void;
  onDownloadMergedJpg: () => void;
  onOpenMobileNav?: () => void;
  hasCutsToDownload?: boolean;
}

export function Header({
  settings,
  onDownloadZip,
  onDownloadMergedJpg,
  onOpenMobileNav,
  hasCutsToDownload = false,
}: HeaderProps) {
  const [currentDateTime, setCurrentDateTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const date = now.getDate();
      const days = ["일", "월", "화", "수", "목", "금", "토"];
      const day = days[now.getDay()];

      let hours = now.getHours();
      const ampm = hours >= 12 ? "오후" : "오전";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutes = String(now.getMinutes()).padStart(2, "0");

      setCurrentDateTime(
        `${year}년 ${month}월 ${date}일 ${day}요일 ${ampm} ${String(hours).padStart(2, "0")}:${minutes}`
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  const hasApiKey = Boolean(settings.geminiApiKey);

  return (
    <header className="bg-white border-b border-slate-200 shadow-2xs">
      {/* Top Main Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Mobile Menu Button + Marketing Slogan */}
        <div className="flex items-center gap-3">
          {onOpenMobileNav && (
            <button
              type="button"
              onClick={onOpenMobileNav}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden cursor-pointer"
              aria-label="사이드 메뉴 열기"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* 마케팅 슬로건 문구: 잘 보이게 강조 표시 */}
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm sm:text-[15px] font-bold text-slate-800 tracking-tight">
              <span className="bg-gradient-to-r from-emerald-600 to-indigo-600 bg-clip-text text-transparent font-black">
                AI와 함께
              </span>{" "}
              시놉시스부터 캐릭터 시트, 세로 스크롤 완성 원고까지 한 곳에서 완성하세요.
            </p>
          </div>
        </div>

        {/* Right: Model Badges & Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Text Model Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg text-xs border border-slate-200">
            <span className="text-slate-500">텍스트:</span>
            <span className="font-semibold text-indigo-700">
              {settings.textModel === "gemini-2.5-flash" ? "Flash 추천" : "Lite 초고속"}
            </span>
          </div>

          {/* Image Model Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg text-xs border border-slate-200">
            <span className="text-slate-500">이미지:</span>
            <span className="font-semibold text-purple-700">
              {settings.imageModel === "nano-banana-2" ? "NB 2 고화질" : "Flux 코믹"}
            </span>
          </div>

          {/* Quick Action: ZIP 일괄 저장 */}
          <button
            type="button"
            onClick={onDownloadZip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition shadow-2xs cursor-pointer"
            title="모든 컷 이미지를 ZIP으로 일괄 압축 다운로드"
          >
            <FileArchive className="w-3.5 h-3.5 text-indigo-600" />
            <span>이미지 일괄 저장 (.zip)</span>
          </button>

          {/* Quick Action: 전체 이어붙여 저장 (JPG) */}
          <button
            type="button"
            onClick={onDownloadMergedJpg}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer"
            title="모든 컷을 세로 롱스크롤 웹툰 단일 이미지로 합성 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
            <span>전체 이어붙여 저장 (JPG)</span>
          </button>
        </div>
      </div>

      {/* Date & Weather sub-bar */}
      <div className="bg-slate-100/70 border-t border-slate-200/70 text-[11px] text-slate-600 py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDateTime || "2026년 10월 11일"}</span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1">
              <CloudSun className="w-3.5 h-3.5 text-amber-500" />
              서울: 맑음, 21°C
            </span>
          </div>
          <div className="text-[11px] text-slate-500 hidden sm:block">
            {hasApiKey ? (
              <span className="text-emerald-600 font-medium">● Gemini API 연동 완료 (브라우저 격리 보관)</span>
            ) : (
              <span className="text-amber-600 font-medium">⚠️ 좌측 [API키등록·플랫폼연동] 메뉴에서 본인 Gemini API 키를 등록해주세요</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
