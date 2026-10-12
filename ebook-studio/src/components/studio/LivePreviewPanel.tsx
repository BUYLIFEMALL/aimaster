"use client";

import React, { useState, useMemo } from "react";
import {
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  RefreshCw,
  Maximize2,
} from "lucide-react";
import { EbookProject } from "@/lib/types";
import { buildStandaloneHtml } from "@/lib/template";

interface LivePreviewPanelProps {
  project: EbookProject;
}

type DeviceMode = "mobile" | "tablet" | "desktop";

export function LivePreviewPanel({ project }: LivePreviewPanelProps) {
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [key, setKey] = useState(0);

  // 실시간 단일 HTML 생성
  const previewHtml = useMemo(() => {
    return buildStandaloneHtml(project);
  }, [project]);

  const handleOpenNewTab = () => {
    const blob = new Blob([previewHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const getContainerWidth = () => {
    switch (device) {
      case "mobile":
        return "w-[375px]";
      case "tablet":
        return "w-[768px]";
      case "desktop":
      default:
        return "w-full";
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
      {/* 뷰어 상단 바 */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white">실시간 독서 뷰어 미리보기</span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            (다운로드될 파일과 100% 동일)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 기기 전환 버튼 */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={`p-1.5 rounded-md transition ${
                device === "mobile"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title="모바일 뷰 (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice("tablet")}
              className={`p-1.5 rounded-md transition ${
                device === "tablet"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title="태블릿 뷰 (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`p-1.5 rounded-md transition ${
                device === "desktop"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title="데스크톱 뷰 (전체 폭)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setKey((k) => k + 1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="새로고침"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleOpenNewTab}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="새 창에서 크게 보기"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 뷰어 iframe 영역 */}
      <div className="flex-1 overflow-auto bg-slate-900/60 p-4 flex items-center justify-center">
        <div
          className={`${getContainerWidth()} h-full max-h-[780px] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700/50 transition-all duration-300 relative`}
        >
          <iframe
            key={key}
            srcDoc={previewHtml}
            title="Live E-book Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-modals"
          />
        </div>
      </div>
    </div>
  );
}
