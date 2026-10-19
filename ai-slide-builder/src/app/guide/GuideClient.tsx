"use client";

import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ApiKeyModal from "@/components/settings/ApiKeyModal";
import HelpModal from "@/components/guide/HelpModal";

interface GuideClientProps {
  userEmail?: string | null;
}

export default function GuideClient({ userEmail }: GuideClientProps) {
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* 1. 표준 좌측 사이드바 */}
      <Sidebar
        userEmail={userEmail}
        selectedFormat="standard"
        onSelectFormat={() => {}}
        onOpenApiKey={() => setIsApiKeyModalOpen(true)}
        onOpenGuide={() => setIsHelpModalOpen(true)}
      />

      {/* 2. 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* 상단 헤더 */}
        <Header
          onOpenGuide={() => setIsHelpModalOpen(true)}
          onOpenApiKey={() => setIsApiKeyModalOpen(true)}
          hasApiKey={true}
          userEmail={userEmail}
        />

        {/* 가이드북 스크롤 뷰포트 */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <div className="max-w-5xl mx-auto space-y-6 pb-16">
            
            {/* 1. 상단 히어로 배너 */}
            <section className="studio-hero">
              <div className="max-w-3xl">
                <div className="hero-badge">
                  <span>📖</span>
                  <span>AI SLIDE BUILDER · OFFICIAL MANUAL v1.10</span>
                </div>
                <h1 className="hero-title">
                  아이디어를 완벽한 프레젠테이션으로 만드는 <span className="gradient-text">AI 슬라이드 완전 가이드</span>
                </h1>
                <p className="hero-desc">
                  비정형 문서나 주제 키워드만 입력하면 Gemini AI가 22가지 전문 시각화 패턴으로 구조화된 장표를 생성하고 16:9 와이드 PPTX로 즉시 변환합니다.
                </p>
                <div className="flex gap-3 mt-5 flex-wrap">
                  <a
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
                  >
                    <span>⚡</span>
                    <span>지금 슬라이드 제작하기</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur-sm transition-all"
                  >
                    <span>🔑</span>
                    <span>API 키 설정</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 2. 빠른 매뉴얼 목차 네비게이션 */}
            <nav className="guide-card p-4 bg-slate-100/70 border-slate-200">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-700">
                <span>📌</span>
                <span>빠른 목차 바로가기</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <a href="#pipeline" className="text-blue-600 font-semibold hover:underline">① 4단계 슬라이드 제작 파이프라인</a>
                <span className="text-slate-300">·</span>
                <a href="#byok" className="text-blue-600 font-semibold hover:underline">② API 키 등록 (BYOK 원칙)</a>
                <span className="text-slate-300">·</span>
                <a href="#layouts" className="text-blue-600 font-semibold hover:underline">③ 22가지 전문 슬라이드 타입 & 3대 엔진</a>
                <span className="text-slate-300">·</span>
                <a href="#tips" className="text-blue-600 font-semibold hover:underline">④ 실전 발표 & 스피커 노트 활용법</a>
                <span className="text-slate-300">·</span>
                <a href="#faq" className="text-blue-600 font-semibold hover:underline">⑤ 자주 묻는 질문 (FAQ)</a>
              </div>
            </nav>

            {/* 3. 섹션 ① 4단계 슬라이드 제작 파이프라인 */}
            <section id="pipeline" className="guide-card">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">4단계 표준 슬라이드 제작 파이프라인</h2>
                  <p className="text-xs text-slate-500">문서 업로드부터 원클릭 파워포인트(PPTX) 다운로드까지 이어지는 작업 흐름</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mt-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                    <strong className="text-xs text-slate-900">자료 입력 & 파싱</strong>
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    단순한 주제 키워드를 적거나, PDF, DOCX, XLSX, TXT 문서를 드래그 앤 드롭하여 텍스트를 자동 추출합니다.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                    <strong className="text-xs text-slate-900">AI 장표 자동 편성</strong>
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    표준(10~12P), 대용량 표, C-Suite 임원보고 중 포맷을 선택하면 22종 레이아웃에 맞춰 JSON 슬라이드가 생성됩니다.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                    <strong className="text-xs text-slate-900">양방향 카드 편집</strong>
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    우측 편집 패널에서 각 장표의 제목, 본문, 항목, 발표자 스피커 노트(notes)를 실시간으로 직접 수정합니다.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">4</span>
                    <strong className="text-xs text-slate-900">16:9 와이드 PPTX</strong>
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    [PPTX 다운로드]를 누르면 브라우저에서 즉시 파워포인트 바이너리로 빌드되어 파일이 저장됩니다.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. 섹션 ② API 키 등록 (BYOK 원칙) */}
            <section id="byok" className="guide-card border-l-4 border-l-blue-600">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">회원 본인 Google Gemini API 키 등록 (최초 1회)</h2>
                  <p className="text-xs text-slate-500">철저한 회원 개인 소유 격리 및 무상태 보안 원칙 (BYOK — Bring Your Own Key)</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4">
                <div className="flex gap-2.5 items-start">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <strong className="text-xs font-bold text-blue-900">최상위 보안 원칙 (BYOK Standard)</strong>
                    <p className="text-xs text-blue-950/80 mt-1 leading-relaxed">
                      AI 슬라이드 자동화는 운영자 키나 타 회원의 키를 절대 공유하지 않으며, <b>회원님 본인의 Google Gemini API 키</b>로만 독립 동작합니다.
                      등록된 키는 암호화되어 안전하게 관리되며 슬라이드 데이터 생성 요청 시에만 안전하게 호출됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-blue-600">STEP 1.</span>
                    <strong className="text-xs text-slate-900">Google AI Studio에서 무료 키 발급</strong>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    <code>aistudio.google.com/apikey</code>에 접속하여 구글 계정으로 로그인 후 [Create API key]를 눌러 <code>AIza…</code> 키를 복사합니다.
                  </p>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    Google AI Studio 바로가기 ↗
                  </a>
                </div>

                <div className="border border-slate-200 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-blue-600">STEP 2.</span>
                    <strong className="text-xs text-slate-900">프로그램 내 키 저장</strong>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    좌측 사이드바의 <b>[API키등록·플랫폼연동]</b> 버튼을 눌러 복사한 키를 붙여넣고 [키 저장]을 누르면 즉시 모든 기능이 활성화됩니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                  >
                    API 키 등록창 열기 →
                  </button>
                </div>
              </div>
            </section>

            {/* 5. 섹션 ③ 22가지 전문 슬라이드 타입 & 3대 엔진 */}
            <section id="layouts" className="guide-card">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">3</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">22가지 전문 시각화 레이아웃 & 3대 생성 엔진</h2>
                  <p className="text-xs text-slate-500">메시지의 성격에 맞춰 가장 효과적인 시각 구조를 자동으로 선택합니다.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <strong className="text-xs font-bold text-blue-700 block mb-1">표준 형식 (Standard 10~12P)</strong>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    도입부부터 문제 제기, 핵심 가치, 솔루션, 로드맵, 클로징까지 가장 균형 잡힌 발표용 슬라이드 구성.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <strong className="text-xs font-bold text-violet-700 block mb-1">확장판 (Detailed 14~16P)</strong>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    표, 차트, 대용량 정량 텍스트를 안정적으로 담아내는 상세 분석용 장표. 긴 표는 가독성을 위해 자동 분할.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <strong className="text-xs font-bold text-amber-800 block mb-1">C-Suite 보고 형식 (Executive)</strong>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    결론과 시사점(So What?)을 먼저 던지는 두괄식 결재용 프레젠테이션. 10대 보고 주제 최적화.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-700 border-b border-slate-200">
                  대표적인 시각화 슬라이드 타입 6선
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="p-3 flex items-start gap-3">
                    <span className="font-bold text-blue-600 min-w-[90px]">타임라인 / 연혁</span>
                    <span className="text-slate-600">시간의 흐름이나 사업 추진 마일스톤을 가로 축으로 시각화</span>
                  </div>
                  <div className="p-3 flex items-start gap-3">
                    <span className="font-bold text-blue-600 min-w-[90px]">비교 대조 (Compare)</span>
                    <span className="text-slate-600">기존 방식 vs 개선 솔루션, 경쟁사 대비 자사 강점을 2열 카드로 직관 대조</span>
                  </div>
                  <div className="p-3 flex items-start gap-3">
                    <span className="font-bold text-blue-600 min-w-[90px]">피라미드 계층</span>
                    <span className="text-slate-600">상위 전략부터 실행 과제까지 단계적 가치 피라미드로 표현</span>
                  </div>
                  <div className="p-3 flex items-start gap-3">
                    <span className="font-bold text-blue-600 min-w-[90px]">KPI 핵심 지표</span>
                    <span className="text-slate-600">성장률, 매출, 사용자 수 등 핵심 성과 수치를 대형 폰트와 카드 그리드로 강조</span>
                  </div>
                  <div className="p-3 flex items-start gap-3">
                    <span className="font-bold text-blue-600 min-w-[90px]">프로세스 흐름</span>
                    <span className="text-slate-600">1단계 ➔ 2단계 ➔ 3단계로 이어지는 작업 순서와 절차 설명</span>
                  </div>
                  <div className="p-3 flex items-start gap-3">
                    <span className="font-bold text-blue-600 min-w-[90px]">Q&A / FAQ</span>
                    <span className="text-slate-600">예상 질문과 명쾌한 답변을 2열 블록으로 정리하여 질의응답 완벽 대비</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. 섹션 ④ 실전 발표 & 스피커 노트 활용법 */}
            <section id="tips" className="guide-card">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">4</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">실전 발표 & 스피커 노트 활용법</h2>
                  <p className="text-xs text-slate-500">슬라이드 장표뿐 아니라 실제 발표장에서 든든한 가이드가 되는 기능들</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-slate-900 block mb-1">🎤 발표자용 스피커 노트 (Notes) 자동 삽입</strong>
                  <p>
                    AI가 각 장표의 핵심 메시지에 맞춰 <b>"발표자가 실제로 청중 앞에서 어떤 문장으로 운을 떼고 설명해야 하는지"</b> 발표 대본(스피커 노트)을 함께 작성합니다.
                    다운로드된 PPTX 파일 하단 발표자 노트에 그대로 저장되어, 듀얼 모니터 발표자 보기 모드에서 즉시 컨닝 페이퍼로 활용할 수 있습니다.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-slate-900 block mb-1">🖥️ 16:9 와이드스크린 표준 규격</strong>
                  <p>
                    최신 빔프로젝터, 대형 TV, 모니터에 최적화된 16:9 와이드 비율로 자동 생성되므로 화면 잘림이나 비율 왜곡 없이 깔끔하게 투사됩니다.
                  </p>
                </div>
              </div>
            </section>

            {/* 7. 섹션 ⑤ 자주 묻는 질문 (FAQ) 아코디언 */}
            <section id="faq" className="guide-card">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">5</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">자주 묻는 질문 (FAQ)</h2>
                  <p className="text-xs text-slate-500">작업 도중 궁금한 점을 빠르게 해결하세요.</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <details className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <summary className="font-bold text-slate-800 cursor-pointer">Q. 파워포인트(PPTX)를 열었을 때 폰트가 깨지거나 디자인이 틀어지지 않나요?</summary>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    아닙니다. 전 세계 모든 PC에 기본 내장된 안전한 시스템 폰트(Pretendard/맑은 고딕/Malgun Gothic)와 표준 도형 벡터로 생성되므로, 별도의 폰트 설치 없이도 어느 장치에서나 동일하게 열립니다.
                  </p>
                </details>

                <details className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <summary className="font-bold text-slate-800 cursor-pointer">Q. 생성된 슬라이드 중 마음에 들지 않는 장표만 다시 만들 수 있나요?</summary>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    네, 우측 편집기에서 각 슬라이드 카드의 [AI 재생성] 버튼을 누르면 해당 장표의 내용만 새로운 문맥과 시각화 레이아웃으로 다시 생성할 수 있습니다.
                  </p>
                </details>

                <details className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <summary className="font-bold text-slate-800 cursor-pointer">Q. PDF나 워드 문서는 몇 장까지 업로드할 수 있나요?</summary>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    최대 50MB 용량의 문서를 지원하며, 텍스트가 정상 추출되는 모든 PDF, DOCX, XLSX, TXT, CSV 파일을 분석하여 핵심 골자를 추출해 냅니다.
                  </p>
                </details>

                <details className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <summary className="font-bold text-slate-800 cursor-pointer">Q. "API 키 등록이 필요합니다"라는 알림이 떠요.</summary>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    본 프로그램은 철저한 본인 키 원칙(BYOK)을 따릅니다. 좌측 사이드바의 <b>[API키등록·플랫폼연동]</b> 메뉴에서 본인의 Google Gemini API 키를 등록해 주시면 즉시 정상 이용이 가능합니다.
                  </p>
                </details>
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* 모달 */}
      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} />
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
}
