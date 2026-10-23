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
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0c0d12]">
      {/* 1. 상단 바 */}
      <div className="px-6 py-3 border-b border-[#272b3f] bg-[#141620] flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-xs font-bold text-white">
            {state.mediaType === "vinyl" ? "LP 턴테이블 모니터" : "CD 플레이어 모니터"}
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#272b3f] bg-[#0c0d12] hover:bg-[#1b1e2c] text-white text-xs font-bold shadow-xs transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>일시정지</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  <span>재생</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1b1e2c] text-xs font-medium transition-colors"
            title="초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>초기화</span>
          </button>
        </div>
      </div>

      {/* 2. 중앙 턴테이블 캔버스 뷰포트 */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative bg-[#0c0d12]">
        {/* 턴테이블 본체 카드 */}
        <div className="w-full max-w-xl bg-[#141620] border border-[#272b3f] rounded-3xl p-8 shadow-2xl shadow-black/80 flex flex-col items-center relative overflow-hidden">
          {/* 턴테이블 배경 엠보싱 플레이터 */}
          <div className="w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full bg-gradient-to-tr from-black via-slate-950 to-[#1b1e2c] p-2 shadow-2xl relative flex items-center justify-center border-4 border-[#272b3f]">
            {/* 알루미늄 에지 림 */}
            <div className="absolute inset-1 rounded-full border border-slate-700/60 pointer-events-none"></div>

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
              <div className="w-full h-full rounded-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3 bg-[#0a0b0f]">
                <Disc className="w-16 h-16 stroke-1 text-slate-600 animate-spin-disc" />
                <div>
                  <p className="text-xs font-bold text-slate-200">제작 준비 완료</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    왼쪽 패널에서 정보를 입력하고 '디자인 생성하기'를 눌러주세요
                  </p>
                </div>
              </div>
            )}

            {/* 메탈 센터 스핀들 핀 */}
            <div className="absolute w-4 h-4 rounded-full bg-gradient-to-tr from-slate-300 via-white to-slate-500 border border-slate-600 shadow-sm flex items-center justify-center z-10 pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>
            </div>
          </div>

          {/* 앨범 정보 캡션 */}
          <div className="mt-6 text-center space-y-1 max-w-sm">
            <h2 className="text-base font-black text-white truncate">
              {state.title || "Untitled Album"}
            </h2>
            <p className="text-xs font-semibold text-slate-400 truncate">
              {state.artist || "Unknown Artist"} {state.extraInfo ? `• ${state.extraInfo}` : ""}
            </p>
          </div>

          {/* 렌더링 중 상태 오버레이 (진행률 표시) */}
          {(state.isGeneratingImage || state.isRenderingVideo) && (
            <div className="absolute inset-0 bg-[#0c0d12]/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-20 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 shadow-lg border border-amber-500/30">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <p className="text-sm font-bold text-white">{state.loadingMessage}</p>
              {state.renderProgress !== undefined && (
                <div className="w-48 mt-3">
                  <div className="w-full bg-[#1b1e2c] h-2 rounded-full overflow-hidden border border-[#272b3f]">
                    <div
                      className="bg-amber-500 h-full transition-all duration-150"
                      style={{ width: `${state.renderProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-center text-amber-300 mt-1">
                    {state.renderProgress}%
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. 렌더링 완료 비디오/GIF 다운로드 카드 */}
        {state.generatedVideoUrl && (
          <div className="mt-6 w-full max-w-xl p-4 rounded-2xl bg-[#141620] border border-emerald-500/40 shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                {state.generatedVideoFormat === "mp4" ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {state.generatedVideoFormat?.toUpperCase()} 애니메이션 생성 완료!
                </p>
                <p className="text-[11px] text-slate-400">
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
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all shrink-0"
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
