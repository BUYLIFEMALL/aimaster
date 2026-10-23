"use client";
// 2026-10-21 병합 A: Website Scraper(ghost-scraper)에서 옮김 — 웹 크롤링 자동화 「한 페이지 분석」(/inspect).

import React, { useState, useEffect, useRef } from "react";
import { X, Crosshair, Copy, Check, Sparkles, Code2, ArrowUpRight } from "lucide-react";
import { SelectedSector } from "@/lib/inspect/types";

interface SectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl: string;
  onSelectSectorForAi?: (sector: SelectedSector) => void;
  onNavigateUrl?: (newUrl: string) => void;
}

export function SectorModal({
  isOpen,
  onClose,
  targetUrl,
  onSelectSectorForAi,
  onNavigateUrl,
}: SectorModalProps) {
  const [selectedSector, setSelectedSector] = useState<SelectedSector | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(targetUrl);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setCurrentUrl(targetUrl);
  }, [targetUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (e: MessageEvent) => {
      // 미리보기 iframe이 보낸 메시지만 받는다(다른 창·탭의 위조 메시지 무시).
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      if (e.data?.type === "AIS_SECTOR_SELECTED") {
        setSelectedSector({
          tagName: e.data.tagName || "",
          className: e.data.className || "",
          id: e.data.id || "",
          text: e.data.text || "",
          html: e.data.html || "",
        });
      } else if (e.data?.type === "AIS_NAVIGATE_REQUEST" && e.data.url) {
        setCurrentUrl(e.data.url);
        setSelectedSector(null);
        if (onNavigateUrl) onNavigateUrl(e.data.url);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen, onNavigateUrl]);

  if (!isOpen) return null;

  const handleCopyHtml = () => {
    if (!selectedSector) return;
    navigator.clipboard.writeText(selectedSector.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const proxySrc = `/api/inspect/proxy?url=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-mx-bg text-white animate-in fade-in duration-200">
      {/* 상단 툴바 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-mx-border bg-mx-surface px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-400">
            <Crosshair className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-tight flex items-center gap-2">
              <span>시각적 섹터 셀렉터</span>
              <span className="font-mono text-[10px] text-mx-muted font-normal truncate max-w-xs">
                ({currentUrl})
              </span>
            </h3>
          </div>
        </div>

        {/* 단축키 가이드 */}
        <div className="hidden lg:flex items-center gap-4 text-[10px] font-mono">
          <span className="text-mx-muted">
            <kbd className="rounded bg-mx-raised px-1.5 py-0.5 text-mx-text font-bold border border-mx-border">클릭</kbd> 요소 캡처
          </span>
          <span className="text-emerald-400">
            <kbd className="rounded bg-mx-raised px-1.5 py-0.5 text-mx-text font-bold border border-mx-border">Shift + 클릭</kbd> 부모(컨테이너) 선택
          </span>
          <span className="text-indigo-400">
            <kbd className="rounded bg-mx-raised px-1.5 py-0.5 text-mx-text font-bold border border-mx-border">Ctrl/Cmd + 클릭</kbd> 링크 이동
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-mx-muted hover:bg-mx-raised hover:text-white transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 메인 뷰어 영역 (좌: iframe, 우: 인스펙터 패널) */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* 좌측 웹페이지 프리뷰 iframe */}
        <div className="flex-1 bg-white relative">
          <iframe
            ref={iframeRef}
            src={proxySrc}
            // 남의 사이트를 우리 도메인 권한과 분리(쿠키·저장된 키 접근 차단). 선택용 스크립트만 동작.
            sandbox="allow-scripts"
            className="w-full h-full border-0"
            title="웹사이트 시각적 미리보기"
          />
        </div>

        {/* 우측 선택된 섹터 인스펙터 패널 */}
        <div className="max-h-[45vh] w-full border-t md:max-h-none md:w-96 md:border-l md:border-t-0 border-mx-border bg-mx-surface p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mx-border">
              <span className="text-[10px] uppercase font-mono tracking-widest text-mx-muted font-bold">
                선택된 섹터 정보
              </span>
              {selectedSector && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                  {selectedSector.tagName.toUpperCase()}
                </span>
              )}
            </div>

            {selectedSector ? (
              <div className="space-y-4 text-xs">
                {/* 태그 / 클래스명 */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-mx-muted uppercase">태그 및 선택자</span>
                  <div className="p-2.5 rounded-lg bg-mx-bg border border-mx-border font-mono text-emerald-400 break-all text-[11px]">
                    &lt;{selectedSector.tagName.toLowerCase()}
                    {selectedSector.className && ` class="${selectedSector.className}"`}
                    &gt;
                  </div>
                </div>

                {/* 텍스트 내용 미리보기 */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-mx-muted uppercase">추출된 텍스트</span>
                  <div className="p-2.5 rounded-lg bg-mx-bg border border-mx-border text-mx-text max-h-36 overflow-y-auto text-[11px] leading-relaxed">
                    {selectedSector.text || "(텍스트 없음)"}
                  </div>
                </div>

                {/* HTML 코드 미리보기 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-mx-muted uppercase">HTML 코드</span>
                    <button
                      type="button"
                      onClick={handleCopyHtml}
                      className="text-[10px] font-bold text-mx-muted hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? "복사됨" : "코드 복사"}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-mx-bg border border-mx-border text-mx-muted max-h-40 overflow-y-auto font-mono text-[10px] whitespace-pre-wrap break-all custom-scrollbar">
                    {selectedSector.html}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-2">
                <Crosshair className="h-8 w-8 text-mx-muted mx-auto animate-pulse" />
                <p className="text-xs text-mx-muted font-bold">
                  좌측 웹 화면의 요소를 클릭하세요
                </p>
                <p className="text-[11px] text-mx-muted">
                  원하는 텍스트나 리스트 컨테이너를 마우스로 가리키고 클릭하면 데이터가 캡처됩니다.
                </p>
              </div>
            )}
          </div>

          {/* 하단 액션 버튼 */}
          {selectedSector && onSelectSectorForAi && (
            <div className="pt-4 border-t border-mx-border">
              <button
                type="button"
                onClick={() => {
                  onSelectSectorForAi(selectedSector);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950 hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>이 섹터로 AI 리스트 분석</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
