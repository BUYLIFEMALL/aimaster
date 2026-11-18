"use client";

import Image from "next/image";
import {
  Activity,
  Cpu,
  ShieldCheck,
} from "lucide-react";

export default function HeroShowcase() {
  return (
    <div className="w-full max-w-6xl mx-auto mt-10 mb-8 px-2 sm:px-4">
      {/* 메인 히어로 파노라마 글래스 프레임 */}
      <div className="relative rounded-3xl border border-gold/35 bg-[#09090e] shadow-[0_24px_70px_-15px_rgba(245,158,11,0.18)] overflow-hidden group">
        {/* 상단 미니멀 커맨드 헤더 (도트·영문 부가문구 제거 후 좌우 대칭 정돈) */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3.5 bg-[#0e0e16]/90 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold text-white/85 tracking-wide">
            <Activity size={14} className="text-emerald-400 animate-pulse shrink-0" />
            <span>AI MASTER COMMAND CENTER</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-[11px] font-bold text-amber-300">
              <Cpu size={12} />
              <span>GPT · Claude · Gemini 통합 엔진</span>
            </span>
          </div>
        </div>

        {/* 주인님 확정 1차-3안: 24/7 무인 비즈니스 커맨드 센터 파노라마 비주얼 (오버레이 없이 100% 깨끗한 뷰) */}
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#06060a]">
          <Image
            src="/images/hero/concept_3_command_hub.jpg"
            alt="AI Master 24/7 무인 비즈니스 커맨드 센터"
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1152px"
            className="object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
          />
        </div>

        {/* 최하단 푸터 바 (중앙 정렬) */}
        <div className="border-t border-white/10 px-4 sm:px-6 py-3.5 bg-[#09090e] flex items-center justify-center text-center text-xs sm:text-[13px] text-white/80">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
            <span>잠든 사이에도 멈추지 않고 스스로 일하는 올인원 AI 마케팅 &amp; 비즈니스 커맨드 센터</span>
          </div>
        </div>
      </div>
    </div>
  );
}
