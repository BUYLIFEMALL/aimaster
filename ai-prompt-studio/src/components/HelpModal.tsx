"use client";

import { X, BookOpen, Sparkles, Layers, Wand2, ShieldCheck, CheckCircle2 } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                💡 AI Prompt 자동화 사용 가이드
              </h3>
              <p className="text-[11px] text-slate-500">
                세계 최고 수준의 메타 프롬프트 엔지니어링 활용법
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 (스크롤) */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-neutral-600 leading-relaxed">
          {/* 1. 메타 프롬프트란? */}
          <div className="p-4 rounded-xl bg-violet-50/60 border border-violet-100 space-y-1.5">
            <h4 className="font-black text-violet-900 text-xs flex items-center gap-1.5">
              <Sparkles size={14} className="text-violet-600" />
              메타 프롬프트(Meta Prompt)란 무엇인가요?
            </h4>
            <p className="text-neutral-700">
              사용자가 AI에게 직접 질문하는 대신, **&apos;AI가 최상의 답변을 내놓을 수 있도록 완벽하게 설계된 지시문&apos;**을 만들어주는 프롬프트입니다. 완성된 프롬프트를 복사하여 ChatGPT, Claude, Gemini 등에 붙여넣기만 하면 전문가 수준의 결과물을 얻을 수 있습니다.
            </p>
          </div>

          {/* 2. 5대 프로 엔지니어링 모드 */}
          <div className="space-y-3">
            <h4 className="font-black text-neutral-900 text-xs flex items-center gap-1.5 border-b border-neutral-200 pb-2">
              <Layers size={14} className="text-violet-600" />
              5대 프로 엔지니어링 모드 소개
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/40 space-y-1">
                <span className="font-black text-neutral-900 text-xs block">
                  1. RTSC 마스터
                </span>
                <p className="text-[11px] text-neutral-600">
                  Role(역할), Task(작업), Structure(출력 형식), Chain(제약 및 사고) 4대 축을 바탕으로 가장 정밀하고 신뢰도 높은 프롬프트를 구축합니다.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/40 space-y-1">
                <span className="font-black text-neutral-900 text-xs block">
                  2. 프레임워크 전문가
                </span>
                <p className="text-[11px] text-neutral-600">
                  CO-STAR, RTF, RICE, PREP, SWOT, PAS 등 세계적인 기획·컨설팅 프레임워크를 목표에 맞게 자동 선택하여 논리적인 프롬프트를 설계합니다.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/40 space-y-1">
                <span className="font-black text-neutral-900 text-xs block">
                  3. 프롬프트 아키텍트
                </span>
                <p className="text-[11px] text-neutral-600">
                  Zero-Question 원칙에 따라, 단 한 줄의 아이디어만 입력해도 AI에게 역질문 없이 한 번에 완벽한 결과를 요구하는 원샷 실행문을 완성합니다.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/40 space-y-1">
                <span className="font-black text-neutral-900 text-xs block">
                  4. Vertex AI XML
                </span>
                <p className="text-[11px] text-neutral-600">
                  Google 권장 표준 XML 태그(&lt;OBJECTIVE_AND_PERSONA&gt;, &lt;INSTRUCTIONS&gt; 등)로 모델의 지시 이행률과 제어력을 극대화합니다.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/40 space-y-1 md:col-span-2">
                <span className="font-black text-neutral-900 text-xs block">
                  5. 논리적 추론 (Chain-of-Thought)
                </span>
                <p className="text-[11px] text-neutral-600">
                  단계별 사고 체인과 &lt;thought&gt; 내부 독백 기법을 강제하여 수학, 코딩, 복잡한 비즈니스 의사결정에서 환각을 최소화하고 정답률을 극대화합니다.
                </p>
              </div>
            </div>
          </div>

          {/* 3. 단계별 AI 실시간 제안 기능 */}
          <div className="space-y-2">
            <h4 className="font-black text-neutral-900 text-xs flex items-center gap-1.5 border-b border-neutral-200 pb-2">
              <Wand2 size={14} className="text-violet-600" />
              실시간 AI 필드별 보조 버튼 활용법
            </h4>
            <ul className="space-y-1.5 text-[11px] text-neutral-600">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-violet-600 shrink-0 mt-0.5" />
                <span><strong>AI 구체화 (배경/의도 확장)</strong>: 두루뭉술한 아이디어를 구체적인 육하원칙 문장으로 즉시 확장합니다.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-violet-600 shrink-0 mt-0.5" />
                <span><strong>추천 역할 5선</strong>: 목적에 가장 부합하는 상위 5개 전문가 페르소나를 추천받아 원클릭으로 주입합니다.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-violet-600 shrink-0 mt-0.5" />
                <span><strong>작업문 자동 작성</strong>: 목적과 역할을 기반으로 실행해야 할 세부 단계별 지시사항을 자동 완성합니다.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-violet-600 shrink-0 mt-0.5" />
                <span><strong>출력 포맷 &amp; 제약 조건 추천</strong>: 마크다운 표, 요약 보고서 등 가독성 높은 서식과 사고 체인을 추천합니다.</span>
              </li>
            </ul>
          </div>

          {/* 4. 모델 기능 제한 (Capability Constraints) */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1">
            <h4 className="font-black text-amber-900 text-xs flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-amber-600" />
              모델 기능 제한 (Capability Constraints)
            </h4>
            <p className="text-[11px] text-neutral-600">
              웹 검색, 코드 실행, 이미지 생성 등을 차단해야 하는 보안/시험 환경을 위해, 프롬프트 내부 제약 조건에 해당 도구 호출 금지 지시를 철저히 주입합니다.
            </p>
          </div>
        </div>

        {/* 닫기 버튼 */}
        <div className="p-4 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
