"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Star,
  ExternalLink,
  Calendar,
  CloudSun,
  Download,
  TrendingUp,
} from "lucide-react";
import { AppSettings } from "@/lib/storage";

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings?: () => void;
  onOpenTrends?: () => void;
  onOpenMobileNav?: () => void;
}

export function Header({
  settings,
  onOpenSettings,
  onOpenTrends,
  onOpenMobileNav,
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
    <header className="bg-white border-b border-slate-200 shadow-xs">
      {/* Top Main Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Mobile Menu Button + Marketing Slogan */}
        <div className="flex items-center gap-3">
          {onOpenMobileNav && (
            <button
              type="button"
              onClick={onOpenMobileNav}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
              aria-label="사이드 메뉴 열기"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* 마케팅 텍스트 문구: 잘 보이게 강조 표시 */}
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm sm:text-[15px] font-bold text-slate-800 tracking-tight">
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent font-black">
                AI와 함께
              </span>{" "}
              아이디어 발굴부터 SEO 최적화 포스팅까지 한 곳에서 완성하세요.
            </p>
          </div>
        </div>

        {/* Model Badges & Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* 크롬 확장 프로그램 다운로드 (사이드바에서 상단으로 이동) */}
          <a
            href="/downloads/naver-blog-allinone-latest.zip"
            download="naver-blog-allinone-latest.zip"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 transition shadow-xs"
            title="네이버 스마트에디터 ONE 원클릭 자동 주입 크롬 확장 프로그램 다운로드"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>크롬 확장 프로그램</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">ZIP</span>
          </a>

          {/* 실시간 트렌드 분석 (사이드바에서 상단으로 이동) */}
          <button
            type="button"
            onClick={onOpenTrends}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-50 transition shadow-xs"
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>실시간 트렌드 분석</span>
          </button>

          {/* Text Model Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg text-xs border border-slate-200">
            <span className="text-slate-500">텍스트:</span>
            <span className="font-semibold text-indigo-700">
              {settings.textModel === "gemini-flash-latest" ? "Flash 추천" : "Lite 초고속"}
            </span>
          </div>

          {/* Image Model Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg text-xs border border-slate-200">
            <span className="text-slate-500">이미지:</span>
            <span className="font-semibold text-purple-700">
              {settings.imageModel === "nano-banana-2" ? "NB 2 고화질" : "NB 2 Lite 초고속"}
            </span>
          </div>

          {/* Naver Creator-Advisor Button */}
          <a
            href="https://creator-advisor.naver.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-900 transition shadow-xs"
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>네이버 creator-advisor</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
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
              <span className="text-emerald-600 font-medium">● Gemini API 연동 완료 (사용자 브라우저 격리 보관)</span>
            ) : (
              <span className="text-amber-600 font-medium">⚠️ 좌측 [API키등록·플랫폼연동] 메뉴에서 본인 Gemini API 키를 등록해주세요</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
