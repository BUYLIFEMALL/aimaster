"use client";

import React from "react";
import { Dna } from "lucide-react";

interface StudioScanOverlayProps {
  aspectRatio?: string;
  active?: boolean;
  isScanning?: boolean;
}

/**
 * 원본 스크린샷 1:1 매칭:
 * 1. 스캔 진행 중 (isScanning = true):
 *    - 위에서 아래로, 아래에서 위로 왕복하는 네온 사이언 스캔 레이저 라인 & 잔상 트레일
 *    - 중앙 회전 점선 원형 링 + 나선 Dna 아이콘
 *    - "유전자 해독 중..." 네온 펄스 텍스트
 * 2. 스캔 완료 (isScanning = false):
 *    - 정밀 3x3 십자선 가이드 그리드
 *    - 특징점 타겟 앵커 링 2개 (동심원 조준경 마크)
 *    - 네 모서리 브래킷 마커
 *    - AR 화면 비율 뱃지
 */
export function StudioScanOverlay({
  aspectRatio,
  active = true,
  isScanning = false,
}: StudioScanOverlayProps) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <style>{`
        @keyframes scanLaserBounce {
          0% {
            top: 0%;
            opacity: 0.85;
          }
          50% {
            top: 100%;
            opacity: 1;
          }
          100% {
            top: 0%;
            opacity: 0.85;
          }
        }
        @keyframes scanRotateRing {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* 1. 3x3 십자선 정밀 가이드 그리드 (항상 은은하게 표시) */}
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
      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-cyan-400/20 border-dashed" />
      <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-cyan-400/20 border-dashed" />

      {/* 2. 네 모서리 브래킷 마커 */}
      <div className="absolute top-2 left-2 h-3.5 w-3.5 border-t-2 border-l-2 border-cyan-400/80" />
      <div className="absolute top-2 right-2 h-3.5 w-3.5 border-t-2 border-r-2 border-cyan-400/80" />
      <div className="absolute bottom-2 left-2 h-3.5 w-3.5 border-b-2 border-l-2 border-cyan-400/80" />
      <div className="absolute bottom-2 right-2 h-3.5 w-3.5 border-b-2 border-r-2 border-cyan-400/80" />

      {/* 3. 스캔 진행 중일 때: 위아래 왕복 레이저 빔 + 중앙 "유전자 해독 중..." */}
      {isScanning && (
        <>
          {/* 위 ➔ 아래 ➔ 위 왕복 스캔 레이저 라인 */}
          <div
            className="absolute left-0 right-0 h-1 z-30 pointer-events-none"
            style={{
              animation: "scanLaserBounce 3s ease-in-out infinite",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(0,240,255,0.4) 15%, #00f0ff 50%, rgba(0,240,255,0.4) 85%, transparent 100%)",
              boxShadow:
                "0 0 16px 3px rgba(0, 240, 255, 0.85), 0 0 32px 8px rgba(0, 240, 255, 0.45)",
            }}
          >
            {/* 레이저 라인의 빛 잔상 트레일 */}
            <div
              className="absolute left-0 right-0 -top-10 h-10 pointer-events-none opacity-30"
              style={{
                background:
                  "linear-gradient(180deg, transparent 0%, rgba(0,240,255,0.6) 100%)",
              }}
            />
          </div>

          {/* 중앙 딤 오버레이 & 유전자 해독 중 인디케이터 */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-cyan-950/45 backdrop-blur-[2px] transition-all">
            {/* 회전하는 점선 원형 링 & Dna 아이콘 */}
            <div className="relative flex h-18 w-18 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400"
                style={{ animation: "scanRotateRing 4.5s linear infinite" }}
              />
              <Dna className="h-9 w-9 text-cyan-300 animate-pulse drop-shadow-[0_0_12px_#00f0ff]" />
            </div>

            {/* 스타일 분석 중... 네온 텍스트 */}
            <p className="mt-3.5 text-xs font-mono font-black tracking-[0.28em] text-cyan-300 uppercase drop-shadow-[0_0_10px_rgba(0,240,255,0.9)] animate-pulse">
              스타일 분석 중...
            </p>
          </div>
        </>
      )}

      {/* 4. 스캔 완료 상태일 때: 특징점 타깃 앵커 링 2개 & AR 뱃지 */}
      {!isScanning && (
        <>
          {/* AI 특징점 타겟 링 1 (주 피사체 중심부 앵커) */}
          <div className="absolute left-[52%] top-[45%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <span className="absolute h-full w-full rounded-full border border-cyan-400/60 animate-ping opacity-35" />
              <span className="h-7 w-7 rounded-full border border-cyan-400/80 bg-cyan-500/10" />
              <span className="absolute h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#00f0ff]" />
            </div>
          </div>

          {/* AI 특징점 타겟 링 2 (서브 디테일 앵커) */}
          <div className="absolute left-[62%] top-[56%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10">
            <div className="relative flex h-8 w-8 items-center justify-center">
              <span className="h-5 w-5 rounded-full border border-cyan-400/80 bg-cyan-500/10" />
              <span className="absolute h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_6px_#00f0ff]" />
            </div>
          </div>

          {/* 상단 비율 뱃지 */}
          {aspectRatio && (
            <div className="absolute top-2.5 right-2.5 z-10 rounded-md bg-slate-900/85 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider text-cyan-300 border border-cyan-500/35 backdrop-blur-xs">
              AR: {aspectRatio}
            </div>
          )}
        </>
      )}
    </div>
  );
}
