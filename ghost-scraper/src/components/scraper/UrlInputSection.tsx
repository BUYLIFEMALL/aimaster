"use client";

import React from "react";
import { Search, Loader2, Crosshair, Globe } from "lucide-react";

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
    <div className="mx-card space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black tracking-tight text-mx-text">
            <Globe className="h-4 w-4 text-mx-link" />
            <span>STEP 1 · 수집할 웹사이트 주소</span>
          </h2>
          <p className="mt-0.5 text-xs text-mx-muted">데이터를 수집하고 분석할 웹사이트 URL을 입력하세요.</p>
        </div>

        {/* 프리셋 버튼 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase text-mx-muted">추천:</span>
          {PRESET_URLS.map((p) => (
            <button
              key={p.url}
              type="button"
              onClick={() => onChangeUrl(p.url)}
              className="mx-chip min-h-[32px] cursor-pointer hover:text-mx-text"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-mx-muted">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => onChangeUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={isLoading}
            aria-label="수집할 웹사이트 주소"
            className="mx-input pl-10 font-mono text-sm disabled:opacity-60"
          />
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button type="submit" disabled={!url.trim() || isLoading} className="mx-btn-primary">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>데이터 수집 및 분석 중...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>⚡ 크롤링 시작</span>
              </>
            )}
          </button>

          <button type="button" onClick={onOpenSectorModal} disabled={!url.trim()} className="mx-btn-ghost">
            <Crosshair className="h-4 w-4 text-mx-accent" />
            <span>시각적 섹터 선택</span>
          </button>
        </div>
      </form>
    </div>
  );
}
