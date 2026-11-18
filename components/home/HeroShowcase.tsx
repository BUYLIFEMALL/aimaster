"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  ChevronRight,
  Activity,
  Cpu,
  Zap,
} from "lucide-react";

interface HeroConcept {
  id: "studio" | "briefing" | "office";
  title: string;
  badge: string;
  badgeColor: string;
  subtitle: string;
  description: string;
  imageSrc: string;
  metrics: { label: string; value: string; color: string }[];
  primaryCtaText: string;
  primaryCtaUrl: string;
  categoryTag: string;
}

const HERO_CONCEPTS: HeroConcept[] = [
  {
    id: "studio",
    title: "에디토리얼 마케팅 워크스테이션",
    badge: "🖥️ 1안 · 워크스테이션",
    badgeColor: "border-amber-400/40 bg-amber-500/10 text-amber-300",
    subtitle: "정제된 데이터 관제와 크리에이티브 자동화의 정점",
    description:
      "월넛과 브라스 조명의 차분한 워크스테이션 환경에서 블로그·SNS·영상·쇼핑몰을 아우르는 84개 AI 자동화 파이프라인을 직관적으로 제어합니다.",
    imageSrc: "/images/hero/v2_concept_1_studio.jpg",
    metrics: [
      { label: "AI 가동 솔루션", value: "84개 정식 엔진", color: "text-amber-400" },
      { label: "콘텐츠 생산 속도", value: "10배 단축 (30초)", color: "text-emerald-400" },
      { label: "보안 & 암호화", value: "100% 본인 키 연동", color: "text-sky-400" },
    ],
    primaryCtaText: "AI 솔루션 둘러보기",
    primaryCtaUrl: "/programs",
    categoryTag: "프로페셔널 AI 마케팅 워크스테이션",
  },
  {
    id: "briefing",
    title: "이그제큐티브 데이터 브리핑",
    badge: "💼 2안 · 데이터 브리핑",
    badgeColor: "border-amber-300/40 bg-amber-400/10 text-amber-200",
    subtitle: "전문가의 통찰과 실시간 AI 분석의 완벽한 결합",
    description:
      "어디서나 노트북 한 대로 실시간 트래픽·매출 지표와 경쟁사 분석 데이터를 확보하고, 원클릭으로 콘텐츠 생성부터 자동 발행까지 완결합니다.",
    imageSrc: "/images/hero/v2_concept_2_briefing.jpg",
    metrics: [
      { label: "플랫폼 연동", value: "네이버·인스타·유튜브", color: "text-amber-300" },
      { label: "자동화 완결도", value: "기획부터 발행까지", color: "text-emerald-400" },
      { label: "비용 절감율", value: "외주 대비 90%↓", color: "text-amber-400" },
    ],
    primaryCtaText: "SNS & 마케팅 자동화 보기",
    primaryCtaUrl: "/programs?category=sns",
    categoryTag: "비즈니스 리더를 위한 데이터 브리핑",
  },
  {
    id: "office",
    title: "미니멀 럭셔리 CEO 오피스",
    badge: "🏢 3안 · CEO 오피스",
    badgeColor: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
    subtitle: "단정하고 여유로운 공간, 24시간 멈추지 않는 자동화",
    description:
      "복잡한 수작업은 AI 시스템에 맡기고 오너는 핵심 의사결정에만 집중할 수 있는 시간의 자유와 비즈니스의 품격을 제공합니다.",
    imageSrc: "/images/hero/v2_concept_3_office.jpg",
    metrics: [
      { label: "가동 시간", value: "24시간 365일 무중단", color: "text-emerald-400" },
      { label: "반복 업무 감소", value: "주당 25시간 절약", color: "text-amber-400" },
      { label: "글로벌 AI 모델", value: "GPT·Claude·Gemini", color: "text-sky-400" },
    ],
    primaryCtaText: "무료 체험 솔루션 시작",
    primaryCtaUrl: "/programs?badge=free",
    categoryTag: "시간의 자유를 선사하는 올인원 자동화",
  },
];

export default function HeroShowcase() {
  const [activeTab, setActiveTab] = useState<"studio" | "briefing" | "office">("studio");
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // 7초마다 다음 콘셉트로 부드럽게 자동 전환
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setActiveTab((prev) => {
        if (prev === "studio") return "briefing";
        if (prev === "briefing") return "office";
        return "studio";
      });
    }, 7000);
    return () => clearInterval(timer);
  }, [isAutoPlay]);

  const current = HERO_CONCEPTS.find((c) => c.id === activeTab) || HERO_CONCEPTS[0];

  return (
    <div
      className="w-full max-w-5xl mx-auto mt-8 mb-6 px-2 sm:px-4"
      onMouseEnter={() => setIsAutoPlay(false)}
      onMouseLeave={() => setIsAutoPlay(true)}
    >
      {/* 쇼케이스 메인 글래스 프레임 */}
      <div className="relative rounded-3xl border border-gold/30 bg-[#0d0d14]/95 backdrop-blur-2xl shadow-2xl shadow-gold/10 overflow-hidden transition-all duration-700">
        {/* 상단 윈도우 헤더 & 콘셉트 셀렉터 탭 */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-white/10 px-4 py-3 bg-black/40 gap-3 backdrop-blur-md">
          {/* 상태 표시등 */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-white/10 text-[11px] font-mono text-white/60">
              <Activity size={12} className="text-emerald-400 animate-pulse" />
              <span>AI Master Live Ops · 84 Programs Active</span>
            </div>
          </div>

          {/* 3대 실사 콘셉트 선택 탭 */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/10 w-full sm:w-auto overflow-x-auto">
            {HERO_CONCEPTS.map((concept) => {
              const isActive = activeTab === concept.id;
              return (
                <button
                  key={concept.id}
                  type="button"
                  onClick={() => setActiveTab(concept.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-amber-400/20 via-yellow-400/20 to-amber-500/20 text-gold border border-gold/50 shadow-[0_0_16px_rgba(245,158,11,0.25)] scale-[1.02]"
                      : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span>{concept.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 메인 히어로 실사 비주얼 캔버스 */}
        <div className="relative min-h-[380px] sm:min-h-[460px] md:min-h-[500px] flex flex-col justify-end p-5 sm:p-8 overflow-hidden group">
          {/* 실사 배경 이미지 (부드러운 크로스페이드) */}
          {HERO_CONCEPTS.map((concept) => (
            <div
              key={concept.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                activeTab === concept.id ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
              }`}
            >
              <Image
                src={concept.imageSrc}
                alt={concept.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover object-center filter brightness-[0.82] contrast-[1.05] transition-transform duration-10000 ease-out group-hover:scale-105"
              />
              {/* 비주얼 오버레이 그라데이션 (가독성 & 깊이감 확보) */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#09090e] via-[#09090e]/55 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#09090e]/75 via-transparent to-[#09090e]/30" />
            </div>
          ))}

          {/* 콘텐츠 글래스 오버레이 정보 카드 */}
          <div className="relative z-10 max-w-2xl text-left space-y-3.5 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {/* 상단 뱃지 & 카테고리 태그 */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${current.badgeColor}`}
              >
                <Sparkles size={12} />
                <span>{current.categoryTag}</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-[11px] text-white/70 font-mono backdrop-blur-md">
                <Cpu size={11} className="text-amber-400" />
                <span>Enterprise Workflow</span>
              </span>
            </div>

            {/* 메인 타이틀 */}
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md">
              {current.title}
            </h3>

            {/* 서브 설명 문구 */}
            <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-medium drop-shadow-sm line-clamp-2 sm:line-clamp-none">
              {current.description}
            </p>

            {/* 3대 핵심 메트릭스 HUD 바 */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
              {current.metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 sm:py-2.5 rounded-xl bg-black/65 border border-white/15 backdrop-blur-md shadow-inner flex flex-col justify-center"
                >
                  <span className="text-[10px] sm:text-[11px] text-white/55 font-medium truncate">
                    {metric.label}
                  </span>
                  <span className={`text-xs sm:text-sm font-extrabold font-mono tracking-tight ${metric.color}`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>

            {/* 하단 액션 버튼 그룹 */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={current.primaryCtaUrl}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 font-black text-xs sm:text-sm hover:brightness-110 shadow-lg shadow-gold/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span>{current.primaryCtaText}</span>
                <ChevronRight size={16} />
              </Link>
              <Link
                href="/programs"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all cursor-pointer"
              >
                <Zap size={14} className="text-amber-400" />
                <span>전체 84개 솔루션 카탈로그</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 하단 툴팁 배너 */}
        <div className="border-t border-white/10 px-4 py-3 bg-black/60 flex flex-col sm:flex-row items-center justify-between text-xs text-subtext gap-2">
          <div className="flex items-center gap-2 text-white/70">
            <Layers size={13} className="text-gold" />
            <span>상단 탭을 클릭하여 3가지 실사 비주얼 콘셉트를 실시간으로 전환해 볼 수 있습니다.</span>
          </div>
          <Link
            href="/programs"
            className="text-gold/90 hover:text-gold transition-colors font-semibold flex items-center gap-1"
          >
            <span>검증된 AI 마케팅 솔루션 바로가기</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
