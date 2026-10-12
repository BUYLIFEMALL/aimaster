"use client";

import { X, BookOpen, Sparkles, Layers, Sliders, Image as ImageIcon, CheckCircle2 } from "lucide-react";

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpGuideModal({ isOpen, onClose }: HelpGuideModalProps) {
  if (!isOpen) return null;

  const STEPS = [
    {
      step: 1,
      title: "이미지 업로드 및 소스 선택",
      desc: "분석하고 싶은 레퍼런스 이미지를 업로드 영역에 드래그하거나 클릭하여 선택합니다.",
      icon: ImageIcon,
    },
    {
      step: 2,
      title: "시퀀싱 모드 및 변이 조절",
      desc: "'유전자 복제'로 1:1 구도와 스타일을 완전 재현하거나, '유전자 변이' 모드에서 돌연변이 레벨(0-30%: Stable, 31-70%: Hybrid, 71-100%: Chaotic)을 조절하여 창의적으로 재해석합니다.",
      icon: Sliders,
    },
    {
      step: 3,
      title: "프롬프트 복사 및 [첨부 이미지] 연동",
      desc: "해독된 국문/영문 마스터 프롬프트를 원클릭으로 복사할 수 있습니다. '첨부 이미지 제공'을 켜면 원본 이미지를 시맨틱 스타일 앵커로 직접 참조하는 고도화된 프롬프트가 생성됩니다.",
      icon: Layers,
    },
    {
      step: 4,
      title: "미세 보정 (리파이닝)",
      desc: "결과 화면 하단 피드백 박스에 원하는 수정사항을 입력하여 추출된 DNA와 프롬프트를 실시간으로 교정할 수 있습니다.",
      icon: Sparkles,
    },
    {
      step: 5,
      title: "결과 테스트 및 이미지 합성",
      desc: "'결과 테스트'에서 피사체를 대입하거나 프롬프트를 직접 편집하여 즉석에서 이미지를 생성하고 원본과 색감 일치율을 비교합니다.",
      icon: CheckCircle2,
    },
  ];

  const TIPS = [
    "Gemini / OpenAI / Claude API 키는 회원 본인의 키로 연동되어 안전하게 보호됩니다.",
    "유전자 변이 기능은 레벨이 높을수록 원본의 기본 구도 축만 유지한 채 완전히 새로운 질감과 미학적 DNA를 주입합니다.",
    "화면 비율(AR)은 업로드된 이미지의 실제 픽셀 비율(16:9, 1:1, 9:16 등 12종)을 자동 감지하여 프롬프트에 자연어로 자동 통합됩니다.",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white shadow-2xs">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">스타일 DNA 분석기 v3 도움말 & 가이드</h2>
              <p className="text-[11px] text-slate-500 font-medium">시각적 DNA 해독 및 프롬프트 재현 프레임워크</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* 시스템 개요 */}
          <div className="rounded-xl bg-violet-50/60 border border-violet-100 p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-violet-800 mb-1">시스템 개요</h3>
            <p className="text-xs leading-relaxed text-slate-700">
              스타일 DNA 분석기는 AI를 사용하여 이미지의 시각적 요소를 정밀하게 해독하고, 이를 재현 가능한 프레임워크로 변환하는 전문 도구입니다. 복잡한 스타일, 조명, 구도, 카메라 설정을 수치화하여 자신만의 독창적인 생성 이미지를 만들 수 있도록 돕습니다.
            </p>
          </div>

          {/* 단계별 가이드 */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span>단계별 사용 가이드</span>
            </h3>
            <div className="space-y-2.5">
              {STEPS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.step} className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-violet-200 transition-colors">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 font-black text-xs">
                      {s.step}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                        <Icon className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                        <span>{s.title}</span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 핵심 팁 */}
          <div className="rounded-xl bg-amber-50/60 border border-amber-200/80 p-4 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
              <span>💡 핵심 팁 & 활용 노하우</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-amber-950/80">
              {TIPS.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-amber-500 font-bold shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end px-6 py-3 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
