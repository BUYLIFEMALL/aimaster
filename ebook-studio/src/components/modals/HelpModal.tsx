"use client";

import React from "react";
import { BookOpen, X, Sparkles, Layers, Palette, Share2, Download, CheckCircle2 } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  const STEPS = [
    {
      num: "01",
      icon: Sparkles,
      title: "원문 자료 입력 & AI 목차 기획",
      desc: "강의록, 블로그 글, 회의록, 기획서 등 흩어진 텍스트를 붙여넣거나 파일을 업로드합니다. AI가 당해 연도(2026년) 기준 트렌드를 반영하여 매력적인 제목, 부제 및 10~15개 장(Chapter) 목차를 자동으로 기획합니다.",
    },
    {
      num: "02",
      icon: Layers,
      title: "챕터별 심층 집필 & 위지윅 에디팅",
      desc: "회원 본인의 Gemini 키로 챕터별 본문을 원클릭 작성합니다. 소제목, 알찬 본문, 핵심 인사이트, 생각하고 실천하기 질문까지 한 권의 책에 필요한 풍부한 구성을 실시간으로 확인하고 직접 편집할 수 있습니다.",
    },
    {
      num: "03",
      icon: Palette,
      title: "21종 테마 & 5종 서체 & AI 표지 스타일링",
      desc: "따뜻한 종이, 빈티지 세피아, 미드나이트 등 21종 독서 테마와 본고딕, 리디바탕, 마루부리 등 5종 명품 서체를 자유롭게 선택하세요. AI가 책 제목에 맞춘 고화질 3:4 규격 표지도 생성해 드립니다.",
    },
    {
      num: "04",
      icon: Share2,
      title: "원클릭 웹 배포 & 반응형 모바일 뷰어",
      desc: "복잡한 서버 설정 없이 즉시 열람 가능한 고유 웹 링크를 생성합니다. 독자들은 스마트폰이나 PC 웹 브라우저에서 목차 바로가기, 테마 변경, 글자 크기 조절 기능과 함께 쾌적하게 독서할 수 있습니다.",
    },
    {
      num: "05",
      icon: Download,
      title: "단일 HTML / Vercel ZIP / EPUB / PDF 다운로드",
      desc: "인터넷 없이도 브라우저에서 바로 열리는 단 1개의 독립형 HTML 파일, Vercel Drop용 ZIP 파일, 리디북스/밀리의서재 호환 표준 EPUB 파일, 인쇄 최적화 책 규격 PDF 저장을 모두 지원합니다.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">eBook Studio 이용 가이드</h3>
              <p className="text-[11px] text-slate-500">
                문서 한 뭉치로 완성하는 고품질 웹/HTML 전자책 출판 솔루션
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

        {/* 본문 단계 리스트 */}
        <div className="p-6 overflow-y-auto space-y-4">
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 text-xs font-black text-indigo-600">
                {step.num}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{step.title}</h4>
                </div>
                <p className="text-[12px] text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}

          {/* 특징 강조 박스 */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>회원 본인 API 키 기반 격리 운영</span>
            </div>
            <p className="text-[11px] text-amber-700/90 leading-relaxed">
              eBook Studio는 공용 키를 공유하지 않으며, 회원님이 발급받으신 Google Gemini API 키를 통해 직접 구글 AI에 안전하게 요청하여 전자책을 집필합니다. 생성된 HTML 파일 안에는 API 키가 일절 포함되지 않으므로 안심하고 외부에 배포하셔도 됩니다.
            </p>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
