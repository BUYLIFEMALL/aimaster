"use client";

import React, { useState, useEffect } from "react";
import { X, Crosshair, Copy, Check, Sparkles, Code2, ArrowUpRight } from "lucide-react";
import { SelectedSector } from "@/lib/types";

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

  useEffect(() => {
    setCurrentUrl(targetUrl);
  }, [targetUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (e: MessageEvent) => {
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

  const proxySrc = `/api/proxy?url=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-in fade-in duration-200">
      {/* 상단 툴바 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-400">
            <Crosshair className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-tight flex items-center gap-2">
              <span>시각적 섹터 셀렉터</span>
              <span className="font-mono text-[10px] text-slate-400 font-normal truncate max-w-xs">
                ({currentUrl})
              </span>
            </h3>
          </div>
        </div>

        {/* 단축키 가이드 */}
        <div className="hidden lg:flex items-center gap-4 text-[10px] font-mono">
          <span className="text-slate-400">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200 font-bold border border-slate-700">클릭</kbd> 요소 캡처
          </span>
          <span className="text-emerald-400">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200 font-bold border border-slate-700">Shift + 클릭</kbd> 부모(컨테이너) 선택
          </span>
          <span className="text-indigo-400">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200 font-bold border border-slate-700">Ctrl/Cmd + 클릭</kbd> 링크 이동
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 메인 뷰어 영역 (좌: iframe, 우: 인스펙터 패널) */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 웹페이지 프리뷰 iframe */}
        <div className="flex-1 bg-white relative">
          <iframe
            src={proxySrc}
            className="w-full h-full border-0"
            title="웹사이트 시각적 미리보기"
          />
        </div>

        {/* 우측 선택된 섹터 인스펙터 패널 */}
        <div className="w-80 md:w-96 border-l border-slate-800 bg-slate-900 p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">
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
                  <span className="text-[10px] font-mono text-slate-500 uppercase">태그 및 선택자</span>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-emerald-400 break-all text-[11px]">
                    &lt;{selectedSector.tagName.toLowerCase()}
                    {selectedSector.className && ` class="${selectedSector.className}"`}
                    &gt;
                  </div>
                </div>

                {/* 텍스트 내용 미리보기 */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">추출된 텍스트</span>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 max-h-36 overflow-y-auto text-[11px] leading-relaxed">
                    {selectedSector.text || "(텍스트 없음)"}
                  </div>
                </div>

                {/* HTML 코드 미리보기 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">HTML 코드</span>
                    <button
                      type="button"
                      onClick={handleCopyHtml}
                      className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? "복사됨" : "코드 복사"}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 max-h-40 overflow-y-auto font-mono text-[10px] whitespace-pre-wrap break-all custom-scrollbar">
                    {selectedSector.html}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-2">
                <Crosshair className="h-8 w-8 text-slate-600 mx-auto animate-pulse" />
                <p className="text-xs text-slate-400 font-bold">
                  좌측 웹 화면의 요소를 클릭하세요
                </p>
                <p className="text-[11px] text-slate-500">
                  원하는 텍스트나 리스트 컨테이너를 마우스로 가리키고 클릭하면 데이터가 캡처됩니다.
                </p>
              </div>
            )}
          </div>

          {/* 하단 액션 버튼 */}
          {selectedSector && onSelectSectorForAi && (
            <div className="pt-4 border-t border-slate-800">
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
