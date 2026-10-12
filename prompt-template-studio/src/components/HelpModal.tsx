"use client";

import { X, BookOpen, Sparkles, Play, HardDrive, CheckCircle2 } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                💡 AI 프롬프트 템플릿 자동화 가이드
              </h3>
              <p className="text-[11px] text-slate-500">
                변수 기반 프롬프트 템플릿 구축 및 원클릭 실행 안내
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-600 leading-relaxed">
          {/* 1. 동적 변수 문법 */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1.5">
            <h4 className="font-black text-blue-900 text-xs flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600" />
              동적 변수(Variable) 문법 안내
            </h4>
            <p className="text-slate-700">
              프롬프트 템플릿 본문 작성 시, 상황에 따라 바뀌어야 하는 단어나 문장에 중괄호 2개 <code className="font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">{"{{변수명}}"}</code>을 감싸주세요.
            </p>
            <div className="p-2.5 bg-white rounded-lg border border-blue-200 font-mono text-[11px] text-slate-800">
              당신은 <span className="text-blue-600 font-bold">{"{{role}}"}</span>입니다. <span className="text-blue-600 font-bold">{"{{topic}}"}</span>에 대해 <span className="text-blue-600 font-bold">{"{{tone}}"}</span>한 어조로 작성해주세요.
            </div>
          </div>

          {/* 2. AI 3단 어시스턴트 */}
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Sparkles size={14} className="text-blue-600" />
              제작 시 AI 3단 제안 기능
            </h4>
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-blue-600 shrink-0 mt-0.5" />
                <span><strong>제목 AI 제안</strong>: 본문과 설명을 분석하여 가장 직관적인 제목을 추천합니다.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-blue-600 shrink-0 mt-0.5" />
                <span><strong>설명 AI 제안</strong>: 프롬프트의 목적과 특징을 명확한 한 문장으로 요약합니다.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-blue-600 shrink-0 mt-0.5" />
                <span><strong>템플릿 본문 AI 제안</strong>: 제목과 설명을 바탕으로 <code className="text-blue-600 font-bold">{"{{변수}}"}</code>가 포함된 완성형 프롬프트를 자동으로 설계합니다.</span>
              </li>
            </ul>
          </div>

          {/* 3. AI 변수 자동 채우기 & 원클릭 실행 */}
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Play size={14} className="text-emerald-600 fill-current" />
              실행 시 AI 자동 채우기 & 원클릭 실행
            </h4>
            <p className="text-slate-600">
              프롬프트 카드의 <strong>[▶ 실행]</strong> 버튼을 누르면 변수 입력창이 나타납니다. 직접 입력할 수도 있고, <strong>[AI 자동 채우기]</strong> 버튼을 누르면 AI가 프롬프트 맥락에 꼭 맞는 현실적인 예시 데이터를 자동으로 쏙 채워줍니다.
            </p>
          </div>

          {/* 4. 백업 및 복원 */}
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <HardDrive size={14} className="text-purple-600" />
              라이브러리 백업 및 복원
            </h4>
            <p className="text-slate-600">
              좌측 메뉴의 <strong>[백업 &amp; 동기화]</strong>를 통해 보관된 전체 프롬프트를 표준 JSON 파일로 안전하게 다운로드하거나 언제든 다시 복원할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 닫기 버튼 */}
        <div className="p-4 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
