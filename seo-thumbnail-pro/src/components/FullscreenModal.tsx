"use client";

import React from "react";
import { X, Download } from "lucide-react";

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onDownload: () => void;
}

export default function FullscreenModal({
  isOpen,
  onClose,
  imageUrl,
  onDownload,
}: FullscreenModalProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-w-5xl w-full flex flex-col items-center">
        {/* Controls */}
        <div className="w-full flex items-center justify-between pb-3 text-white">
          <span className="text-xs font-semibold tracking-wide text-slate-300">
            16:9 썸네일 고화질 미리보기
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              다운로드
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="w-full overflow-hidden rounded-2xl shadow-2xl border border-white/10 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Thumbnail Fullscreen"
            className="w-full h-auto aspect-video object-contain"
          />
        </div>
      </div>
    </div>
  );
}
