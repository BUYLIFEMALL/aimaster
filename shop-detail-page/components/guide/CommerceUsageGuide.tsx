"use client";

import { useState } from "react";

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "상품 등록 & 사진 업로드",
    tag: "UPLOAD",
    color: "from-blue-600 to-indigo-600",
    icon: "📸",
    desc: "대표 상품 사진 1장과 기본 상품명, 카테고리를 입력합니다. 고해상도 누끼/흰색 배경 사진을 권장합니다.",
  },
  {
    step: "02",
    title: "Gemini Vision AI 정밀 분석",
    tag: "ANALYSIS",
    color: "from-indigo-600 to-violet-600",
    icon: "🧠",
    desc: "AI가 상품의 핵심 차별점(USP), 타겟 고객 페르소나, 주요 스펙, 감성 디자인 톤을 자동으로 도출합니다.",
  },
  {
    step: "03",
    title: "15단 섹션별 맞춤 이미지 생성",
    tag: "GENERATION",
    color: "from-violet-600 to-pink-600",
    icon: "🎨",
    desc: "인트로 헤더부터 CTA까지 이커머스 매출 전환에 필수적인 15개 섹션을 고해상도 이미지로 각각 생성합니다.",
  },
  {
    step: "04",
    title: "세로 롱 이미지 병합 & 다운로드",
    tag: "EXPORT",
    color: "from-orange-500 to-amber-500",
    icon: "📜",
    desc: "완성된 15개 섹션을 원클릭으로 세로 결합하여 스마트스토어, 쿠팡, 자사몰에 바로 등록 가능한 단일 이미지로 저장합니다.",
  },
];

const SECTIONS_15P = [
  { num: "01", name: "인트로 헤더", desc: "시선 강탈 메인 비주얼 & 헤드카피", icon: "✨" },
  { num: "02", name: "브랜드 스토리", desc: "탄생 배경과 철학 소개", icon: "📖" },
  { num: "03", name: "핵심 문제제기", desc: "고객의 일상 속 불편함과 공감대 형성", icon: "🎯" },
  { num: "04", name: "특장점 솔루션", desc: "제품만의 독보적 핵심 차별화(USP)", icon: "💡" },
  { num: "05", name: "디테일 컷", desc: "초근접 마감, 질감, 디테일 퀄리티", icon: "🔍" },
  { num: "06", name: "실사용법 가이드", desc: "누구나 쉬운 단계별 활용 방법", icon: "🛠️" },
  { num: "07", name: "비포 & 애프터", desc: "사용 전후 드라마틱한 비교 효과", icon: "⚖️" },
  { num: "08", name: "라이프스타일 컷", desc: "일상 공간 속 감성적인 연출 장면", icon: "🛋️" },
  { num: "09", name: "규격 & 스펙표", desc: "크기, 용량, 소재, 중량 정보", icon: "📐" },
  { num: "10", name: "특허 및 품질인증", desc: "KC인증, 특허, 시험성적서 신뢰도", icon: "🏆" },
  { num: "11", name: "실구매자 리얼 리뷰", desc: "별점 5점 고객 감동 후기 모음", icon: "💬" },
  { num: "12", name: "자주 묻는 질문(FAQ)", desc: "구매 전 망설임 해소 Q&A", icon: "❓" },
  { num: "13", name: "배송 & 패키지", desc: "안전 포장 및 당일 배송 안내", icon: "📦" },
  { num: "14", name: "신뢰 보증 시스템", desc: "100% 환불/교환 A/S 약속", icon: "🛡️" },
  { num: "15", name: "구매전환 CTA", desc: "한정 혜택 강조 및 즉시 구매 유도", icon: "🛒" },
];

export function CommerceUsageGuide() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-8 rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/50 via-white to-white p-5 sm:p-6 shadow-sm">
      {/* 가이드 상단 헤더 & 접기 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20 text-base">
            🛍️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                AI 15단 상세페이지 제작 가이드 & 동작원리
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                PRO SELLER
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              상품 사진 1장으로 기획·문구 작성부터 15개 섹션 이미지 생성 및 세로 롱 이미지 병합까지 전자동 처리됩니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
        >
          <span>{isOpen ? "가이드 접기" : "가이드 펼쳐보기"}</span>
          <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
        </button>
      </div>

      {/* 접이식 본문 컨텐츠 */}
      {isOpen && (
        <div className="mt-5 space-y-6">
          {/* 1. 4단계 워크플로우 다이어그램 */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">WORKFLOW</span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">4단계 전자동 상세페이지 파이프라인</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {WORKFLOW_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="relative rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-400 font-mono">STEP {item.step}</span>
                    <span className="text-base">{item.icon}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. 15개 섹션 블록 구조도 */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">STRUCTURE</span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  이커머스 매출을 극대화하는 15대 필수 섹션 블록 맵
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">15개 섹션 완벽 구성</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {SECTIONS_15P.map((sec) => (
                <div
                  key={sec.num}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 hover:bg-white hover:border-blue-300 hover:shadow-2xs transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-blue-600 font-mono">#{sec.num}</span>
                    <span className="text-xs">{sec.icon}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 truncate">{sec.name}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{sec.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. 셀러 핵심 팁 박스 */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 sm:p-4 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1.5">
              <span>💡</span>
              <span>스마트스토어 · 쿠팡 셀러 성공 꿀팁</span>
            </div>
            <ul className="text-[11px] text-amber-900/80 space-y-1 pl-4 list-disc">
              <li>
                <strong>정방형(1:1) 누끼 사진 권장:</strong> 피사체가 선명하고 배경이 깔끔한 사진을 등록할수록 AI의 디테일 묘사력과 합성 완성도가 높아집니다.
              </li>
              <li>
                <strong>섹션별 개별 재생성:</strong> 생성된 15개 섹션 중 특정 섹션의 문구나 구도가 아쉬울 경우, 전체를 다시 만들 필요 없이 해당 섹션만 [재생성]할 수 있습니다.
              </li>
              <li>
                <strong>인증·효능 문구 검토:</strong> 의료기기/건강식품 등 과대광고 심의 규정이 있는 품목은 AI 생성 문구가 실제 인증 사실과 일치하는지 확인 후 사용하세요.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
