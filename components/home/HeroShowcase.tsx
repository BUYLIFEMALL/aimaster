"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ChevronRight,
  Cpu,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const HERO_METRICS = [
  { label: "가동 중인 AI 솔루션", value: "84개 정식 엔진", color: "text-amber-400" },
  { label: "자동화 운영 시간", value: "24시간 365일 무중단", color: "text-emerald-400" },
  { label: "API 보안 & 프라이버시", value: "100% 본인 키 암호화", color: "text-sky-400" },
];

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

        {/* 주인님 확정 1차-3안: 24/7 무인 비즈니스 커맨드 센터 파노라마 비주얼 */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[16/8.5] overflow-hidden bg-[#06060a]">
          <Image
            src="/images/hero/concept_3_command_hub.jpg"
            alt="AI Master 24/7 무인 비즈니스 커맨드 센터"
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1152px"
            className="object-cover object-center brightness-[0.96] contrast-[1.03] transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
          />

          {/* 모니터 화면의 선명함을 해치지 않도록 하단 35%만 부드럽게 그라데이션 처리 */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#09090e] via-[#09090e]/75 to-transparent pointer-events-none" />

          {/* 좌측 상단 은은한 라이브 상태 뱃지 */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/65 border border-gold/30 backdrop-blur-md shadow-lg">
            <Sparkles size={13} className="text-amber-400" />
            <span className="text-xs font-bold text-white/95">
              AI Agent Workflows · Content Timelines · Sales Funnels
            </span>
          </div>

          {/* 하단 오버레이 HUD 바 (데스크톱: 이미지 하단에 일체형으로 배치) */}
          <div className="hidden md:flex absolute inset-x-0 bottom-0 z-10 p-6 items-end justify-between gap-6">
            <div className="grid grid-cols-3 gap-3 flex-1 max-w-2xl">
              {HERO_METRICS.map((metric, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2.5 rounded-xl bg-black/75 border border-white/15 backdrop-blur-md shadow-lg"
                >
                  <span className="block text-[11px] text-white/60 font-medium">
                    {metric.label}
                  </span>
                  <span className={`text-sm font-extrabold font-mono tracking-tight ${metric.color}`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/programs"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 font-black text-sm hover:brightness-110 shadow-lg shadow-gold/25 transition-all transform hover:-translate-y-0.5"
              >
                <span>지금 자동화 시작하기</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* 모바일/태블릿 전용 하단 정보 바 (모바일에서 이미지 가림 방지) */}
        <div className="md:hidden p-4 bg-[#0b0b12] border-t border-white/10 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {HERO_METRICS.map((metric, idx) => (
              <div
                key={idx}
                className="px-2.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-center"
              >
                <span className="block text-[10px] text-white/55 truncate">{metric.label}</span>
                <span className={`text-[11px] font-extrabold font-mono ${metric.color}`}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/programs"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs"
          >
            <Zap size={14} />
            <span>84개 자동화 솔루션 시작하기</span>
            <ChevronRight size={14} />
          </Link>
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
