"use client";

import React from "react";
import { HelpCircle, X, Sparkles, Check, Wand2, RefreshCw } from "lucide-react";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">AI 올인원 그래픽 자동화 완벽 가이드</h2>
              <p className="text-[11px] text-slate-500">19개 직군 123종 프리셋 및 스마트 에디터 활용법</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 스크롤 */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 text-xs text-slate-600 leading-relaxed">
          {/* 섹션 1: 3단계 워크플로우 */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              1. 3단계 초고속 제작 워크플로우
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 mb-1">STEP 1. 템플릿 선택</div>
                <p className="text-[11px] text-slate-500">
                  사이드바에서 내 직군(개발, 게임, 마케팅, 커머스 등)을 고르고 123종의 전문 프리셋 중 목적에 맞는 카드를 클릭합니다.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 mb-1">STEP 2. 옵션 & 파일 첨부</div>
                <p className="text-[11px] text-slate-500">
                  화풍(실사/3D/애니 등), 비율, 해상도를 고르고 기획서 파일(.txt, .md, .pdf)을 첨부하여 <strong>[AI 자동 입력]</strong>을 누릅니다.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 mb-1">STEP 3. 생성 & 매직 편집</div>
                <p className="text-[11px] text-slate-500">
                  나노바나나 엔진으로 1초 만에 렌더링하고, 필요 시 마스크 브러시로 원하는 부분만 칠해 부분 수정/삭제를 완성합니다.
                </p>
              </div>
            </div>
          </div>

          {/* 섹션 2: AI 입력 도우미 혁신 기능 */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-2">
            <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
              <Wand2 className="w-4 h-4 text-amber-600" />
              AI 입력 도우미: 기획서 한 장으로 입력창 원클릭 완성
            </h4>
            <p className="text-[11.5px] text-amber-800">
              제품 사양서, 회의록, 기획서 메모 파일(.txt, .md, .json, .pdf)이나 이미지를 드래그해 올리고 <strong>[AI 자동 입력]</strong> 버튼을 누르면,
              AI가 문서를 정밀 분석하여 필요한 세부 필드(컨셉, 색상, 키워드)를 100% 자동으로 채워줍니다!
            </p>
          </div>

          {/* 섹션 3: 스마트 매직 에디터 활용법 */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              2. 스마트 매직 에디터 (인페인팅 & 아웃페인팅)
            </h3>
            <ul className="space-y-2 pl-1">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>브러시 마스크 인페인팅:</strong> 편집 모드에서 브러시로 특정 객체(예: 배경의 사물, 모델의 옷, 로고 등)를 칠하고 프롬프트(예: &apos;선글라스 씌워줘&apos;, &apos;삭제하고 깔끔하게 배경 채워줘&apos;)를 입력하면 해당 영역만 마법처럼 수정됩니다.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>지능형 아웃페인팅:</strong> 1:1 이미지를 16:9 와이드로 비율 변경 시 피사체는 중앙에 자연스럽게 유지되고 주변 배경이 인공지능으로 확장 채워집니다.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>초근접 매크로 줌:</strong> 사진에서 확대하고 싶은 지점을 원형 포커스로 지정하면 미세 표면 질감과 텍스처를 극세사 수준으로 클로즈업 렌더링합니다.
                </span>
              </li>
            </ul>
          </div>

          {/* 섹션 4: 본인 API 키 연동 원칙 */}
          <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 text-slate-700 text-[11px] space-y-1">
            <div className="font-bold text-slate-900">🔒 100% 독립된 회원 본인 API 키 연동 원칙</div>
            <p>
              AIMaster의 모든 프로그램은 회원 본인의 Google Gemini API 키로 직접 동작합니다.
              타인과 할당량을 공유하지 않으므로 무제한 고속 생성이 가능하며, 데이터는 안전하게 보장됩니다.
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors text-xs"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
