"use client";

import React from "react";
import { X, Check, FileText, Sparkles, Download, Layers } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">AI 슬라이드 자동화 이용 가이드</h2>
              <p className="text-xs text-slate-500">비정형 텍스트로부터 프레젠테이션 자동 생성 & 슬라이드 편집</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm text-slate-700">
          <section className="space-y-2">
            <h3 className="text-base font-bold text-blue-700 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block"></span>
              프로그램 개요
            </h3>
            <p className="leading-relaxed text-slate-600">
              <strong>AI 슬라이드 자동화</strong>는 회의록, 기획서, 보고서, 논문 등 긴 비정형 텍스트를 입력하거나 파일을 업로드하면,
              Google의 Gemini AI가 내용을 분석하여 22가지 전문 장표 레이아웃의 프레젠테이션 JSON 구성안을 자동 생성하고
              원클릭으로 파워포인트(PPTX) 또는 Google Slides로 변환해주는 올인원 솔루션입니다.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-bold text-blue-700 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block"></span>
              3대 프레젠테이션 생성 포맷
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">표준 형식</span>
                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  22가지 전문 시각화 패턴, 논리적 기승전결(도입-목차-본문-맺음말), 발표자 스피커 노트 자동 생성.
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">확장판</span>
                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  표/그래프 대용량 텍스트 안정적 렌더링, 13행 이상 표 자동 분할, 간결화 최적화.
                </p>
              </div>
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">C-Suite 보고 형식</span>
                <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                  한국 대기업 임원 보고용 두괄식(So What? & Why?), 10대 주제·7대 목적·발표 시간별 분량 최적화.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-bold text-blue-700 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block"></span>
              3단계 작업 흐름
            </h3>
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  1단계: 슬라이드 데이터 생성 (좌측 패널)
                </div>
                <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
                  <li>원하는 형식(표준, 확장판, C-Suite 보고 형식)을 선택합니다.</li>
                  <li>문서 파일(PDF, DOCX, XLSX, TXT, CSV)을 드래그하여 업로드하거나 발표 원고를 직접 입력합니다.</li>
                  <li>최신 트렌드/데이터가 필요한 경우 <strong>웹 검색으로 최신 정보 반영하기</strong>를 체크하세요.</li>
                  <li><strong>AI로 구성안 만들기</strong> 버튼을 누르면 실시간 JSON 스크립트가 생성됩니다.</li>
                </ul>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">2</span>
                  2단계: 슬라이드별 카드 편집 (우측 패널)
                </div>
                <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
                  <li>생성된 슬라이드가 카드 형태로 렌더링되며, 필드 수정 시 좌측 JSON에 실시간 반영됩니다.</li>
                  <li>카드의 ▲ / ▼ 버튼으로 순서를 변경하거나 × 버튼으로 삭제할 수 있습니다.</li>
                  <li><strong>AI로 개별 수정</strong>: 카드 하단에 요청을 입력하여 슬라이드 내용을 AI로 업그레이드합니다.</li>
                  <li><strong>AI로 전체 일괄 수정</strong>: 상단 입력창에 요청하여 모든 슬라이드에 일괄 적용합니다.</li>
                </ul>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                  3단계: 프레젠테이션 변환 및 다운로드 (하단 패널)
                </div>
                <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
                  <li><strong>💾 PPTX 파워포인트 다운로드</strong>: 완성된 16:9 슬라이드 PPTX 파일을 PC에 즉시 다운로드합니다.</li>
                  <li><strong>🚀 Google 슬라이드 생성기</strong>: 복사한 JSON을 붙여넣어 구글 드라이브에 직접 슬라이드를 만듭니다.</li>
                  <li><strong>✨ Gemini 연동</strong>: Google Gemini에 붙여넣고 즉시 프레젠테이션 생성을 요청할 수 있습니다.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-xs shadow-xs"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
