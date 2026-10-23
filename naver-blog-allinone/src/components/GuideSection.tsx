"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Sparkles,
  Lightbulb,
  Utensils,
  Search,
  Archive,
  Download,
  ChevronDown,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Copy,
  Layers,
  ArrowRight,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";

interface GuideSectionProps {
  onGoTab?: (tab: "ideas" | "places" | "keyword-finder" | "library") => void;
  onOpenSettings?: () => void;
}

export function GuideSection({ onGoTab, onOpenSettings }: GuideSectionProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const FAQS = [
    {
      q: "API 키는 어디에 저장되며 안전한가요?",
      a: "등록하신 Gemini 및 이미지 생성 API 키는 서버 DB에 전송되지 않으며, 사용자 본인의 브라우저 로컬 저장소(LocalStorage)에만 안전하게 암호화 격리 저장됩니다. 타 회원이나 관리자와 일체 공유되지 않습니다.",
    },
    {
      q: "생성된 블로그 글을 네이버 스마트에디터 ONE에 어떻게 옮기나요?",
      a: "두 가지 초간편 방식을 제공합니다. 1) 상단 [크롬 확장 프로그램]을 설치하시면 스마트에디터 ONE 화면에서 [1초 자동 주입] 버튼을 클릭해 제목, 본문, 서식, 이미지를 한 번에 넣을 수 있습니다. 2) 또는 원고 하단의 [서식 복사(HTML)] 버튼을 누른 후 스마트에디터 본문에 붙여넣기(Ctrl+V)하시면 서식 그대로 복사됩니다.",
    },
    {
      q: "AI가 생성한 글이 네이버 저품질이나 유사문서에 걸리지 않나요?",
      a: "단순 복사/생성 방식이 아닌, 네이버 C-Rank 및 D.I.A.+ 알고리즘에 맞춘 풍부한 경험형 문체, 소제목/인용구/체크리스트 분할, 실제 방문자 리뷰 스타일을 적용합니다. 특히 '맛집/카페/여행 비전'을 통해 직접 찍은 사진을 분석하면 고유성이 극대화되어 안전합니다.",
    },
    {
      q: "키워드 파인더의 7대 엔진 분석은 어떤 기능인가요?",
      a: "단순 검색량뿐 아니라 월간 검색량 추이, 문서수 대비 경쟁 강도, 연관 검색어, 블로그 탭 상위 노출 가능성, 롱테일 확장 키워드를 다각도로 분석하여 내 블로그 지수에 최적화된 노출 효자 키워드를 추천합니다.",
    },
    {
      q: "모바일 스마트폰 환경에서도 사용이 가능한가요?",
      a: "네! 네이버 블로그 올인원 자동화는 375px 모바일 화면에 최적화된 반응형 UI와 햄버거 슬라이드 드로어를 지원합니다. 이동 중 스마트폰으로 아이디어를 발굴하거나 사진을 업로드해 원고를 생성하고 보관함에 저장할 수 있습니다.",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. 상단 환영 히어로 배너 (네이버 그린 & 에메랄드 테마) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-800 p-6 sm:p-8 text-white shadow-lg">
        {/* 장식용 배경 빛 효과 */}
        <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              <span>{APP_NAME} 공식 가이드북 · {APP_VERSION}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              아이디어 발굴부터 네이버 스마트에디터 ONE 1초 주입까지
            </h2>
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed font-normal">
              네이버 C-Rank 및 D.I.A.+ 알고리즘에 최적화된 4단계 파이프라인으로 일일 방문자 수가 급증하는 고품질 포스팅을 손쉽게 완성하세요.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <a
              href="/downloads/naver-blog-allinone-latest.zip"
              download="naver-blog-allinone-latest.zip"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-xs font-black text-slate-900 shadow-md hover:bg-amber-300 transition-transform active:scale-95"
            >
              <Download className="h-4 w-4 text-slate-900" />
              <span>크롬 확장 ZIP 다운로드</span>
            </a>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/20 border border-white/30 px-4 py-3 text-xs font-bold text-white backdrop-blur-md hover:bg-white/30 transition-transform active:scale-95"
              >
                <Zap className="h-4 w-4 text-amber-300" />
                <span>API 키 등록하기</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. 4단계 핵심 워크플로우 카드 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              4단계 올인원 제작 파이프라인
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">STEP 1 ➔ STEP 4</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* STEP 1 */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-xs font-black text-amber-800">
                  01
                </span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  주제 발굴
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h4 className="text-sm font-black text-slate-900">주제 아이디어 발굴</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                E-E-A-T 기반, 5대 카테고리(맛집·여행·IT·라이프·재테크), 에버그린, 내 메모/파일 업로드를 통해 오늘 쓸 황금 소재를 1초 만에 도출합니다.
              </p>
            </div>
            {onGoTab && (
              <button
                type="button"
                onClick={() => onGoTab("ideas")}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                <span>발굴하러 가기</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* STEP 2 */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-800">
                  02
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  멀티모달 비전
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-emerald-500" />
                <h4 className="text-sm font-black text-slate-900">맛집/카페/여행 비전</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                스마트폰 사진을 올리면 Gemini 비전 AI가 매장 분위기, 메뉴, 인테리어를 분석하여 실제 다녀온 듯한 생생한 감성 후기를 자동 집필합니다.
              </p>
            </div>
            {onGoTab && (
              <button
                type="button"
                onClick={() => onGoTab("places")}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                <span>사진 분석하기</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* STEP 3 */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-800">
                  03
                </span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  7대 엔진
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-indigo-500" />
                <h4 className="text-sm font-black text-slate-900">키워드 파인더 PRO</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                검색량, 문서수, 경쟁 강도, 블로그 탭 실시간 노출 순위를 복합 분석하여 내 블로그 지수에 맞춰 상위 노출 가능한 꿀 키워드를 잡습니다.
              </p>
            </div>
            {onGoTab && (
              <button
                type="button"
                onClick={() => onGoTab("keyword-finder")}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                <span>키워드 찾기</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* STEP 4 */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-xs font-black text-purple-800">
                  04
                </span>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  자동 주입
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-purple-500" />
                <h4 className="text-sm font-black text-slate-900">생성 본문 보관함</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                완성된 고품질 원고와 AI 맞춤 이미지를 안전하게 저장하고, 스마트에디터 ONE 원클릭 자동 주입 및 HTML 서식 복사로 배포합니다.
              </p>
            </div>
            {onGoTab && (
              <button
                type="button"
                onClick={() => onGoTab("library")}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                <span>보관함 열기</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. 스마트에디터 ONE 크롬 확장 프로그램 1초 연동 가이드 */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            스마트에디터 ONE 크롬 확장 프로그램 설치 & 1초 연동법
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 mb-6 font-normal">
          크롬 확장 프로그램을 단 1회 설치하시면, 네이버 블로그 글쓰기 창에서 복사/붙여넣기 없이 버튼 한 번으로 제목·본문·이미지가 자동 입력됩니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">
                1
              </span>
              <h5 className="text-xs font-black text-slate-900">ZIP 파일 다운로드</h5>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              상단 헤더의 [크롬 확장 프로그램 ZIP] 버튼을 눌러 압축 파일을 PC에 다운로드합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">
                2
              </span>
              <h5 className="text-xs font-black text-slate-900">개발자 모드 ON</h5>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              크롬 주소창에 <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">chrome://extensions</code> 입력 후 우측 상단 [개발자 모드]를 켭니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">
                3
              </span>
              <h5 className="text-xs font-black text-slate-900">압축 해제 폴더 로드</h5>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              압축을 푼 폴더를 [압축해제된 확장 프로그램을 로드합니다] 버튼으로 등록합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">
                4
              </span>
              <h5 className="text-xs font-black text-slate-900">스마트에디터 ONE 자동주입</h5>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              네이버 블로그 글쓰기 화면에 접속하면 우측 플로팅 패널에서 [1초 주입]을 누르기만 하면 완료!
            </p>
          </div>
        </div>
      </div>

      {/* 4. 네이버 C-Rank / D.I.A.+ 검색엔진 알고리즘 최적화 팁 */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 sm:p-7">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            네이버 검색 상위 노출 4대 실전 체크포인트
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex items-start gap-3 rounded-xl bg-white p-4 border border-emerald-100/80 shadow-2xs">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-black text-emerald-700">
              A
            </span>
            <div className="space-y-1">
              <h5 className="text-xs font-black text-slate-900">제목 핵심 키워드 전진 배치</h5>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                타겟 키워드를 제목 가장 앞쪽에 자연스럽게 넣고, 호기심과 클릭을 유도하는 수식어를 결합하세요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-white p-4 border border-emerald-100/80 shadow-2xs">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-black text-emerald-700">
              B
            </span>
            <div className="space-y-1">
              <h5 className="text-xs font-black text-slate-900">체류 시간을 늘리는 인용구 & 소제목</h5>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                문단을 길게 늘어놓지 말고 소제목, 인용구, 번호 매기기 박스로 가독성을 극대화하여 독자의 이탈을 방지하세요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-white p-4 border border-emerald-100/80 shadow-2xs">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-black text-emerald-700">
              C
            </span>
            <div className="space-y-1">
              <h5 className="text-xs font-black text-slate-900">고유한 사진 3~5장과 캡션 활용</h5>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                맛집/카페 비전 엔진으로 분석한 직접 찍은 사진이나 AI 고유 이미지를 본문 사이사이에 적절히 배치하세요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-white p-4 border border-emerald-100/80 shadow-2xs">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-black text-emerald-700">
              D
            </span>
            <div className="space-y-1">
              <h5 className="text-xs font-black text-slate-900">자연스러운 키워드 반복 빈도</h5>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                억지로 키워드를 도배하지 않고 1,500자 원고 기준 3~5회 문맥에 맞게 스며들도록 작성하세요.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. 자주 묻는 질문 (FAQ) 아코디언 */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            자주 묻는 질문 (FAQ)
          </h3>
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
    </div>
  );
}
