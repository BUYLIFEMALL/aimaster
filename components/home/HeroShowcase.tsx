"use client";

import { useState, useEffect } from "react";
import { Sparkles, Layers, Sliders, Play, CheckCircle2, ChevronRight, Activity, Terminal } from "lucide-react";

interface ShowcaseTab {
  id: "focus" | "neon" | "wizard";
  title: string;
  badge: string;
  subtitle: string;
  programName: string;
  programUrl: string;
  ctaText: string;
}

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    id: "focus",
    title: "포커스 스튜디오",
    badge: "🎯 Focus Studio",
    subtitle: "시각적 캔버스 & 원클릭 하이퍼 컨트롤",
    programName: "AI 이미지 스튜디오",
    programUrl: "https://ai-image-studio.buylife.xyz",
    ctaText: "AI 이미지 스튜디오 바로 시작하기",
  },
  {
    id: "neon",
    title: "네온 마케팅 콘솔",
    badge: "⚡ Neon Console",
    subtitle: "실시간 알고리즘 추적 & 데이터 파이프라인",
    programName: "Threads 콘텐츠 운영 자동화",
    programUrl: "https://threads-content-ops.buylife.xyz",
    ctaText: "Threads 운영 자동화 즉시 실행하기",
  },
  {
    id: "wizard",
    title: "인터랙티브 위저드",
    badge: "🧙 Step Wizard",
    subtitle: "초보자도 1분 만에 완성하는 단계별 생성기",
    programName: "유튜브 쇼츠 자동 생성기",
    programUrl: "https://youtube-shorts-maker.buylife.xyz",
    ctaText: "유튜브 쇼츠 위저드 바로 시작하기",
  },
];

export default function HeroShowcase() {
  const [activeTab, setActiveTab] = useState<"focus" | "neon" | "wizard">("focus");
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // 6초마다 다음 쇼케이스 탭으로 자동 순환
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setActiveTab((prev) => {
        if (prev === "focus") return "neon";
        if (prev === "neon") return "wizard";
        return "focus";
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlay]);

  const scrollToCatalog = () => {
    const el = document.getElementById("program-catalog");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      className="w-full max-w-4xl mx-auto mt-10 mb-4 px-2 sm:px-4"
      onMouseEnter={() => setIsAutoPlay(false)}
      onMouseLeave={() => setIsAutoPlay(true)}
    >
      {/* 쇼케이스 외곽 글래스 프레임 */}
      <div className="relative rounded-2xl border border-gold/30 bg-[#0d0d14]/90 backdrop-blur-xl shadow-2xl shadow-gold/5 overflow-hidden transition-all duration-500">
        {/* 상단 윈도우 컨트롤 바 & 탭 스위처 */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-white/10 px-4 py-3 bg-white/[0.02] gap-3">
          {/* 창 컨트롤 도트 & 라이브 상태 */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[11px] font-mono text-white/50 flex items-center gap-1 pl-2 border-l border-white/10">
              <Activity size={12} className="text-emerald-400 animate-pulse" />
              <span>AI Engine Active · 84 Solutions</span>
            </span>
          </div>

          {/* 3대 템플릿 전환 탭 버튼 */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10 w-full sm:w-auto overflow-x-auto">
            {SHOWCASE_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-amber-400/20 to-yellow-400/20 text-gold border border-gold/40 shadow-sm"
                      : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span>{tab.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 메인 쇼케이스 콘텐츠 영역 */}
        <div className="p-4 sm:p-6 min-h-[280px] flex flex-col justify-between">
          {activeTab === "focus" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 text-[11px] font-bold border border-amber-400/30 mb-1">
                    <span>🎯 Focus Studio Architecture</span>
                  </div>
                  <h4 className="text-lg font-bold text-white">비주얼 몰입형 포커스 스튜디오</h4>
                  <p className="text-xs text-subtext">AI 이미지 생성기, 턴테이블, 그래픽 스튜디오 등 결과물 중심의 원클릭 뷰</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-1 rounded bg-black/50 border border-gold/20 text-gold">16:9 / 1:1 Live Preview</span>
                </div>
              </div>

              {/* 스튜디오 프리뷰 모형 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.03] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white/90">
                    <span className="flex items-center gap-1.5"><Sliders size={13} className="text-gold" />스타일 파라미터</span>
                    <span className="text-[10px] text-emerald-400">Customized</span>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-white/70">
                    <div className="flex justify-between p-1.5 rounded bg-black/30 border border-white/5">
                      <span>화풍 & 조명</span>
                      <span className="text-gold font-mono">Cinematic 8K</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-black/30 border border-white/5">
                      <span>시선 타깃</span>
                      <span className="text-white/90">MZ 세대 고관여</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 p-3.5 rounded-xl border border-gold/20 bg-gradient-to-br from-gold/5 via-black/40 to-transparent flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gold flex items-center gap-1.5">
                      <Sparkles size={13} />고품질 비주얼 생성 캔버스
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      실시간 렌더링 준비완료
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed">
                    프롬프트 작성부터 모델별 파라미터 조율, 초고화질 업스케일링 및 소셜 포맷 변환까지 한 화면에서 실시간으로 시각화됩니다.
                  </p>
                  <div className="mt-3 pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-subtext">
                    <span>지원: Gemini Nano Banana 2.1, Flux, Midjourney</span>
                    <a
                      href="https://ai-image-studio.buylife.xyz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-bold text-xs hover:brightness-110 shadow-sm shadow-gold/20 transition-all cursor-pointer"
                    >
                      <span>🎨 AI 이미지 스튜디오 바로 시작하기</span>
                      <ChevronRight size={13} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "neon" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-300 text-[11px] font-bold border border-cyan-400/30 mb-1">
                    <span>⚡ Neon Console Architecture</span>
                  </div>
                  <h4 className="text-lg font-bold text-white">사이버펑크 네온 마케팅 콘솔</h4>
                  <p className="text-xs text-subtext">경쟁사 벤치마킹, 쓰레드 떡상 알고리즘 추적, 외부 크롤링 자동화 엔진</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-1 rounded bg-black/50 border border-cyan-400/30 text-cyan-300">Realtime API Pipeline</span>
                </div>
              </div>

              {/* 콘솔 모형 */}
              <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-black/60 font-mono text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[11px] text-white/60">
                  <span className="flex items-center gap-1.5 text-cyan-400"><Terminal size={12} />AUTOMATION TERMINAL</span>
                  <span className="text-emerald-400">● 100% PERSONAL ENCRYPTED</span>
                </div>
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <p className="text-cyan-300">[19:15:02] ▶ 경쟁사 급상승 떡상 쇼츠 48건 알고리즘 분석 수집 완료</p>
                  <p className="text-white/80">[19:15:03] ↳ 조회수 터진 키워드 추출: &quot;소자본 부업&quot;, &quot;AI 자동화&quot; (상위 1.2% 도달률)</p>
                  <p className="text-gold">[19:15:04] ↳ Threads 자동 포스팅 파이프라인 큐 장전 완료 (예약 스케줄러 동기화)</p>
                </div>
                <div className="pt-2 border-t border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] text-cyan-200/70 font-sans">실시간 데이터 수집 및 자동 발행 파이프라인</span>
                  <a
                    href="https://threads-content-ops.buylife.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-sm shadow-cyan-400/20 transition-all cursor-pointer font-sans"
                  >
                    <span>⚡ Threads 운영 자동화 즉시 실행하기</span>
                    <ChevronRight size={13} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === "wizard" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-400/10 text-purple-300 text-[11px] font-bold border border-purple-400/30 mb-1">
                    <span>🧙 Interactive Step Wizard</span>
                  </div>
                  <h4 className="text-lg font-bold text-white">초심자를 위한 단계별 마법사</h4>
                  <p className="text-xs text-subtext">유튜브 쇼츠, 카드뉴스, 웹툰, 플레이리스트 등 복잡한 작업을 3단계로 끝내는 UI</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-1 rounded bg-black/50 border border-purple-400/30 text-purple-300">Step 1-2-3 Progress</span>
                </div>
              </div>

              {/* 위저드 모형 */}
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl border border-purple-500/40 bg-purple-500/10 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                      <CheckCircle2 size={13} className="text-purple-400" />
                      <span>STEP 1. 소재 선택</span>
                    </div>
                    <p className="text-[11px] text-white/80">주제 키워드 및 타깃 시청자 설정</p>
                  </div>

                  <div className="p-3 rounded-xl border border-gold/40 bg-gold/10 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gold">
                      <Play size={13} className="text-gold animate-pulse" />
                      <span>STEP 2. AI 대본·이미지</span>
                    </div>
                    <p className="text-[11px] text-white/80">장면별 스크립트 및 컷 자동 빌드</p>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03] space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white/60">
                      <span>STEP 3. 원클릭 렌더링</span>
                    </div>
                    <p className="text-[11px] text-white/50">자막·음성 합성 후 영상 추출</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] text-purple-200/80">초보자도 1분 만에 유튜브 떡상 숏폼 대본/영상 추출</span>
                  <a
                    href="https://youtube-shorts-maker.buylife.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-400 to-amber-300 text-slate-950 font-bold text-xs hover:brightness-110 shadow-sm shadow-purple-400/20 transition-all cursor-pointer"
                  >
                    <span>🧙 유튜브 쇼츠 위저드 바로 시작하기</span>
                    <ChevronRight size={13} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 툴팁 배너 */}
        <div className="border-t border-white/10 px-4 py-2.5 bg-black/30 flex items-center justify-between text-xs text-subtext">
          <span className="flex items-center gap-1.5">
            <Layers size={13} className="text-gold" />
            <span>총 84개 프로그램이 위 9대 표준 디자인 템플릿으로 구축되어 있습니다.</span>
          </span>
          <button
            type="button"
            onClick={scrollToCatalog}
            className="hidden sm:inline text-gold/80 hover:text-gold transition-colors font-medium cursor-pointer"
          >
            프로그램 카드의 템플릿 태그를 확인해보세요 →
          </button>
        </div>
      </div>
    </div>
  );
}
