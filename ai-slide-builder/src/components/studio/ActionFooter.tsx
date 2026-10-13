"use client";

import React from "react";
import { Download, ExternalLink, Sparkles } from "lucide-react";

interface ActionFooterProps {
  onExportPptx: () => void;
  hasSlides: boolean;
}

export default function ActionFooter({ onExportPptx, hasSlides }: ActionFooterProps) {
  return (
    <footer className="mt-8 pt-6 border-t border-slate-200">
      {/* 3단계: 프레젠테이션 변환 및 활용 버튼들 */}
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. 신규 원클릭 PPTX 다운로드 */}
          <button
            type="button"
            onClick={onExportPptx}
            disabled={!hasSlides}
            className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-bold text-sm shadow-md transition-transform transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <Download size={18} />
            <span>💾 PPTX 파워포인트 다운로드</span>
          </button>

          {/* 2. Google Slides 생성기 */}
          <a
            href="https://script.google.com/macros/s/AKfycbzko3SupSKCxqhdu__ToPdtY777Djj6cHEzBKWsqw0/dev"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-md transition-transform transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-center"
          >
            <ExternalLink size={17} />
            <span>🚀 Google 슬라이드 생성기</span>
          </a>

          {/* 3. Gemini 에서 슬라이드 만들기 */}
          <a
            href="https://gemini.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl font-bold text-sm shadow-md transition-transform transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-center"
          >
            <Sparkles size={17} />
            <span>✨ Gemini 에서 슬라이드 만들기</span>
          </a>
        </div>

        {/* 설명 안내 칩 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-slate-500">
          <p className="bg-slate-100 p-2.5 rounded-lg border border-slate-200">
            <strong>PPTX 즉시 저장:</strong> 16:9 와이드스크린 규격의 파워포인트(.pptx) 파일로 브라우저에서 바로 내려받습니다.
          </p>
          <p className="bg-slate-100 p-2.5 rounded-lg border border-slate-200">
            <strong>Google Slides 변환:</strong> 복사한 JSON을 Google Slides로 변환하는 Apps Script 웹앱으로 이동합니다.
          </p>
          <p className="bg-slate-100 p-2.5 rounded-lg border border-slate-200">
            <strong>Gemini 프롬프트 활용:</strong> JSON을 복사하여 Gemini에 붙여넣고 다양한 프레젠테이션 스타일로 확장할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 크레딧 정보 */}
      <div className="max-w-3xl mx-auto mt-8 pt-6 border-t border-slate-200 text-center">
        <h4 className="text-xs font-bold text-slate-500 mb-3">슬라이드 스크립트 제공 스태프</h4>
        <div className="grid grid-cols-3 gap-3 text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-800">표준형식</p>
            <a
              href="https://note.com/majin_108"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Majin
            </a>
          </div>
          <div>
            <p className="font-semibold text-slate-800">확장형식</p>
            <a
              href="https://note.com/cozy_auklet6005"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Kimura Yoshiki
            </a>
          </div>
          <div>
            <p className="font-semibold text-slate-800">C-Suite 보고 형식</p>
            <a
              href="https://www.youtube.com/@AIFACT-GPTPARK"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              GPT PARK
            </a>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-6 pb-4">
          AI 기반 프레젠테이션 자동화 & 슬라이드 빌더 스튜디오 • AIMaster
        </p>
      </div>
    </footer>
  );
}
