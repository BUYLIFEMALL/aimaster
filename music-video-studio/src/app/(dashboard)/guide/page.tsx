"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Music2,
  Film,
  Layers,
  Video,
  Key,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Sliders,
  FileCode2,
  Download,
} from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "음악 생성(Suno)과 비디오 생성(Veo)은 어떻게 연결되나요?",
    a: "1단계에서 음악 기획 및 가사를 작성하고 Suno용 스타일 태그를 추출합니다. Suno(suno.com)에서 음악을 생성한 후, 2단계에서 가사를 타임라인 및 씬별로 나누어 3단계에서 Google Veo를 통해 장면별 비디오 클립을 완성하게 됩니다. 최종적으로 비디오 편집 툴(캡컷, 프리미어 등)에서 Suno 음원과 Veo 클립을 합쳐 완벽한 뮤직비디오를 완성할 수 있습니다.",
  },
  {
    q: "Google Veo 비디오 생성 비용은 어떻게 청구되나요?",
    a: "이 프로그램은 회원님 본인의 Google Gemini API 키로 직접 실행됩니다. Veo 3.1 모델은 초당 약 $0.05(한화 약 70원)의 비용이 구글 클라우드 계정에 직접 청구됩니다. 씬 제작 전 예상 비용이 원화와 달러로 표시되므로 사전에 과금 규모를 안전하게 확인하고 진행하실 수 있습니다.",
  },
  {
    q: "심리스 무한 루프(Seamless Loop) 영상은 무엇인가요?",
    a: "심리스 루프는 영상의 첫 프레임(이미지)과 마지막 프레임이 매끄럽게 연결되어 반복 재생 시 끊김이 없는 비디오입니다. 유튜브 쇼츠, 틱톡, 인스타그램 릴스 배경 영상이나 음악 플레이리스트 화면에 최적화되어 있습니다.",
  },
  {
    q: "장면 이미지만 먼저 생성해보고 비디오는 나중에 만들어도 되나요?",
    a: "네, 전적으로 가능합니다! 이미지 생성은 Gemini 나노바나나 엔진을 통해 저비용/무료 할당량으로 빠르게 확인하실 수 있습니다. 이미지들의 연출과 비주얼 스타일이 마음에 들었을 때 원하는 장면에만 선택적으로 Veo 비디오 렌더링을 실행할 수 있습니다.",
  },
  {
    q: "전체 프로젝트 ZIP 파일에는 어떤 파일들이 포함되나요?",
    a: "작성하신 전체 가사(lyrics.txt), Suno 음악 프롬프트(suno-style.txt), 각 장면별 텍스트 프롬프트(storyboard.txt), 생성된 고화질 이미지(scene-01.jpg 등), 그리고 렌더링된 MP4 비디오 클립들이 하나의 압축 파일로 일괄 정리되어 다운로드됩니다.",
  },
];

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* 히어로 비주얼 배너 */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#0c1527] via-[#091122] to-[#12081c] p-6 sm:p-10 shadow-2xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 right-24 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-3.5 py-1 text-xs font-bold text-pink-400">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>AI Music Video Deck Master Guide</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            AI 음악 & 시네마틱 뮤직비디오
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
              완벽 프로덕션 가이드북
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            가사 기획부터 Suno 음악 생성, 비주얼 스토리보드 자동 분할, 그리고 Google Veo 고화질 비디오 렌더링까지 이어지는 4단계 완벽 워크플로우를 안내합니다.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <Link
              href="/music"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 px-5 py-2.5 text-xs font-bold text-white shadow-[0_0_16px_rgba(244,63,94,0.4)] hover:brightness-110 transition-all"
            >
              <Music2 className="h-4 w-4" />
              <span>1단계 음악 기획 시작하기</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-slate-800 transition-all"
            >
              <Key className="h-3.5 w-3.5" />
              <span>Gemini API 키 등록 콘솔</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4단계 파이프라인 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          <h2 className="text-base font-bold text-slate-100">4단계 뮤직비디오 제작 파이프라인</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* STEP 1 */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5 space-y-3 hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-cyan-400">STEP 01</span>
              <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
                <Music2 className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-slate-200">음악 & 가사 기획</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              장르, 템포, 무드, 보컬 스타일을 정하고 Gemini AI로 풀 가사와 Suno용 음악 프롬프트를 자동 생성합니다.
            </p>
            <div className="rounded-lg bg-slate-950/60 p-2.5 text-[11px] text-slate-400 border border-slate-800/80">
              💡 팁: 생성된 프롬프트를 Suno.com에 붙여넣어 실제 음원을 생성하세요.
            </div>
          </div>

          {/* STEP 2 */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5 space-y-3 hover:border-pink-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-pink-400">STEP 02</span>
              <div className="rounded-lg bg-pink-500/10 p-2 text-pink-400">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-slate-200">스토리보드 분할</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              가사를 타임라인 구간(Scene)으로 분할하고, 각 장면의 카메라 앵글과 비주얼 묘사 프롬프트를 자동으로 추출합니다.
            </p>
            <div className="rounded-lg bg-slate-950/60 p-2.5 text-[11px] text-slate-400 border border-slate-800/80">
              💡 아트 스타일(시네마틱 8K, 사이버펑크 애니, 실사 등)을 선택할 수 있습니다.
            </div>
          </div>

          {/* STEP 3 */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5 space-y-3 hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-purple-400">STEP 03</span>
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                <Film className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-slate-200">장면 이미지 생성</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gemini 나노바나나 엔진을 통해 각 장면에 어울리는 시네마틱 이미지를 고화질로 일괄 생성합니다.
            </p>
            <div className="rounded-lg bg-slate-950/60 p-2.5 text-[11px] text-slate-400 border border-slate-800/80">
              💡 16:9 가로형 영상(유튜브) 또는 9:16 세로형(쇼츠) 비율 지원.
            </div>
          </div>

          {/* STEP 4 */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5 space-y-3 hover:border-rose-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-rose-400">STEP 04</span>
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
                <Video className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-slate-200">Veo 비디오 렌더링</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              생성된 이미지를 기반으로 Google Veo 3.1 비디오 모션을 합성하고, 전체 에셋을 ZIP 패키지로 다운로드합니다.
            </p>
            <div className="rounded-lg bg-slate-950/60 p-2.5 text-[11px] text-slate-400 border border-slate-800/80">
              💡 심리스 루프 On 설정 시 쇼츠 배경용 무한 반복 클립 제작 가능!
            </div>
          </div>
        </div>
      </div>

      {/* Suno & Veo 노하우 섹션 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Suno 음악 생성 치트시트 */}
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-300">
            <Sliders className="h-5 w-5" />
            <h3 className="text-sm font-bold">Suno AI 음악 프롬프트 치트시트</h3>
          </div>
          <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <p>
              Suno v3/v3.5 모델에서 완성도 높은 곡을 얻으려면 다음 태그 구조를 사용하는 것이 좋습니다:
            </p>
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 font-mono text-[11px] text-cyan-200 space-y-1">
              <div>[Verse 1] 잔잔한 비트와 멜로디 전개</div>
              <div>[Pre-Chorus] 긴장감 고조, 드럼 빌드업</div>
              <div>[Chorus] 폭발적인 메인 훅과 에너지</div>
              <div>[Verse 2] 추가 악기 편성 변주</div>
              <div>[Chorus] 코러스 반복</div>
              <div>[Outro] 페이드아웃 또는 인상적인 엔딩</div>
            </div>
            <p className="text-slate-400">
              스타일 창에는 <code className="text-pink-300">k-pop, energetic synth, atmospheric guitar, punchy drums</code>처럼
              악기와 분위기를 쉼표로 나열하면 효과적입니다.
            </p>
          </div>
        </div>

        {/* Google Veo 영상 렌더링 팁 */}
        <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-6 space-y-4">
          <div className="flex items-center gap-2 text-pink-300">
            <Zap className="h-5 w-5" />
            <h3 className="text-sm font-bold">Google Veo 영상 생성 및 루프 노하우</h3>
          </div>
          <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <p>
              Google Veo 엔진을 활용할 때 비용을 아끼고 영상 퀄리티를 극대화하는 핵심 팁입니다:
            </p>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>이미지 기반 모션 우선:</strong> 텍스트만으로 영상을 만들기보다, 3단계에서 확정된 이미지를 바탕으로 영상을 생성하면 시각적 일관성이 유지됩니다.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>심리스 무한 루프 활용:</strong> 쇼츠나 릴스는 8초 심리스 루프를 On으로 설정하면 처음과 끝이 매끄럽게 이어져 시청 지속시간이 비약적으로 상승합니다.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>선별적 렌더링:</strong> 모든 장면을 한 번에 비디오로 만들기 전에, 주요 하이라이트 씬 1~2개만 먼저 렌더링하여 모션 품질을 확인하세요.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* API 키 과금 및 보안 안내 */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 space-y-3">
        <div className="flex items-center gap-2 text-amber-300">
          <ShieldCheck className="h-5 w-5" />
          <h3 className="text-sm font-bold">Google Gemini API 키 연동 및 요금 정책 안내</h3>
        </div>
        <p className="text-xs text-amber-200/90 leading-relaxed">
          AIMaster의 불변 원칙에 따라, 본 프로그램은 <strong>회원님 본인의 Gemini API 키로만 동작</strong>하며 관리자나 다른 회원의 키를 공용으로 사용하지 않습니다.
          <br />
          Veo 비디오 모델은 구글 클라우드 결제(Pay-as-you-go)가 활성화되어 있어야 API 호출이 승인됩니다. 비용은 구글에서 직접 청구되며, 프로그램 내에서 예상 비용을 달러와 원화로 사전 고지해 드립니다.
        </p>
      </div>

      {/* 자주 묻는 질문 (FAQ) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100">자주 묻는 질문 (FAQ)</h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-4 text-left text-xs sm:text-sm font-bold text-slate-200 hover:text-cyan-300"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                      isOpen ? "rotate-180 text-cyan-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-800/80 bg-slate-950/40 p-4 text-xs text-slate-300 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
