"use client";
import React from "react";

interface ShortsPhoneMockupProps {
  title?: string;
  narration?: string;
  bgUrl?: string;
  author?: string;
  likes?: string;
  comments?: string;
  currentTime?: string;
  totalTime?: string;
}

export function ShortsPhoneMockup({
  title = "연봉 2배 올리는 AI 툴 5가지!",
  narration = "아직도 엑셀 수작업 하세요? 이번 달 연봉 앞자리가 바뀌는 AI 실무 툴 5가지!",
  bgUrl = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
  author = "@AI크리에이터랩",
  likes = "4.8만",
  comments = "1,230",
  currentTime = "00:03",
  totalTime = "00:48"
}: ShortsPhoneMockupProps) {
  return (
    <div className="shorts-mockup-wrapper flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-2 text-xs font-bold text-slate-700">
        <span className="flex items-center gap-1.5 text-slate-900">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
          실시간 쇼츠 뷰파인더 (9:16)
        </span>
        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-mono text-[10px] font-black">
          LIVE PREVIEW
        </span>
      </div>

      {/* 스마트폰 프레임 */}
      <div className="shorts-phone-device relative w-[280px] h-[500px] bg-black rounded-[36px] overflow-hidden border-[8px] border-slate-900 shadow-2xl flex flex-col justify-between text-white select-none">
        {/* 상단 노치 */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-20"></div>

        {/* 배경 이미지 또는 비디오 */}
        <div className="absolute inset-0 z-0">
          <img
            src={bgUrl}
            alt="Shorts Visual"
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90"></div>
        </div>

        {/* 상단 유튜브 쇼츠 헤더 */}
        <div className="relative z-10 pt-6 px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-black text-white text-sm tracking-tight drop-shadow">
            <span className="w-5 h-4 bg-red-600 rounded flex items-center justify-center text-[10px]">▶</span>
            <span>Shorts</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono text-white/90">
            {currentTime} / {totalTime}
          </span>
        </div>

        {/* 중앙 하이라이트 자막 오버레이 */}
        <div className="relative z-10 px-4 text-center my-auto">
          <div className="inline-block px-3 py-1.5 rounded-lg bg-yellow-400 text-slate-950 font-black text-xs shadow-xl drop-shadow-md leading-tight mb-2">
            🔥 {title}
          </div>
          <p className="text-[11px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-2 px-1">
            "{narration}"
          </p>
        </div>

        {/* 우측 쇼츠 인터랙션 열 (좋아요, 댓글, 공유) */}
        <div className="absolute right-3 bottom-20 z-10 flex flex-col items-center gap-3 text-center">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white text-xs hover:scale-110 transition-transform">
              👍
            </div>
            <span className="text-[9px] font-bold text-white drop-shadow">{likes}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white text-xs hover:scale-110 transition-transform">
              💬
            </div>
            <span className="text-[9px] font-bold text-white drop-shadow">{comments}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white text-xs hover:scale-110 transition-transform">
              ↗
            </div>
            <span className="text-[9px] font-bold text-white drop-shadow">공유</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-white overflow-hidden animate-spin" style={{ animationDuration: "5s" }}>
            <img src={bgUrl} alt="Audio Disk" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* 하단 크리에이터 정보 및 프로그레스 바 */}
        <div className="relative z-10 p-3.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center font-bold text-[10px] text-white">
              YT
            </div>
            <span className="text-xs font-black text-white drop-shadow truncate max-w-[130px]">{author}</span>
            <button type="button" className="px-2 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-[9px] shadow hover:bg-red-700">
              구독
            </button>
          </div>
          <p className="text-[10px] text-white/90 line-clamp-1 font-medium drop-shadow">
            #Shorts #유튜브쇼츠 #AI원스톱스튜디오
          </p>
          <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-red-600 w-1/3"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
