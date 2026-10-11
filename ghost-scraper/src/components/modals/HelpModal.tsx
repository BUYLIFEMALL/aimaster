"use client";

import React from "react";
import { HelpCircle, X, CheckCircle2, ArrowRight } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GUIDE_STEPS = [
  {
    step: "01. 탐색 시작",
    title: "URL 입력 및 크롤링",
    desc: "URL 입력창에 대상 웹사이트 주소를 입력하고 '크롤링 시작'을 누르면 전체 HTML을 파싱합니다. 버튼을 누르지 않아도 '시각적 섹터 선택'을 통해 즉시 수동 추출이 가능합니다.",
  },
  {
    step: "02. 데이터 검토",
    title: "카테고리별 데이터 분류",
    desc: "추출된 데이터는 '개요', '글목록', '표', '링크', '이미지' 등으로 자동 분류됩니다. 실시간으로 데이터를 확인하고 개별 항목을 복사하거나 CSV 파일로 내려받을 수 있습니다.",
  },
  {
    step: "03. 시각적 섹터 선택 (고급)",
    title: "라이브 프리뷰 클릭 캡처",
    desc: "원하는 영역을 마우스로 클릭하여 즉시 추출합니다. [Shift + 클릭]은 목록 전체(부모 요소)를 선택하며, [Ctrl/Cmd + 클릭]은 해당 링크로 이동하여 연속 추출을 지원합니다.",
  },
  {
    step: "04. AI 지능형 분석",
    title: "Gemini 구조화 리스트 변환",
    desc: "추출된 HTML을 Gemini Flash AI에게 전달하여, 복잡한 게시판이나 상품 피드를 정형화된 JSON 데이터(순번, 제목, 링크, 썸네일)로 완벽하게 변환합니다.",
  },
  {
    step: "05. 데이터 내보내기",
    title: "JSON / CSV 파일 다운로드",
    desc: "수집된 모든 데이터는 좌측 '데이터 내보내기 (JSON)'를 통해 파일로 백업할 수 있으며, 각 탭별로 CSV 파일 또는 이미지 일괄 ZIP 다운로드를 지원합니다.",
  },
];

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">상세 사용 매뉴얼</h3>
              <p className="text-[11px] text-slate-500">
                Whbsite Scraper 5단계 워크플로우 가이드
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 가이드 목록 */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {GUIDE_STEPS.map((item, idx) => (
            <div key={idx} className="relative pl-7 border-l-2 border-indigo-200 space-y-1">
              <div className="absolute -left-[11px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white shadow-xs">
                {idx + 1}
              </div>
              <p className="text-[10px] font-mono font-black uppercase text-indigo-600 tracking-wider">
                {item.step}
              </p>
              <h4 className="text-xs font-black text-slate-900">{item.title}</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end px-6 py-3 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
