"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  Flame,
  PenLine,
  Send,
  Download,
  KeyRound,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  ImagePlus,
  Copy,
  Clock,
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { RETENTION_DAYS } from "@/lib/retention";

export default function GuidePage() {
  const currentYear = new Date().getFullYear();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [photoGuideStep, setPhotoGuideStep] = useState(0);
  const [photoCopyNotice, setPhotoCopyNotice] = useState("");
  const photoSteps = [
    { title: "사진 선택", text: "콘텐츠 생성의 ‘내 사진 준비’를 펼치고 사진을 선택하거나 끌어 놓으세요.", detail: "JPEG·PNG·WebP를 한 장에 4MB 이하, 최대 6장까지 선택합니다. 읽히지 않는 파일은 안내를 확인하고 목록에서 제거해 주세요." },
    { title: "대표와 순서", text: "원하는 사진의 ‘대표로’를 누르고 화살표로 앞뒤 순서를 정하세요.", detail: "업로드 완료 순서와 상관없이 선택한 순서와 대표 사진을 유지합니다. 대표 사진을 제거하면 남은 목록의 첫 사진이 대표가 됩니다." },
    { title: "사진별 설명", text: "사진에 실제로 보이는 내용과 직접 경험한 사실을 설명에 적으세요.", detail: "설명은 사진 한 장당 500자까지 입력할 수 있습니다. 순서를 바꾸어도 해당 사진의 설명은 함께 이동합니다. 개인정보·타인의 얼굴은 사용 전에 확인하세요." },
    { title: "준비 상태 확인", text: "모든 사진의 ‘준비 완료’와 보관 만료 날짜를 확인하세요.", detail: "저장 후 상태 조회만 실패했다면 ‘다시 확인’으로 조회만 재시도합니다. 새로고침·다른 화면 이동 시 현재 목록과 설명이 초기화됩니다. 지금은 사진 준비까지만 제공하며 기존 글 생성에는 아직 사용되지 않습니다." },
  ];

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const FAQS = [
    {
      q: "전송 버튼이 눌리지 않거나 비활성화되어 있어요.",
      a: "원고의 1) 서버 저장 완료, 2) 발행 설정 저장(네이버 카테고리/태그), 3) '직접 검수 완료 기록' 체크 버튼이 모두 완료되었는지 확인해 주세요. 특히 입력 중인 태그는 엔터 또는 [추가]를 눌러 등록해야 합니다.",
    },
    {
      q: "크롬 확장 프로그램과 어떻게 연결하나요?",
      a: "1) 상단 [확장 ZIP 다운로드]를 받아 압축을 풉니다. 2) Chrome 주소창에 chrome://extensions 접속 후 [개발자 모드]를 켜고 [압축해제된 확장 프로그램을 로드합니다]를 클릭합니다. 3) [설정] 메뉴에서 '크롬 확장 페어링 코드'를 발급받아 확장 팝업에 블로그 ID와 8자리 코드를 입력하면 즉시 연결됩니다.",
    },
    {
      q: "추천하는 '발행 전 준비까지만' 모드는 어떤 방식인가요?",
      a: "원고와 이미지를 네이버 스마트에디터 ONE 글쓰기 화면에 완벽하게 자동 입력해 두고, 마지막 [발행] 버튼을 누르기 직전 단계에서 멈추는 가장 안전한 추천 모드입니다. 회원이 직접 화면에서 제목, 서식, 이미지를 최종 확인한 후 발행 버튼을 직접 클릭합니다.",
    },
    {
      q: "이미지는 생성되었는데 저장이 실패했다고 나와요.",
      a: "일시적인 네트워크 지연일 수 있습니다. 화면을 새로고침하지 마시고 [보관함 저장] 버튼을 다시 눌러주세요. 이미 생성 성공한 이미지는 보존되며, 저장 확인 전에는 유료 재호출을 피하기 위해 추가 생성을 반복하지 마세요.",
    },
    {
      q: "생성된 원고와 이미지의 보관 기간은 어떻게 되나요?",
      a: `모든 생성 데이터는 회원 본인 소유 격리 원칙에 따라 ${RETENTION_DAYS}일 동안 안전하게 보관된 후 자동 삭제됩니다. 장기 보관이 필요한 원고는 텍스트 복사나 이미지 다운로드로 PC에 백업해 두시기를 권장합니다.`,
    },
  ];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* 1. 상단 환영 히어로 배너 (네이버 그린 & 에메랄드 테마) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-800 p-6 sm:p-8 text-white shadow-lg">
        {/* 배경 빛 장식 */}
        <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              <span>네이버 블로그 에이전트 공식 가이드북 · {APP_VERSION}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              떡상 글감 수집부터 스마트에디터 ONE 안전 자동 발행까지
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed font-normal">
              {currentYear}년 네이버 C-Rank 및 D.I.A.+ 검색엔진 알고리즘에 맞춘 3단계 원스톱 워크플로우로 일일 방문자 수가 급증하는 고품질 블로그를 완성하세요.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <a
              href="/downloads/naver-blog-agent-extension-latest.zip"
              download="naver-blog-agent-extension-latest.zip"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-xs font-black text-slate-900 shadow-md hover:bg-amber-300 transition-transform active:scale-95"
            >
              <Download className="h-4 w-4 text-slate-900" />
              <span>확장 프로그램 ZIP 다운로드</span>
            </a>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-xs font-bold text-white backdrop-blur-md hover:bg-white/30 transition-transform active:scale-95"
            >
              <KeyRound className="h-4 w-4 text-amber-300" />
              <span>API 키 & 계정 설정</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 3단계 핵심 워크플로우 카드 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              3단계 올인원 제작 파이프라인
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">STEP 1 ➔ STEP 3</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* STEP 1 */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-xs font-black text-rose-800">
                  01
                </span>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  글감 수집
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-black text-slate-900">떡상 콘텐츠 수집</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                실시간 인기 급상승 검색어와 유튜브/뉴스 트렌드 토픽을 수집하여 지금 사람들이 가장 많이 찾는 화제의 소재를 포착합니다.
              </p>
            </div>
            <Link
              href="/collector"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              <span>글감 수집하러 가기</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* STEP 2 */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-800">
                  02
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  5단계 생성
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-black text-slate-900">콘텐츠 생성</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                기획 → 초안 → 윤문 → AI 검수 → 이미지 컷 생성의 5단계 파이프라인으로 체류 시간이 긴 감성/정보성 블로그 원고를 완성합니다.
              </p>
            </div>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              <span>원고 작성하기</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* STEP 3 */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-800">
                  03
                </span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  보관 & 발행
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-black text-slate-900">콘텐츠 보관함</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                완성된 원고를 최종 직접 검수하고 크롬 확장에 전송하여 스마트에디터 ONE에 제목·서식·이미지를 안전하게 자동 입력합니다.
              </p>
            </div>
            <Link
              href="/queue"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              <span>보관함 확인하기</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. 스마트에디터 ONE 크롬 확장 프로그램 설치 & 페어링 가이드 */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            스마트에디터 ONE 전용 크롬 확장 설치 & 1회 페어링
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 mb-6 font-normal">
          단 1회 크롬 확장을 설치하고 연결 코드를 등록하면, 복사/붙여넣기 없이 버튼 하나로 네이버 글쓰기 화면에 글과 사진이 자동 입력됩니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">
                1
              </span>
              <h4 className="text-xs font-black text-slate-900">확장 ZIP 다운로드</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              상단 배너의 [확장 ZIP 다운로드]를 클릭하여 PC에 최신 패키지를 다운로드하고 압축을 풉니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">
                2
              </span>
              <h4 className="text-xs font-black text-slate-900">개발자 모드 등록</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              크롬 주소창에 <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">chrome://extensions</code> 입력 후 [개발자 모드]를 켜고 압축 해제 폴더를 로드합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">
                3
              </span>
              <h4 className="text-xs font-black text-slate-900">8자리 페어링 코드 발급</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              [설정] 메뉴에서 내 네이버 블로그 ID를 입력하고 8자리 연결 코드를 발급받아 확장에 입력합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">
                4
              </span>
              <h4 className="text-xs font-black text-slate-900">안전 자동 주입 완료</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              보관함에서 [발행 전송]을 누르면 열린 네이버 글쓰기 화면에 제목, 본문, 사진이 안전하게 입력됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 4. 네이버 C-Rank / D.I.A.+ 검색엔진 상위 노출 체크포인트 */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 sm:p-7">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            네이버 검색 상위 노출 4대 실전 핵심 원칙
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex items-start gap-3 rounded-xl bg-white p-4 border border-emerald-100/80 shadow-2xs">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-black text-emerald-700">
              A
            </span>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900">발행 전 준비까지만 모드 권장</h4>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                새로 만드는 원고는 ‘발행 전 준비까지만’으로 시작합니다. 확장이 본문과 이미지를 입력하면 네이버 화면에서 직접 확인 후 발행을 누르세요. 기존 원고의 진행 방식은 유지되며, 자동 발행을 원하면 해당 원고의 발행 설정에서 직접 선택해 저장할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-white p-4 border border-emerald-100/80 shadow-2xs">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-black text-emerald-700">
              B
            </span>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900">당해 연도({currentYear}년) 기준 최신 정보</h4>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                모든 AI 프롬프트와 기사는 항상 최신 시점을 기준으로 작성되며, 사실관계와 최신 통계 수치를 한 번 더 검토하세요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-white p-4 border border-emerald-100/80 shadow-2xs">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-black text-emerald-700">
              C
            </span>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900">실제 블로그 카테고리 실시간 동기화</h4>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                [네이버 카테고리 불러오기]를 통해 실제 내 블로그의 메뉴 트리를 가져와 정확한 카테고리에 글을 배치하세요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-white p-4 border border-emerald-100/80 shadow-2xs">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-black text-emerald-700">
              D
            </span>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900">소제목 & 인용구로 체류 시간 극대화</h4>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                단순 텍스트 나열을 피하고 소제목, 인용구, 체크리스트 박스를 적절히 섞어 독자의 평균 체류 시간을 높이세요.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="private-photo-guide-title" className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 p-4 sm:px-6">
          <h2 id="private-photo-guide-title" className="flex scroll-mt-20 items-center gap-2 text-base font-bold text-emerald-950"><ImagePlus className="h-5 w-5" aria-hidden="true" />내 사진 준비 사용법</h2>
          <span className="inline-flex items-center gap-1 text-xs text-emerald-800"><Clock className="h-3.5 w-3.5" aria-hidden="true" />약 1분 · 사진 준비</span>
          <Link href="/#private-photo-input" className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">사진 준비 화면 열기 ↗</Link>
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <div className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 p-5 text-white"><p className="text-lg font-bold">사진은 내 계정에, 설명은 사진마다.</p><p className="mt-2 text-sm text-emerald-50">사진 최대 6장을 비공개로 준비하고 대표·순서·설명을 정리하세요. AI 이미지 생성 장수와 별개이며, 지금은 기존 글 생성에 사진이 사용되지 않습니다.</p></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="사진 준비 단계 선택">
            {photoSteps.map((step, index) => <button key={step.title} type="button" aria-pressed={photoGuideStep === index} onClick={() => setPhotoGuideStep(index)} className={`rounded-xl border p-3 text-left ${photoGuideStep === index ? "border-emerald-500 bg-emerald-50 text-emerald-950" : "border-slate-200 text-slate-600"}`}><span className="mb-2 block text-xs font-bold text-emerald-700">STEP {index + 1}</span><span className="text-sm font-semibold">{step.title}</span></button>)}
          </div>
          <div className="rounded-xl border border-slate-200 p-4" aria-live="polite"><h3 className="font-bold text-slate-900">{photoGuideStep + 1}. {photoSteps[photoGuideStep].title}</h3><p className="mt-2 text-sm text-slate-700">{photoSteps[photoGuideStep].text}</p><p className="mt-2 text-xs leading-relaxed text-slate-500">{photoSteps[photoGuideStep].detail}</p></div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><code className="text-xs text-slate-700">JPEG / PNG / WebP · 장당 4MB 이하 · 최대 6장</code><button type="button" onClick={async () => { try { await navigator.clipboard.writeText("JPEG / PNG / WebP · 장당 4MB 이하 · 최대 6장"); setPhotoCopyNotice("사진 규격을 복사했습니다."); } catch { setPhotoCopyNotice("복사하지 못했습니다. 왼쪽 사진 규격을 직접 선택해 주세요."); } }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"><Copy className="h-3 w-3" aria-hidden="true" />규격 복사</button><span role="status" className="w-full text-xs text-slate-600">{photoCopyNotice}</span></div>
          <p className="rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">💡 설명은 사진을 먼저 선택한 뒤 적어도 됩니다. 업로드 중 순서를 바꿔도 설명은 그 사진에 그대로 연결됩니다.</p>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">⚠️ ‘제거’와 ‘전체 취소’는 준비 목록에서만 제외합니다. 이미 전송된 사진은 원래 등록일 기준 30일 후 정리됩니다. 화면을 이동하면 선택과 설명이 사라지므로 현재 작업 중에는 이동·새로고침에 주의하세요.</p>
          <Link href="/settings" className="inline-flex rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800">내 계정·연동 설정 열기 ↗</Link>
        </div>
      </section>

      {/* 5. 자주 묻는 질문 (FAQ) 아코디언 */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            자주 묻는 질문 (FAQ)
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-slate-200/80 transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="flex w-full items-center justify-between gap-4 bg-slate-50/70 p-4 text-left transition hover:bg-slate-100/80"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-200/60 bg-white p-4 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. 하단 바로가기 네비게이션 */}
      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
        <Link
          href="/"
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
        >
          콘텐츠 생성 시작
        </Link>
        <Link
          href="/queue"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
        >
          콘텐츠 보관함
        </Link>
        <Link
          href="/settings"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
        >
          API키 & 계정 설정
        </Link>
      </div>
    </div>
  );
}
