"use client";

import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ApiKeyModal from "@/components/settings/ApiKeyModal";
import HelpModal from "@/components/guide/HelpModal";
import { APP_VERSION } from "@/lib/version";

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
                  <span>AI SLIDE BUILDER · OFFICIAL MANUAL {APP_VERSION}</span>
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
                <a href="#pipeline" className="text-blue-600 font-semibold hover:underline">1. 4단계 슬라이드 제작 순서</a>
                <span className="text-slate-300">·</span>
                <a href="#byok" className="text-blue-600 font-semibold hover:underline">2. API 키 등록 (본인 키)</a>
                <span className="text-slate-300">·</span>
                <a href="#layouts" className="text-blue-600 font-semibold hover:underline">3. 슬라이드 종류 & 3가지 생성 형식</a>
                <span className="text-slate-300">·</span>
                <a href="#tips" className="text-blue-600 font-semibold hover:underline">4. 발표자 노트 활용법</a>
                <span className="text-slate-300">·</span>
                <a href="#cost" className="text-blue-600 font-semibold hover:underline">5. 비용이 드는 버튼 & 저장 안내</a>
                <span className="text-slate-300">·</span>
                <a href="#faq" className="text-blue-600 font-semibold hover:underline">6. 자주 묻는 질문 (FAQ)</a>
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
                    왼쪽 「발표할 내용」 칸에 주제나 원고를 직접 적거나, 파일(DOCX, PDF, TXT, MD, CSV, XLS, XLSX)을 끌어다 놓습니다. 파일을 올리면 Gemini가 내용을 요약해 원문 칸에 채워 줍니다. 업무 워크스페이스에서 보낸 원고가 있으면 「📥 업무 워크스페이스에서 받은 원고」 버튼이 나타나고, 고르면 원문 칸에 들어갑니다.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                    <strong className="text-xs text-slate-900">AI 장표 자동 편성</strong>
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    표준 · 확장판 · C-Suite 보고 중 형식을 고르고 「AI로 구성안 만들기」를 누르면 슬라이드 구성안(JSON)이 만들어집니다. 최신 통계가 필요하면 「웹 검색으로 최신 정보 반영하기」를 체크합니다. C-Suite 보고를 고르면 발표 주제 · 목적 · 시간 · 목차를 정하는 칸이 함께 나옵니다.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                    <strong className="text-xs text-slate-900">양방향 카드 편집</strong>
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    오른쪽 카드에서 제목 · 본문 · 발표자 노트를 바로 고칩니다. 카드의 위 · 아래 화살표로 순서를 바꾸고 휴지통으로 지웁니다. 카드 아래 「🤖 AI로 이 카드 수정하기」는 그 한 장만, 위쪽 「✨ AI로 전체 슬라이드 일괄 수정하기」는 모든 장을 요청대로 고칩니다. 「16:9 슬라이드쇼 미리보기」로 넘겨 볼 수 있습니다.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">4</span>
                    <strong className="text-xs text-slate-900">16:9 와이드 PPTX</strong>
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    맨 아래 「💾 PPTX 파워포인트 다운로드」를 누르면 내 PC에 16:9 파워포인트 파일이 저장됩니다. 「🚀 Google 슬라이드 생성기」와 「✨ Gemini 에서 슬라이드 만들기」는 바깥 사이트를 새 창으로 여는 버튼이며, 구성안(JSON)을 복사해 그쪽에 붙여 넣어 씁니다.
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
                  <p className="text-xs text-slate-500">이 프로그램은 회원님 본인의 Google Gemini API 키 하나만 있으면 됩니다.</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4">
                <div className="flex gap-2.5 items-start">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <strong className="text-xs font-bold text-blue-900">본인 키로만 동작합니다</strong>
                    <p className="text-xs text-blue-950/80 mt-1 leading-relaxed">
                      AI 슬라이드 자동화는 운영자 키나 타 회원의 키를 절대 공유하지 않으며, <b>회원님 본인의 Google Gemini API 키</b>로만 독립 동작합니다.
                      등록된 키는 본인 계정에 연결해 보관하며, 한 번 등록하면 AIMaster의 다른 프로그램에서도 같은 Gemini 키를 그대로 씁니다.
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
                  <a
                    href="https://www.buylife.xyz/guides/f442cd37-f1e0-42a7-a3de-f9a9acf47cc4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors"
                  >
                    📖 발급 방법 자세히 보기
                  </a>
                </div>

                <div className="border border-slate-200 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-blue-600">STEP 2.</span>
                    <strong className="text-xs text-slate-900">프로그램 내 키 저장</strong>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    좌측 사이드바의 <b>[API키등록·플랫폼연동]</b> 버튼을 눌러 복사한 키를 붙여 넣고 저장 버튼을 누릅니다. 저장되면 화면 위쪽 표시가 「Gemini 연동됨」으로 바뀝니다. 저장할 때 키가 맞는지까지 확인하지는 않으므로, 키를 잘못 넣었다면 슬라이드를 만들 때 오류가 납니다.
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
                  <h2 className="text-base font-bold text-slate-900">슬라이드 종류 & 3가지 생성 형식</h2>
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
                  AI가 골라 쓰는 대표 슬라이드 종류 6가지 (카드 편집 화면 기준)
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

              <div className="mt-4 bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 leading-relaxed">
                <strong className="block mb-1">⚠️ PPTX 파일에서는 모양이 단순해지는 종류가 있습니다</strong>
                내려받는 PPTX에서 전용 모양으로 그려지는 종류는 표지 · 장 구분 · 맺음말 · 비교 · 핵심 지표(KPI) · 진행 단계 · 표입니다.
                그 밖의 종류는 「제목 + 글머리표 목록」 모양으로 들어가며, 인용 · 질문과 답 · 수치 비교 · 피라미드 · 흐름도처럼 목록 형태가 아닌 종류는 본문이 빠지고 제목만 들어갈 수 있습니다.
                PPTX를 내려받은 뒤 파워포인트에서 한 번 넘겨 보며 확인해 주세요.
              </div>
            </section>

            {/* 6. 섹션 ④ 실전 발표 & 스피커 노트 활용법 */}
            <section id="tips" className="guide-card">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">4</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">발표자 노트 활용법</h2>
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

            {/* 6-1. 비용이 드는 버튼 & 저장 안내 (2026-11-13 추가) */}
            <section id="cost" className="guide-card">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">5</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">비용이 드는 버튼 & 저장 안내</h2>
                  <p className="text-xs text-slate-500">처음 쓰실 때 가장 많이 놓치는 두 가지입니다.</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-slate-900 block mb-1">💳 내 Gemini 키 사용량이 쓰이는 버튼</strong>
                  <ul className="list-disc list-inside space-y-1">
                    <li>파일 올리기 — 올린 문서를 Gemini가 요약합니다(1회). PDF는 쪽마다 그림으로 바꿔 보내므로 쪽수가 많을수록 오래 걸리고 사용량이 늘어납니다.</li>
                    <li>「AI로 구성안 만들기」 — 누를 때마다 1회.</li>
                    <li>「🤖 AI로 이 카드 수정하기」 — 누를 때마다 1회.</li>
                    <li>「✨ AI로 전체 슬라이드 일괄 수정하기」 — 슬라이드 장수만큼 호출합니다(12장이면 12회).</li>
                  </ul>
                  <p className="mt-1.5">카드 내용을 손으로 고치기, 순서 바꾸기, 미리보기, PPTX 다운로드는 Gemini를 부르지 않습니다. 요금은 Google이 회원님 키에 매기며, 이 프로그램이 Gemini 사용량에 대해 따로 받는 요금은 없습니다.</p>
                </div>

                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <strong className="block mb-1">⚠️ 만든 슬라이드는 서버에 저장되지 않습니다</strong>
                  <p>
                    구성안과 편집 내용은 지금 열려 있는 화면에만 있습니다. 새로 고침하거나 창을 닫거나 「연동 & 사용 매뉴얼」 같은 다른 화면으로 이동하면 사라집니다.
                    작업을 마치면 바로 PPTX를 내려받고, 나중에 이어서 고치려면 왼쪽 구성안(JSON) 칸의 복사 버튼으로 내용을 복사해 메모장 등에 보관해 두세요. 보관한 JSON을 같은 칸에 붙여 넣으면 카드가 다시 나타납니다.
                  </p>
                </div>
              </div>
            </section>

            {/* 7. 섹션 ⑤ 자주 묻는 질문 (FAQ) 아코디언 */}
            <section id="faq" className="guide-card">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">6</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">자주 묻는 질문 (FAQ)</h2>
                  <p className="text-xs text-slate-500">작업 도중 궁금한 점을 빠르게 해결하세요.</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <details className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <summary className="font-bold text-slate-800 cursor-pointer">Q. 파워포인트(PPTX)를 열었을 때 폰트가 깨지거나 디자인이 틀어지지 않나요?</summary>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    PPTX는 글꼴을 따로 지정하지 않고 표준 도형과 글상자로 만듭니다. 그래서 여는 PC의 파워포인트 기본 글꼴로 보이며, 별도 글꼴 설치는 필요 없습니다. 글꼴이나 색을 바꾸고 싶으면 파워포인트에서 자유롭게 고치시면 됩니다.
                  </p>
                </details>

                <details className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <summary className="font-bold text-slate-800 cursor-pointer">Q. 생성된 슬라이드 중 마음에 들지 않는 장표만 다시 만들 수 있나요?</summary>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    네. 오른쪽 카드 아래 「AI에게 이 슬라이드 수정 요청하기」 칸에 바꾸고 싶은 점을 적고 「🤖 AI로 이 카드 수정하기」를 누르면 그 한 장만 다시 만들어집니다. 다른 장은 그대로입니다.
                  </p>
                </details>

                <details className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <summary className="font-bold text-slate-800 cursor-pointer">Q. PDF나 워드 문서는 몇 장까지 업로드할 수 있나요?</summary>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    프로그램이 정해 둔 쪽수 제한은 없습니다. 다만 PDF는 쪽마다 그림으로 바꿔 Gemini에 보내기 때문에 쪽수가 많으면 오래 걸리거나 실패할 수 있습니다. 긴 문서는 필요한 부분만 나눠 올리거나, 글을 복사해 「발표할 내용」 칸에 직접 붙여 넣는 방법을 권합니다. 지원 형식은 DOCX, PDF, TXT, MD, CSV, XLS, XLSX입니다.
                  </p>
                </details>

                <details className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <summary className="font-bold text-slate-800 cursor-pointer">Q. "API 키 등록이 필요합니다"라는 알림이 떠요.</summary>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    이 프로그램은 회원님 본인의 키로만 동작합니다. 좌측 사이드바의 <b>[API키등록·플랫폼연동]</b> 메뉴에서 본인의 Google Gemini API 키를 등록해 주시면 바로 쓸 수 있습니다.
                  </p>
                </details>

                <details className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <summary className="font-bold text-slate-800 cursor-pointer">Q. 어제 만든 슬라이드를 다시 열 수 있나요?</summary>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    아니요. 이 프로그램은 만든 슬라이드를 서버에 보관하지 않습니다. 내려받은 PPTX 파일이나 복사해 둔 구성안(JSON)으로만 이어서 작업할 수 있습니다. 위 「비용이 드는 버튼 & 저장 안내」를 참고해 주세요.
                  </p>
                </details>

                <details className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <summary className="font-bold text-slate-800 cursor-pointer">Q. 「웹 검색으로 최신 정보 반영하기」는 언제 켜나요?</summary>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    자료 없이 주제만 적었거나 최신 통계가 필요할 때 체크합니다. 켜면 Gemini가 구글 검색 결과를 참고해 구성안을 만듭니다. AI가 정리한 수치는 틀릴 수 있으니 발표 전에 원문에서 한 번 더 확인해 주세요.
                  </p>
                </details>

                <details className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <summary className="font-bold text-slate-800 cursor-pointer">Q. 「🚀 Google 슬라이드 생성기」를 눌렀는데 열리지 않아요.</summary>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    이 버튼은 구글 Apps Script로 만든 바깥 도구를 새 창으로 여는 링크입니다. 구글 계정 상태에 따라 열리지 않을 수 있습니다. 그럴 때는 「💾 PPTX 파워포인트 다운로드」로 파일을 받은 뒤, 구글 드라이브에 올려 Google 슬라이드로 여는 방법을 써 주세요.
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
