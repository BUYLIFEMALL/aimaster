"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  Layers,
  Palette,
  Share2,
  FileText,
  KeyRound,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Download,
  Printer,
  Globe,
  FileCheck,
  CheckCircle2,
} from "lucide-react";

export default function EbookGuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "Q1. 업로드한 원본 문서나 작성 중인 전자책 내용이 서버에 저장되나요?",
      a: "절대 저장되지 않습니다. 파일 파싱(TXT, Markdown, DOCX)은 전적으로 브라우저 내부 메모리에서만 수행되며 원본 파일이 서버로 전송되지 않습니다. 회원님의 원고 데이터는 브라우저 로컬 저장소에만 격리 보관되며, AI 집필 호출 시에도 Gemini API로만 암호화 전송 후 소멸됩니다.",
    },
    {
      q: "Q2. 발행된 독립형 단일 HTML 파일은 인터넷 연결 없이도 동작하나요?",
      a: "네, 100% 완벽하게 동작합니다. eBook Studio의 단일 HTML 내보내기는 모든 스타일, 21종 테마, 본문 텍스트, 자바스크립트 리더기 엔진이 단 하나의 .html 파일 안에 인라인 번들링되므로 인터넷이 없는 환경이나 오프라인에서도 브라우저만 있으면 영구적으로 책을 열람할 수 있습니다.",
    },
    {
      q: "Q3. EPUB 파일은 어떤 전자책 뷰어와 호환되나요?",
      a: "국제 전자책 표준인 EPUB 3.0 규격을 준수하여 제작되므로 Apple Books(애플 북스), Google Play 북스, 리디페이퍼, 크레마, Calibre 등 표준 e-Book 리더 앱과 하드웨어 단말기에서 완벽하게 호환됩니다.",
    },
    {
      q: "Q4. Vercel Drop 웹 배포 ZIP 파일은 어떻게 사용하나요?",
      a: "내보내기 메뉴에서 '웹 배포용 ZIP'을 내려받은 후, 브라우저에서 vercel.com/new/drop 페이지에 접속하여 해당 ZIP 파일을 드래그앤드롭하기만 하면 10초 만에 전 세계 누구나 접근할 수 있는 무료 웹 전자책 도메인 주소가 즉시 생성됩니다.",
    },
    {
      q: "Q5. Google Gemini API 키는 필수인가요? 키가 없어도 이용할 수 있나요?",
      a: "수동 원고 작성, 목차 분할, 21종 테마 적용, 뷰어 읽기, HTML/EPUB/인쇄 내보내기는 API 키 없이도 누구나 100% 무료로 이용할 수 있습니다. 단, 'AI 목차 제안' 및 'AI 챕터 자동 집필' 기능을 구동할 때에만 회원 본인의 무료 Google Gemini API 키가 사용됩니다.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-slate-800">
      {/* 상단 네비게이션 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 hover:opacity-90 transition group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-600 text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
            <BookOpen className="h-4.5 w-4.5 text-indigo-300" />
          </div>
          <div>
            <span className="text-sm font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
              eBook Studio
            </span>
            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-600 rounded border border-indigo-100">
              v1.10 매뉴얼
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
        >
          <span>스튜디오로 이동</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* 메인 가이드북 컨테이너 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10 space-y-12">
        {/* 1. 상단 히어로 배너 */}
        <section className="studio-hero rounded-3xl p-6 sm:p-10 border border-indigo-100/80 shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>포커스 스튜디오 스타일 — 전자책 퍼블리싱 가이드</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              문서 수집부터 프로급 전자책 발행까지<br />
              <span className="text-indigo-600">올인원 디지털 퍼블리싱</span>을 완벽 마스터하세요.
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
              eBook Studio는 원본 문서(TXT/MD/DOCX/URL) 입력에서 AI 목차 기획, 21종 테마 디자인,
              그리고 인터넷 없이 영구 작동하는 단일 독립형 HTML 및 EPUB, 웹 배포 번들까지 원스톱으로 지원합니다.
            </p>
          </div>
        </section>

        {/* 2. 4단계 전자책 출판 파이프라인 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              4단계 올인원 전자책 출판 파이프라인
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="focus-card p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  STEP 01
                </span>
                <span className="text-xl">📥</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">원본 자료 입력 & 수집</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                TXT, Markdown, DOCX 파일 업로드 또는 최대 12개 웹 URL 일괄 스크래핑으로 본문을 브라우저에 안전하게 추출합니다.
              </p>
            </div>

            <div className="focus-card p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  STEP 02
                </span>
                <span className="text-xl">📑</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">목차 설계 & AI 집필</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                스마트 알고리즘과 Gemini AI로 소제목/분량 단위 챕터를 자동 분할하고, 3대 정리 수준에 맞춰 원고를 순차 집필합니다.
              </p>
            </div>

            <div className="focus-card p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  STEP 03
                </span>
                <span className="text-xl">🎨</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">디자인 & 실시간 뷰어</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                21종 독서 테마, 5종 한글 서체, 10대 출판 프리셋을 적용하고 모바일/태블릿 반응형 뷰어로 실시간 레이아웃을 검수합니다.
              </p>
            </div>

            <div className="focus-card p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  STEP 04
                </span>
                <span className="text-xl">🚀</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">멀티 포맷 발행 & 배포</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                독립형 단일 HTML, 표준 EPUB, 인쇄/PDF 최적화 규격 및 Vercel Drop 웹 배포용 ZIP 번들로 영구 보관/배포합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 3. 21종 테마 & 10대 출판 프리셋 매트릭스 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              21종 테마 & 10대 출판 프리셋 매트릭스
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">📖 문학 에세이</span>
                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">리디바탕</span>
              </div>
              <p className="text-xs text-slate-500">
                따뜻한 크림 배경과 감성적인 명조 계열 리디바탕 서체로 장시간 독서에도 눈이 피로하지 않은 문학 서적 최적화 세팅입니다.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">💻 기술 & IT 문서</span>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">본고딕</span>
              </div>
              <p className="text-xs text-slate-500">
                가독성이 높은 고딕 서체와 코드 블록 하이라이트가 조화를 이루며 매뉴얼, API 가이드, 개발 도서에 가장 이상적입니다.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">🌙 다크 스튜디오</span>
                <span className="text-[10px] bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-bold">옵시디언</span>
              </div>
              <p className="text-xs text-slate-500">
                야간 독서 및 OLED 화면에 최적화된 옵시디언 다크 테마로 눈부심 없이 편안한 집중 환경을 제공합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 4. 4대 멀티 포맷 익스포트 안내 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              4대 멀티 포맷 익스포트 규격
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="focus-card p-5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Globe className="w-4 h-4" />
                <span>독립형 단일 HTML (.html)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                웹 서버나 인터넷 연결 없이 오프라인에서도 작동하는 독립형 전자책입니다. 21종 테마 스위처, 목차 탐색기, 검색 엔진이 모두 내장되어 평생 영구 보관할 수 있습니다.
              </p>
            </div>

            <div className="focus-card p-5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <BookOpen className="w-4 h-4" />
                <span>표준 전자책 EPUB (.epub)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                국제 표준 전자책 규격으로 리디북스, Apple Books, Google Play Books 등 스마트폰 및 e-잉크 단말기 리더 앱에 바로 등록하여 읽을 수 있습니다.
              </p>
            </div>

            <div className="focus-card p-5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Download className="w-4 h-4" />
                <span>Vercel Drop 웹 배포용 ZIP (.zip)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                vercel.com/new/drop에 파일을 드래그앤드롭하기만 하면 10초 만에 나만의 고유 웹사이트 주소로 전 세계에 무료 배포할 수 있는 웹 번들 패키지입니다.
              </p>
            </div>

            <div className="focus-card p-5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Printer className="w-4 h-4" />
                <span>인쇄 & PDF 저장 (@media print)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                출판 인쇄 규격에 맞춘 페이지 바꿈(Page Break) 및 머리글/바닥글 최적화 CSS가 적용되어 브라우저 인쇄 창에서 고품질 PDF 책으로 즉시 저장할 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        {/* 5. 100% 회원 본인 키 원칙 (BYOK) & 원고 무저장 보안 보증 */}
        <section className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>100% 회원 본인 API 키 원칙 (BYOK) 및 데이터 보안 보증</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-emerald-950/80 leading-relaxed pt-1">
            <div className="space-y-1">
              <span className="font-bold text-emerald-900 block">① 원본 문서 및 원고 100% 로컬 격리</span>
              <p>
                업로드된 TXT, Markdown, DOCX 문서 파싱과 전자책 원고는 브라우저 내부 메모리에만 존재하며 AIMaster 서버로 절대 전송되거나 보관되지 않습니다.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-emerald-900 block">② 독립된 회원 본인 Gemini API 키 구동</span>
              <p>
                운영자 또는 타인의 키를 공유하지 않으며, 회원님이 등록한 Google Gemini API 키로만 안전하게 구동됩니다. 키가 없더라도 수동 집필과 모든 내보내기는 완전 무료입니다.
              </p>
            </div>
          </div>
        </section>

        {/* 6. 자주 묻는 질문 FAQ (아코디언) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              자주 묻는 질문 (FAQ)
            </h2>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4.5 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-800 hover:text-indigo-600 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-indigo-600" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4.5 pb-4.5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. 최하단 CTA */}
        <section className="text-center py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md hover:shadow-indigo-200 transition-all active:scale-95"
          >
            <BookOpen className="w-4 h-4" />
            <span>eBook Studio에서 나만의 전자책 만들기 시작하기</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
