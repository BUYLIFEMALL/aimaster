"use client";

import React from "react";

interface StudioScanOverlayProps {
  aspectRatio?: string;
  active?: boolean;
}

/**
 * 원본 스크린샷의 시그니처 비주얼:
 * 이미지 위에 투영되는 사이언 정밀 스캔 그리드 십자선과 AI 타깃 앵커 링 오버레이
 */
export function StudioScanOverlay({ aspectRatio, active = true }: StudioScanOverlayProps) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      {/* 3x3 십자선 정밀 가이드 그리드 */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 border border-cyan-500/20">
        <div className="border-r border-b border-cyan-500/20" />
        <div className="border-r border-b border-cyan-500/20" />
        <div className="border-b border-cyan-500/20" />
        <div className="border-r border-b border-cyan-500/20" />
        <div className="border-r border-b border-cyan-500/20" />
        <div className="border-b border-cyan-500/20" />
        <div className="border-r border-cyan-500/20" />
        <div className="border-r border-cyan-500/20" />
        <div />
      </div>

      {/* 중앙 미세 십자 보조선 */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-cyan-400/25 border-dashed" />
      <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-cyan-400/25 border-dashed" />

      {/* AI 특징점 타겟 링 1 (주 피사체 중심부 앵커) */}
      <div className="absolute left-[52%] top-[45%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <span className="absolute h-full w-full rounded-full border border-cyan-400/60 animate-ping opacity-40" />
          <span className="h-7 w-7 rounded-full border border-cyan-400/80 bg-cyan-500/10" />
          <span className="absolute h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#00f0ff]" />
        </div>
      </div>

      {/* AI 특징점 타겟 링 2 (서브 디테일 앵커) */}
      <div className="absolute left-[62%] top-[56%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        <div className="relative flex h-8 w-8 items-center justify-center">
          <span className="h-5 w-5 rounded-full border border-cyan-400/80 bg-cyan-500/10" />
          <span className="absolute h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_6px_#00f0ff]" />
        </div>
      </div>

      {/* 네 모서리 브래킷 마커 */}
      <div className="absolute top-2 left-2 h-3 w-3 border-t-2 border-l-2 border-cyan-400/70" />
      <div className="absolute top-2 right-2 h-3 w-3 border-t-2 border-r-2 border-cyan-400/70" />
      <div className="absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-cyan-400/70" />
      <div className="absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-cyan-400/70" />

      {/* 상단 비율 뱃지 */}
      {aspectRatio && (
        <div className="absolute top-2.5 right-2.5 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider text-cyan-300 border border-cyan-500/30 backdrop-blur-xs">
          AR: {aspectRatio}
        </div>
      )}
    </div>
  );
}
