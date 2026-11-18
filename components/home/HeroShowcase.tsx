"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  Cpu,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function HeroShowcase() {
  return (
    <div className="w-full max-w-6xl mx-auto mt-10 mb-8 px-2 sm:px-4">
      {/* 메인 히어로 파노라마 글래스 프레임 */}
      <div className="relative rounded-3xl border border-gold/35 bg-[#09090e] shadow-[0_24px_70px_-15px_rgba(245,158,11,0.18)] overflow-hidden group">
        {/* 상단 미니멀 커맨드 헤더 */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3 bg-[#0e0e16]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/85" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/85" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/85" />
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-white/10 text-[11px] sm:text-xs font-mono text-white/70">
              <Activity size={13} className="text-emerald-400 animate-pulse" />
              <span>AI MASTER COMMAND CENTER · 24/7 AUTONOMOUS</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-[11px] font-bold text-amber-300">
              <Cpu size={12} />
              <span>GPT · Claude · Gemini 통합 엔진</span>
            </span>
          </div>
        </div>

        {/* 주인님 확정 1차-3안: 24/7 무인 비즈니스 커맨드 센터 파노라마 비주얼 (하단 가림 없이 온전한 뷰) */}
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#06060a]">
          <Image
            src="/images/hero/concept_3_command_hub.jpg"
            alt="AI Master 24/7 무인 비즈니스 커맨드 센터"
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1152px"
            className="object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
          />

          {/* 좌측 상단 은은한 라이브 상태 뱃지 */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/65 border border-gold/30 backdrop-blur-md shadow-lg">
            <Sparkles size={13} className="text-amber-400" />
            <span className="text-xs font-bold text-white/95">
              AI Agent Workflows · Content Timelines · Sales Funnels
            </span>
          </div>
        </div>

        {/* 최하단 푸터 바 */}
        <div className="border-t border-white/10 px-4 sm:px-6 py-3 bg-[#09090e] flex flex-col sm:flex-row items-center justify-between text-xs text-subtext gap-2">
          <div className="flex items-center gap-2 text-white/75">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>잠든 사이에도 멈추지 않고 스스로 일하는 올인원 AI 마케팅 &amp; 비즈니스 커맨드 센터</span>
          </div>
          <Link
            href="/programs?badge=free"
            className="text-gold/90 hover:text-gold transition-colors font-semibold flex items-center gap-1 shrink-0"
          >
            <Layers size={13} />
            <span>무료 체험 프로그램 바로보기 →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
