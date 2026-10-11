"use client";

import React, { useState } from "react";
import { Search, Loader2, Crosshair, Globe, ArrowRight } from "lucide-react";

interface UrlInputSectionProps {
  url: string;
  onChangeUrl: (val: string) => void;
  onStartCrawl: () => void;
  onOpenSectorModal: () => void;
  isLoading: boolean;
}

const PRESET_URLS = [
  { label: "BUY LIFE Blog", url: "https://buylife.blog" },
  { label: "AIMaster Hub", url: "https://www.buylife.xyz" },
];

export function UrlInputSection({
  url,
  onChangeUrl,
  onStartCrawl,
  onOpenSectorModal,
  isLoading,
}: UrlInputSectionProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;
    onStartCrawl();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-600" />
            <span>입력 파라미터</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            데이터를 수집하고 분석할 웹사이트 URL을 입력하세요.
          </p>
        </div>

        {/* 프리셋 버튼 */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase">추천:</span>
          {PRESET_URLS.map((p) => (
            <button
              key={p.url}
              type="button"
              onClick={() => onChangeUrl(p.url)}
              className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => onChangeUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={isLoading}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-indigo-500/10 transition-all disabled:opacity-60"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 크롤링 시작 버튼 */}
          <button
            type="submit"
            disabled={!url.trim() || isLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                <span>데이터 수집 및 파싱 중...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4 text-emerald-400" />
                <span>크롤링 시작</span>
              </>
            )}
          </button>

          {/* 시각적 섹터 선택 버튼 */}
          <button
            type="button"
            onClick={onOpenSectorModal}
            disabled={!url.trim()}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Crosshair className="h-4 w-4 text-indigo-600" />
            <span>시각적 섹터 선택</span>
          </button>
        </div>
      </form>
    </div>
  );
}
