"use client";

import React, { useState } from "react";
import {
  X,
  HelpCircle,
  TrendingUp,
  Layers,
  Eye,
  Sparkles,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { APP_VERSION, PROGRAM_NAME } from "@/lib/version";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  if (!isOpen) return null;

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const FAQS = [
    {
      q: "썸네일 이미지 렌더링 시간과 API 비용은 어떻게 되나요?",
      a: "Google Gemini 2.5 Flash / Nano Banana 최신 이미지 모델 엔진을 통해 3~6초 내외로 초고속 렌더링됩니다. Google AI Studio에서 발급받은 회원 본인의 무료 티어 API 키로도 일일 수백 장의 썸네일을 추가 비용 없이 여유롭게 제작하실 수 있습니다.",
    },
    {
      q: "실제 제 얼굴이나 특정 인물 사진을 반영할 수 있나요?",
      a: "네! 2단계 [피사체 인물 정보]에서 본인의 얼굴이나 캐릭터 사진을 [레퍼런스 이미지]로 업로드하시면, AI가 얼굴 윤곽과 헤어스타일, 분위기를 정밀 분석하여 본인이 등장하는 실감나는 썸네일 이미지를 합성합니다.",
    },
    {
      q: "생성된 썸네일의 배경이나 텍스트를 일부만 수정할 수 있나요?",
      a: "3단계 결과물 화면에서 [결과물 수정 요청] 입력창을 제공합니다. '배경을 더 어둡게 해줘', '표정을 더 놀란 표정으로 바꿔줘', '네온 조명을 강조해줘' 등 자연어로 대화하듯 피드백을 보내면 기존 구도를 유지한 채 매끄럽게 재생성됩니다.",
    },
    {
      q: "생성된 썸네일 이미지를 유튜브 수익 창출 채널에 바로 사용할 수 있나요?",
      a: "네, 생성된 모든 썸네일과 SEO 메타데이터(제목, 설명, 태그, 고정 댓글)는 유튜브 상업적 동영상, 숏폼, 쇼핑 제휴 마케팅 등 모든 곳에 자유롭게 사용 및 수익 창출이 가능합니다.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#131824] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-8 shadow-2xl border border-[#222d42] relative text-[#f8fafc]">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          aria-label="가이드 닫기"
          className="absolute top-5 right-5 z-20 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#182030] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 에디토리얼 히어로 배너 */}
        <div className="mb-7 rounded-2xl bg-gradient-to-br from-red-950/40 via-[#182030] to-amber-950/30 p-6 border border-red-500/20 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PRO THUMBNAIL CANVAS GUIDE</span>
              <span className="text-amber-400 font-mono">({APP_VERSION})</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              클릭률(CTR) 300% 극대화! <br />
              <span className="bg-gradient-to-r from-red-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                유튜브 썸네일 & SEO 메타데이터 원스톱 제작 가이드
              </span>
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              대본 분석을 통한 A/B 테스트 전략 수립부터 피사체 연출, 16:9 4K 시네마틱 렌더링, 500자 스튜디오 태그 원클릭 복사까지 한눈에 마스터하세요.
            </p>
          </div>
        </div>

        {/* 4단계 핵심 워크플로우 비주얼 카드 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-red-400" />
              4단계 핵심 제작 파이프라인
            </h3>
            <span className="text-[11px] text-slate-400">Step-by-Step Production</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-[#182030] border border-[#222d42] hover:border-red-500/40 transition-all group">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/20 text-red-400 text-xs font-black">
                  1
                </span>
                <span className="text-xs font-bold text-white group-hover:text-red-300 transition-colors">
                  대본 분석 & CTR 3대 공식
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                영상 대본이나 핵심 아이디어를 입력하면, AI가 <strong className="text-amber-300">호기심 유발형·가치 중심형·감성 후킹형</strong> 3대 A/B/C 전략을 자동 도출합니다.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-[#182030] border border-[#222d42] hover:border-amber-500/40 transition-all group">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 text-xs font-black">
                  2
                </span>
                <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                  피사체 & 비주얼 연출 설정
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                장르(브이로그, 지식, 쇼츠 등)와 10종의 조명/분위기, 피사체 인물(성별, 연령대, 표정 및 본인 얼굴 참고 사진)을 섬세하게 커스텀합니다.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-[#182030] border border-[#222d42] hover:border-red-500/40 transition-all group">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/20 text-red-400 text-xs font-black">
                  3
                </span>
                <span className="text-xs font-bold text-white group-hover:text-red-300 transition-colors">
                  16:9 고화질 렌더링 & 피드백
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                시네마틱 16:9 비율의 초고화질 썸네일을 즉시 생성하며, 마음에 들지 않는 디테일은 대화형 수정 요청으로 자연스럽게 재생성합니다.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-[#182030] border border-[#222d42] hover:border-emerald-500/40 transition-all group">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-black">
                  4
                </span>
                <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                  스튜디오 태그 & 고정 댓글 복사
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                유튜브 스튜디오 500자 한도에 최적화된 쉼표(,) 구분 태그와 시청자 댓글 참여율을 300% 높이는 고정 댓글 유도 질문을 1클릭 복사합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 클릭률(CTR) 극대화 3대 공식 */}
        <div className="mb-8 p-5 rounded-2xl bg-[#0c0f17] border border-[#222d42]">
          <h3 className="text-xs font-extrabold text-amber-400 flex items-center gap-2 uppercase tracking-wider mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            유튜브 알고리즘을 뚫는 썸네일 CTR 극대화 팁 3선
          </h3>
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">첫 3초 시선 강탈(3-Second Rule):</strong> 배경과 인물의 명도 대비(Contrast)를 강하게 주어 모바일 피드 스크롤 중 즉각적으로 시선을 붙잡으세요.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">문구는 3~5단어 이하로 압축:</strong> 영상 제목을 그대로 넣지 말고, 시청자의 궁금증이나 결핍을 찌르는 3~5단어의 강렬한 키워드만 배치하세요.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">인물 표정의 감정 극대화:</strong> 무표정보다는 놀람, 환호, 분노, 당혹감 등 극단적인 감정 표현이 담긴 표정을 활용하면 CTR이 평균 2.4배 상승합니다.
              </div>
            </div>
          </div>
        </div>

        {/* 회원 본인 API 키 등록 안내 */}
        <div className="mb-8 p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">회원 본인 Google Gemini API 키 필수 연동</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                안전한 브라우저 로컬 저장소 격리 보관 (무료 티어로 이용 가능)
              </p>
            </div>
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors whitespace-nowrap shadow-sm"
          >
            <span>무료 API키 발급받기</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* FAQ 아코디언 */}
        <div className="mb-8">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
            자주 묻는 질문 (FAQ)
          </h3>
          <div className="space-y-2">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#222d42] bg-[#182030] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-200 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-red-400 font-mono">Q.</span>
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      openFaq === idx ? "rotate-180 text-red-400" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-3.5 pb-3.5 text-xs text-slate-300 leading-relaxed border-t border-[#222d42]/60 pt-2.5 bg-[#131824]/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 하단 닫기 */}
        <div className="pt-4 border-t border-[#222d42] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-600/20"
          >
            확인했습니다 (가이드 닫기)
          </button>
        </div>
      </div>
    </div>
  );
}
