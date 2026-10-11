"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Settings,
  TrendingUp,
  Star,
  ExternalLink,
  Key,
  Calendar,
  CloudSun,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { AppSettings } from "@/lib/storage";

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenTrends: () => void;
}

export function Header({ settings, onOpenSettings, onOpenTrends }: HeaderProps) {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900">
                {APP_NAME}
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                {APP_VERSION}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-emerald-500 text-white rounded-md tracking-wider">
                FREE
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              AI와 함께 아이디어 발굴부터 SEO 최적화 포스팅까지 한 곳에서 완성하세요.
            </p>
          </div>
        </div>

        {/* Model Badges & Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
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

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              hasApiKey
                ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs"
                : "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 animate-pulse"
            }`}
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>{hasApiKey ? "설정" : "API키 설정 필요"}</span>
            {!hasApiKey && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          {/* Trend Links Button */}
          <button
            type="button"
            onClick={onOpenTrends}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>트렌드 바로가기</span>
          </button>

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
              <span className="text-amber-600 font-medium">⚠️ 상단 [설정]에서 본인 Gemini API 키를 등록해주세요</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
