"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  Download,
  Disc,
  Video,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { VinylState } from "@/types/vinyl";

interface TurntableDisplayProps {
  state: VinylState;
  onReset: () => void;
}

export function TurntableDisplay({ state, onReset }: TurntableDisplayProps) {
  const [isPlaying, setIsPlaying] = useState(true);

  // RPM 기반 회전 속도 (초) 계산: 60 / RPM = 1회전 소요 초
  const spinDurationSec = (60 / (state.speed || 45)).toFixed(2);

  const hasArtwork = Boolean(state.generatedImageBase64);

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100/70">
      {/* 1. 상단 바 */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-800">
            {state.mediaType === "vinyl" ? "LP 턴테이블" : "CD 플레이어"}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            • {state.speed} RPM • {spinDurationSec}s/rev
          </span>
        </div>

        {/* 상단 컨트롤 버튼들 */}
        <div className="flex items-center gap-2">
          {hasArtwork && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                  <span>일시정지</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                  <span>재생</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-medium transition-colors"
            title="초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>초기화</span>
          </button>
        </div>
      </div>

      {/* 2. 중앙 턴테이블 캔버스 뷰포트 */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative">
        {/* 턴테이블 본체 카드 */}
        <div className="w-full max-w-xl bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/50 flex flex-col items-center relative overflow-hidden">
          {/* 턴테이블 배경 엠보싱 플레이터 */}
          <div className="w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 p-2 shadow-2xl relative flex items-center justify-center border-4 border-slate-300">
            {/* 알루미늄 에지 림 */}
            <div className="absolute inset-1 rounded-full border border-slate-700 pointer-events-none"></div>

            {/* 디스크 영역 (아트가 있으면 회전 렌더, 없으면 플레이스홀더) */}
            {hasArtwork ? (
              <div
                className={`w-full h-full rounded-full overflow-hidden shadow-inner flex items-center justify-center ${
                  isPlaying ? "animate-spin-disc" : "animate-spin-disc-paused"
                }`}
                style={
                  {
                    "--spin-duration": `${spinDurationSec}s`,
                  } as React.CSSProperties
                }
              >
                <img
                  src={`data:image/png;base64,${state.generatedImageBase64}`}
                  alt={state.title}
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
              </div>
            ) : (
              <div className="w-full h-full rounded-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3 bg-[#111111]">
                <Disc className="w-16 h-16 stroke-1 text-slate-600 animate-spin-disc" />
                <div>
                  <p className="text-xs font-bold text-slate-300">제작 준비 완료</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    왼쪽 패널에서 정보를 입력하고 '디자인 생성하기'를 눌러주세요
                  </p>
                </div>
              </div>
            )}

            {/* 메탈 센터 스핀들 핀 */}
            <div className="absolute w-4 h-4 rounded-full bg-gradient-to-tr from-slate-200 via-white to-slate-400 border border-slate-400 shadow-sm flex items-center justify-center z-10 pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
            </div>
          </div>

          {/* 앨범 정보 캡션 */}
          <div className="mt-6 text-center space-y-1 max-w-sm">
            <h2 className="text-base font-black text-slate-900 truncate">
              {state.title || "Untitled Album"}
            </h2>
            <p className="text-xs font-semibold text-slate-500 truncate">
              {state.artist || "Unknown Artist"} {state.extraInfo ? `• ${state.extraInfo}` : ""}
            </p>
          </div>

          {/* 렌더링 중 상태 오버레이 (진행률 표시) */}
          {(state.isGeneratingImage || state.isRenderingVideo) && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex flex-col items-center justify-center p-6 z-20 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 shadow-sm">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <p className="text-sm font-bold text-slate-800">{state.loadingMessage}</p>
              {state.renderProgress !== undefined && (
                <div className="w-48 mt-3">
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-150"
                      style={{ width: `${state.renderProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-center text-slate-500 mt-1">
                    {state.renderProgress}%
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. 렌더링 완료 비디오/GIF 다운로드 카드 */}
        {state.generatedVideoUrl && (
          <div className="mt-6 w-full max-w-xl p-4 rounded-2xl bg-white border border-emerald-200 shadow-md flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                {state.generatedVideoFormat === "mp4" ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {state.generatedVideoFormat?.toUpperCase()} 애니메이션 생성 완료!
                </p>
                <p className="text-[11px] text-slate-500">
                  {state.generatedVideoFormat === "mp4"
                    ? "720p 60fps 고화질 비디오"
                    : "무한 반복 투명 GIF"}
                </p>
              </div>
            </div>

            <a
              href={state.generatedVideoUrl}
              download={`${state.title.replace(/\s+/g, "_") || "vinyl"}_spin.${
                state.generatedVideoFormat || "mp4"
              }`}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>파일 다운로드</span>
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
