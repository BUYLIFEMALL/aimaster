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
import { APP_VERSION } from "@/lib/version";

// 메인 사이트에 있는 키 발급 매뉴얼 글(새 창으로 열림)
const KEY_GUIDES = [
  { name: "OpenAI (GPT)", href: "https://www.buylife.xyz/guides/1c5c24e2-15d4-49b8-b907-0ac6843dee3a" },
  { name: "Claude (Anthropic)", href: "https://www.buylife.xyz/guides/d03f65c2-efbb-421f-a041-a075562e3b7a" },
  { name: "Google Gemini", href: "https://www.buylife.xyz/guides/f442cd37-f1e0-42a7-a3de-f9a9acf47cc4" },
];

export default function EbookGuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "Q1. 업로드한 원본 문서나 작성 중인 전자책 내용이 서버에 저장되나요?",
      a: "서버에 보관하지 않습니다. 올린 파일(TXT, Markdown, DOCX)은 브라우저 안에서 읽고, 작성 중인 전자책은 지금 쓰는 브라우저의 저장 공간에만 남습니다. 다만 두 가지는 서버를 거칩니다. 웹 주소로 가져오기는 서버가 그 주소의 글을 대신 읽어 화면으로 돌려주고, AI 목차 제안·AI 집필은 해당 장의 원문을 회원님이 고른 AI(OpenAI·Claude·Gemini)에 보내 결과를 받아 옵니다. 두 경우 모두 내용을 서버에 저장하지 않습니다.",
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
      q: "Q5. AI API 키는 필수인가요? 어떤 AI를 쓸 수 있나요?",
      a: "수동 원고 작성, 목차 분할, 21종 테마 적용, 뷰어 읽기, HTML/EPUB/인쇄 내보내기는 API 키 없이도 쓸 수 있습니다. 'AI 목차 제안'과 'AI 챕터 자동 집필'은 OpenAI(GPT)·Claude·Gemini 중 고른 모델의 회원 본인 API 키로 동작하며, 플랫폼마다 가성비·균형·최고 품질 모델을 고를 수 있습니다. 표지는 지금 화면에서 이미지를 직접 올리거나, 표지 프롬프트를 복사해 원하는 이미지 도구에서 만든 뒤 올리는 방식입니다. AI를 쓴 만큼의 요금은 그 AI 회사가 회원님 키로 청구합니다.",
    },
    {
      q: "Q6. 작업하던 전자책은 어디에 저장되나요? 다른 PC에서도 이어서 할 수 있나요?",
      a: "지금 쓰는 브라우저의 저장 공간에 자동 저장되며, 한 번에 한 권만 보관합니다. 그래서 다른 PC·다른 브라우저에서는 보이지 않고, 브라우저의 사이트 데이터를 지우면 함께 사라집니다. '새 프로젝트'를 누르면 지금 작업이 비워지니, 그 전에 왼쪽 메뉴 '배포 & 내보내기' 맨 아래의 '프로젝트 JSON 백업'으로 파일을 받아 두세요. 다른 PC에서는 같은 자리의 'JSON 불러오기'로 이어서 작업할 수 있습니다.",
    },
    {
      q: "Q7. API 키는 어디에 등록하나요? 메인 사이트에 등록한 키도 쓸 수 있나요?",
      a: "왼쪽 메뉴 맨 아래 '🔑 API 키·모델 설정'(또는 상단의 'API 키 등록' 단추)을 누르면 설정 창이 열립니다. 먼저 모델을 고르고, 그 모델 플랫폼의 본인 키를 넣은 뒤 '설정 저장'을 누릅니다. OpenAI·Claude 키는 본인 계정에만 저장되어, 메인 사이트 'API 키 설정'에 이미 등록한 키가 있으면 다시 넣지 않아도 '본인 키 등록됨'으로 표시됩니다. Gemini 키는 본인 계정과 이 브라우저에 함께 저장됩니다.",
    },
    {
      q: "Q8. AI 집필 도중에 멈추거나 오류가 나면 처음부터 다시 해야 하나요?",
      a: "아닙니다. '전자책 생성하기'는 목차의 장을 하나씩 순서대로 만들며, 중간에 멈춰도 그때까지 만든 장은 남습니다. 마음에 들지 않는 장은 왼쪽 메뉴 '목차 & 챕터 집필'에서 그 장만 직접 고치거나 「이 장만 AI로 집필하기」로 다시 만들 수 있습니다. 같은 장을 다시 만들면 AI 호출이 한 번 더 일어나 요금도 한 번 더 듭니다.",
    },
    {
      q: "Q9. 같은 계정으로 여러 기기에서 쓸 수 있나요?",
      a: "같은 계정으로 PC 1곳과 모바일 1곳에서 동시에 쓸 수 있습니다. 같은 종류의 기기(예: 다른 PC)에서 새로 로그인하면 그 종류의 이전 로그인만 끊깁니다. 작업 중인 전자책은 브라우저에만 저장되므로 기기를 바꿀 때는 Q6의 JSON 백업을 이용해 주세요.",
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
              {APP_VERSION} 매뉴얼
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

        {/* 1-1. 시작 전 준비 — AI 기능을 쓸 때만 필요한 본인 키 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              시작 전 준비 — AI를 쓸 때만 본인 키가 필요합니다
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="focus-card p-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-900">1. 키 없이 되는 일</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                자료 넣기, 목차 자동 나누기, 직접 쓰기·고치기, 테마·서체 고르기, 표지 이미지 올리기, HTML·EPUB·ZIP·인쇄 내보내기는 키 없이 바로 쓸 수 있습니다.
              </p>
            </div>
            <div className="focus-card p-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-900">2. 키가 필요한 단추</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                「AI 목차 제안」, 「전자책 생성하기」, 「이 장만 AI로 집필하기」는 고른 모델 플랫폼(OpenAI·Claude·Gemini)의 본인 키로 동작합니다. 누를 때마다 회원님 키로 요금이 발생할 수 있습니다.
              </p>
            </div>
            <div className="focus-card p-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-900">3. 키 등록 위치</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                왼쪽 메뉴 맨 아래 「🔑 API 키·모델 설정」에서 모델을 고르고 키를 넣은 뒤 「설정 저장」을 누릅니다. 발급 방법은 아래 매뉴얼을 따라 하시면 됩니다.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {KEY_GUIDES.map((g) => (
                  <a
                    key={g.name}
                    href={g.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-2 py-1 rounded-lg transition"
                  >
                    📖 {g.name} 발급 방법
                  </a>
                ))}
              </div>
            </div>
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
                왼쪽 메뉴 「자료 수집 & 기획」에서 TXT·Markdown·DOCX 파일을 끌어다 놓거나, 웹 주소를 한 줄에 하나씩(한 번에 최대 12개) 넣고 「주소 분석」을 누르거나, 본문을 50자 이상 직접 붙여넣습니다. 넣는 즉시 아래에 목차가 만들어집니다. PDF·한글(HWP) 파일은 올릴 수 없으니 글자를 복사해 붙여넣어 주세요.
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
                소제목(#, ##)과 분량을 기준으로 장이 자동으로 나뉘고, 제목은 목록에서 바로 고칩니다. 「AI 목차 제안」을 누르면 AI가 장 제목을 다듬어 줍니다. 그다음 왼쪽 메뉴 「디자인 & 표지」 맨 아래에서 정리 수준(상세 정리·핵심 요약·원문 그대로)과 모델을 고르고 「전자책 생성하기」를 누르면 장을 하나씩 순서대로 씁니다.
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
                「디자인 & 표지」에서 21종 독서 테마, 5종 한글 서체, 10가지 디자인 조합을 고르고 「직접 표지 이미지 등록」으로 표지를 올립니다(없으면 테마에 맞는 글자 표지가 자동으로 들어갑니다). 표지 프롬프트 4종은 복사해 원하는 이미지 도구에서 쓸 수 있습니다. 오른쪽 미리보기에 바로 반영되며 모바일·태블릿·데스크톱 폭으로 바꿔 볼 수 있습니다. 만든 글은 「목차 & 챕터 집필」에서 장별로 제목·요약·본문을 고치고 순서를 바꿉니다.
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
                왼쪽 메뉴 「배포 & 내보내기」(또는 상단 단추)에서 단일 HTML, EPUB, 웹 배포용 ZIP을 내려받고 인쇄 창에서 PDF로 저장합니다. 같은 화면 맨 아래 「프로젝트 JSON 백업」으로 작업 원본도 꼭 받아 두세요.
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

            <div className="focus-card p-5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <FileCheck className="w-4 h-4" />
                <span>프로젝트 JSON 백업 · 불러오기 (.json)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                독자에게 주는 파일이 아니라 내 작업 원본입니다. 원고·목차·스타일 설정이 한 파일에 담기며, 「JSON 불러오기」로 다른 PC나 다른 브라우저에서 이어서 고칠 수 있습니다. 작업은 브라우저에만 저장되므로 중요한 책은 수시로 백업해 주세요.
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
              <span className="font-bold text-emerald-900 block">1. 원본 문서와 원고는 서버에 보관하지 않습니다</span>
              <p>
                올린 TXT·Markdown·DOCX 파일은 브라우저 안에서 읽고, 전자책 원고는 이 브라우저의 저장 공간에만 남습니다. 웹 주소 가져오기와 AI 호출은 서버를 거치지만 내용을 저장하지 않습니다.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-emerald-900 block">2. 회원 본인 API 키로만 동작합니다</span>
              <p>
                운영자 또는 타인의 키를 공유하지 않으며, 회원님이 등록한 본인 API 키(OpenAI·Claude·Gemini 중 고른 플랫폼)로만 안전하게 구동됩니다. 키가 없어도 직접 쓰기와 모든 내보내기는 그대로 쓸 수 있습니다.
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
