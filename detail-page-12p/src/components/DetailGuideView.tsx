"use client";

import { useState } from "react";
import {
  LayoutTemplate,
  Sparkles,
  KeyRound,
  FileSpreadsheet,
  Cpu,
  Layers,
  Download,
  CheckCircle2,
  ChevronDown,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  Smartphone,
  Zap,
} from "lucide-react";

interface DetailGuideViewProps {
  onStartNew: () => void;
  onOpenApiKey: () => void;
}

// 5단계 제작 파이프라인 데이터
const PIPELINE_STEPS = [
  {
    step: "01",
    badge: "API KEY",
    title: "본인 Google Gemini API 키 연동",
    desc: "사이드바의 [API키등록·플랫폼연동] 메뉴에서 본인의 Google AI Studio Gemini API 키를 등록합니다. 회원 본인 계정의 키로만 동작하여 사용량 제한 없이 안전하고 자유롭게 상세페이지를 제작할 수 있습니다.",
    tip: "Gemini 2.5 Flash 및 Imagen / Nano Banana 엔진을 활용하여 고성능 텍스트 카피 및 비주얼 렌더링을 지원합니다.",
    icon: KeyRound,
    color: "blue",
  },
  {
    step: "02",
    badge: "INPUT & SEARCH",
    title: "제품 기본정보 & 1초 스마트 스펙 자동검색",
    desc: "상품명과 판매 가격을 입력한 뒤 [1초 스펙 자동검색]을 클릭하면, AI가 최신 시장 데이터를 분석하여 규격, 소재, 장점, 타겟 고객군, 이벤트 문구를 자동으로 채워줍니다.",
    tip: "보유 중인 PDF 카탈로그, TXT 사양서가 있다면 [사양서 파싱] 창에 붙여넣어 100% 정확한 스펙을 추출할 수 있습니다.",
    icon: FileSpreadsheet,
    color: "indigo",
  },
  {
    step: "03",
    badge: "AI PLANNING",
    title: "쿠팡 12단 · 네이버 9단 AI 전체 카피 기획",
    desc: "선택한 플랫폼(쿠팡 로켓배송 12단 / 네이버 스마트스토어 9단)의 공식 전환율 공식에 맞춰, 프로모션 헤더부터 후킹 포인트, 특장점 비교표, Q&A, 패키지 구성까지 일괄 기획합니다.",
    tip: "모든 카피는 2026년 기준 시점과 현재 월(Month) 계절감에 맞춰 자동으로 보정됩니다.",
    icon: Cpu,
    color: "purple",
  },
  {
    step: "04",
    badge: "VISUAL RENDER",
    title: "Nano Banana 멀티모달 상업용 씬별 렌더링",
    desc: "12개 씬별로 전문 커머스 배지, 메인 타이틀, 서브 카피, 강조 불릿이 적용된 상업용 프리셋 그래픽 카드가 즉시 생성됩니다. 필요 시 [AI 이미지 재생성]을 통해 각 씬에 최적화된 사진을 추가할 수 있습니다.",
    tip: "기본 제공되는 고해상도 SVG 벡터 그래픽은 확대해도 깨지지 않으며 즉시 통상세페이지 합성에 활용할 수 있습니다.",
    icon: Layers,
    color: "emerald",
  },
  {
    step: "05",
    badge: "EXPORT",
    title: "860px 쿠팡 표준 세로 통상세페이지 자동 합성 & 다운로드",
    desc: "스튜디오 우측의 스마트폰 라이브 뷰어에서 실시간 미리보기를 확인하고, [860px 통상세 이미지 다운로드] 버튼을 눌러 쿠팡/스마트스토어 등록용 단일 JPG 또는 12장 개별 ZIP 파일로 내려받습니다.",
    tip: "HTML5 Canvas를 통해 브라우저 자체에서 860px 표준 해상도로 결합되므로 서버 대기 시간 없이 즉시 저장됩니다.",
    icon: Download,
    color: "rose",
  },
];

// 12단 씬 표준 구성표
const SCENE_STRUCTURE = [
  { no: "01", name: "프로모션 헤더", role: "한정 혜택, 즉시 할인, 사은품 증정 등 구매 충동 자극" },
  { no: "02", name: "브랜드 스토리", role: "제작 철학과 프리미엄 감성 전달, 신뢰도 형성" },
  { no: "03", name: "핵심 소구점 (Hook 1)", role: "고객의 페인 포인트(불편함) 정밀 타격" },
  { no: "04", name: "핵심 소구점 (Hook 2)", role: "경쟁사 대비 압도적인 차별화 기술 및 혁신" },
  { no: "05", name: "핵심 소구점 (Hook 3)", role: "실사용자가 누릴 수 있는 결정적 이점(Benefit)" },
  { no: "06", name: "디테일 클로즈업", role: "마감 품질, 소재, 부품 신뢰성 시각적 증명" },
  { no: "07", name: "스펙 & 특장점 비교표", role: "기존 일반 제품 vs 당사 제품의 성능/가격 대조" },
  { no: "08", name: "사용 방법 & 활용 팁", role: "초보자도 알기 쉬운 단계별 조작 가이드" },
  { no: "09", name: "패키지 구성품 안내", role: "박스 개봉 시 제공되는 본체 및 사은품 목록" },
  { no: "10", name: "안전 인증 & 품질 보증", role: "KC 인증, 시험성적서, A/S 정책으로 안심 구매 유도" },
  { no: "11", name: "자주 묻는 질문 (FAQ)", role: "배송, 보관, 교환/반품 등 고객 구매 장벽 제거" },
  { no: "12", name: "구매 전환 피날레 (CTA)", role: "최종 혜택 리마인드 및 즉시 구매 유도" },
];

// 플랫폼 권장 규격표
const PLATFORM_SPECS = [
  {
    platform: "쿠팡 (Coupang)",
    badge: "12단 권장",
    width: "가로 860px (표준)",
    height: "세로 길이 제한 없음 (통이미지 또는 섹션 분할)",
    tips: "로켓배송 모바일 뷰에 최적화된 860px 가로폭 권장. 본 스튜디오의 [860px 통상세 이미지] 기능이 100% 호환됩니다.",
  },
  {
    platform: "네이버 스마트스토어",
    badge: "9단 이상 권장",
    width: "가로 860px (스마트에디터 ONE)",
    height: "장당 세로 20,000px 이내 권장",
    tips: "스마트에디터 ONE 컴포넌트에 맞춰 섹션별 개별 이미지로 업로드하거나 세로 통이미지로 등록할 수 있습니다.",
  },
  {
    platform: "자사몰 / 오픈마켓",
    badge: "자유 규격",
    width: "가로 860px ~ 1000px",
    height: "자유 (고화질 JPG/PNG)",
    tips: "11번가, G마켓, 옥션, 카페24 등 모든 오픈마켓 상세페이지 등록 규격과 호환됩니다.",
  },
];

// 자주 묻는 질문 FAQ
const FAQS = [
  {
    q: "Gemini API 키는 어떻게 등록하나요? 비용이 드나요?",
    a: "Google AI Studio(aistudio.google.com)에서 무료로 API 키를 즉시 발급받아 사이드바 [API키등록·플랫폼연동] 메뉴에 등록하시면 됩니다. 회원님 본인의 Google 계정 무료 한도(Free Tier) 내에서 추가 과금 없이 상세페이지를 기획하실 수 있습니다.",
  },
  {
    q: "1초 스마트 스펙 자동검색은 어떻게 작동하나요?",
    a: "상품명(예: '초경량 접이식 티타늄 화로대')을 입력하고 [1초 스펙 자동검색]을 누르면, AI가 해당 카테고리의 대표 스펙, 재질, 규격, 핵심 소구점을 신속히 추론하여 폼을 자동으로 완성해 줍니다. 원하는 대로 수정하거나 사양서를 직접 붙여넣으실 수도 있습니다.",
  },
  {
    q: "쿠팡용 통이미지는 어떻게 다운로드받나요?",
    a: "상세 스튜디오 우측의 스마트폰 프리뷰어 상단에 있는 [860px 통상세 이미지 다운로드] 버튼을 클릭하시면, 12개 씬 카드가 쿠팡 모바일 표준 가로 860px의 단일 세로 통이미지(JPG)로 브라우저에서 자동 결합되어 저장됩니다.",
  },
  {
    q: "생성된 씬 카드의 카피나 배지를 직접 수정할 수 있나요?",
    a: "네, 스튜디오 화면의 각 씬 카드에서 배지명, 메인 타이틀, 서브 카피, 소구점 텍스트를 클릭하여 자유롭게 직접 수정할 수 있습니다. 수정한 내용은 우측 라이브 프리뷰어에 즉시 실시간 반영됩니다.",
  },
];

export function DetailGuideView({ onStartNew, onOpenApiKey }: DetailGuideViewProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16">
      {/* 1. 상단 히어로 배너 */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700">
              <ShoppingBag size={14} />
              <span>포커스 스튜디오 · 이커머스 상세페이지 가이드북</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              📖 AI 12단 상세페이지 스튜디오 완벽 활용 매뉴얼
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
              상품명 하나로 스펙을 1초 만에 자동 분석하고, 쿠팡 12단 및 스마트스토어 9단 전환율 공식에 최적화된 풀 패키지 상세페이지를 기획부터 860px 통상세 이미지 합성까지 원스톱으로 완성하는 안내서입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartNew}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg"
          >
            <Sparkles size={16} />
            <span>상세페이지 제작 시작하기</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* 2. 5단계 제작 파이프라인 (Step-by-Step) */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-600" size={20} />
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              5단계 상세페이지 제작 파이프라인 (Step-by-Step)
            </h2>
          </div>
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 shadow-2xs">
            초보 셀러도 3분 완성
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {PIPELINE_STEPS.map((item, idx) => {
            const Icon = item.icon;
            const isWide = idx === 3 || idx === 4;
            return (
              <div
                key={item.step}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md ${
                  isWide ? "lg:col-span-1" : ""
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">
                      {item.step}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                      {item.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">{item.desc}</p>
                </div>
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-2.5 text-[11px] text-slate-700">
                  <span className="font-semibold text-blue-700">💡 꿀팁: </span>
                  {item.tip}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. 쿠팡 12단 씬 표준 구성표 */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <LayoutTemplate className="text-indigo-600" size={20} />
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                쿠팡 12단 전환율 극대화 씬 구성표
              </h2>
              <p className="text-xs text-slate-500">구매 결정 심리 프로세스에 맞춰 검증된 12단계 레이아웃</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 shrink-0">
            12-Section Architecture
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {SCENE_STRUCTURE.map((scene) => (
            <div
              key={scene.no}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-white hover:border-indigo-200 hover:shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  SECTION {scene.no}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 mb-1">{scene.name}</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">{scene.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. 이커머스 플랫폼 권장 규격표 */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <Smartphone className="text-blue-600" size={20} />
          <h2 className="text-lg font-black tracking-tight text-slate-900">
            이커머스 플랫폼별 권장 규격 가이드
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {PLATFORM_SPECS.map((spec) => (
            <div
              key={spec.platform}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">{spec.platform}</h3>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    {spec.badge}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-slate-700">
                    가로폭: <span className="text-blue-600 font-bold">{spec.width}</span>
                  </p>
                  <p className="text-slate-500 text-[11px]">{spec.height}</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-slate-200">
                  {spec.tips}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <CheckCircle2 size={13} />
                <span>스튜디오 자동 최적화 지원</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. 자주 묻는 질문 FAQ 아코디언 */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <HelpCircle className="text-blue-600" size={20} />
          <h2 className="text-lg font-black tracking-tight text-slate-900">
            자주 묻는 질문 (FAQ)
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50"
                >
                  <span className="text-sm font-bold text-slate-900">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-200 bg-white p-4 pt-3 text-xs leading-relaxed text-slate-600">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. 하단 바로가기 CTA 배너 */}
      <section className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50/60 to-white p-6 sm:flex-row sm:p-8 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-xs">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">안전한 회원 본인 API 키 기반 시스템</p>
            <p className="text-xs text-slate-500">운영자나 타인의 키로 폴백하지 않으며, 제작된 프로젝트는 내 계정에 안전하게 보관됩니다.</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={onOpenApiKey}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            API 키 설정
          </button>
          <button
            type="button"
            onClick={onStartNew}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition"
          >
            <Sparkles size={15} />
            <span>새 상세페이지 만들기</span>
          </button>
        </div>
      </section>
    </div>
  );
}
