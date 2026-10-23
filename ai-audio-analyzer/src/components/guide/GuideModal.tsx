"use client";

import React from "react";
import { HelpCircle, X, Mic, Music, Sparkles, FileText, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{APP_NAME} 이용 가이드</h2>
              <p className="text-[11px] text-slate-500 font-mono">Version {APP_VERSION}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 text-xs text-slate-600">
          {/* 소개 배너 */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              소리의 숨겨진 통찰을 발견하는 AI Audio 랩
            </h3>
            <p className="text-slate-600 leading-relaxed text-xs">
              Google Gemini 2.5 Flash 멀티모달 오디오 AI를 탑재하여, 회의/인터뷰 음성의 맥락부터 음악의 화성학 및 음향 포렌식까지 나노 단위로 해체 분석합니다.
            </p>
          </div>

          {/* 1. 음성 인텔리전스 모드 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
              <Mic size={15} />
              <span>1. 음성 인텔리전스 (Speech Intelligence)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>화자 분리 및 점유율 시각화</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  대화에 참여한 화자별 역할, 화법 스타일, 핵심 기여도 및 발언 점유율을 정밀 분석합니다.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>타임라인 전사 및 질문 추출</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  초 단위 타임스탬프와 함께 전문을 기록하며, 회의 중 제기된 핵심 질문과 맥락을 추출합니다.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>감정 어조 & 비언어적 요소</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  대화의 전체 분위기, 말의 속도와 리듬, 침묵(휴지기), 추임새(Filler words)까지 포착합니다.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>원클릭 회의록 & 인터뷰 보고서</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  의결 사항 중심 회의록 또는 대화 흐름 중심 인터뷰 보고서를 마크다운으로 즉시 생성 복사합니다.
                </p>
              </div>
            </div>
          </div>

          {/* 2. 음악 분석 모드 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
              <Music size={15} />
              <span>2. 음악 분석 & Suno v5 역설계 (Music Lab)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-500" />
                  <span>Suno AI v5 Reverse Prompt</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  음원의 장르, 악기, 분위기, 템포를 역설계하여 Suno v5에서 똑같은 느낌을 재현할 수 있는 God-Tier 프롬프트를 자동 생성합니다.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-blue-500" />
                  <span>오디오 포렌식 & 음질 분석</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  고주파 Cut-off를 감지하여 MP3 업스케일링(뻥튀기) 여부, 원본 추정 품질, 편집 연결 흔적을 진단합니다.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>4대 스템(Stem) 청각 묘사</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  보컬(리버브/음역), 베이스(서브/슬랩), 드럼(톤/그루브), 기타 악기들의 믹싱 기법을 상세히 분석합니다.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>곡 구조 & 코드 진행 채보</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  [Intro]-[Verse]-[Chorus] 구조 타임라인과 Key/Scale, 코드 진행(Chord Progression)을 텍스트 악보로 제공합니다.
                </p>
              </div>
            </div>
          </div>

          {/* 3. API 키 및 보안 안내 */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/60 space-y-2">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-amber-600" />
              <span>회원 본인 API 키 연동 원칙 (Rule 00)</span>
            </div>
            <p className="text-[11px] text-amber-800/90 leading-relaxed">
              본 프로그램은 운영자의 공용 키를 공유하지 않으며, 회원 본인이 Google AI Studio에서 무료로 발급받은 Gemini API 키를 직접 연동하여 사용합니다. 음원 데이터는 외부 서버에 영구 저장되지 않고 안전하게 처리됩니다.
            </p>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
