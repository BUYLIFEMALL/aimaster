"use client";

import { useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  Camera,
  Palette,
  Download,
  HelpCircle,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  UploadCloud,
  BadgeCheck,
} from "lucide-react";


// 탭 정의
type GuideTab = "steps" | "sections" | "faq";

// 15개 섹션 상세 정보
const SECTIONS_15P_DETAIL = [
  {
    num: "01",
    name: "인트로 헤더",
    tag: "첫인상 3초",
    icon: "✨",
    desc: "시선 강탈 메인 비주얼 & 강력한 훅 헤드카피",
    strategy: "소비자가 3초 안에 이탈하지 않도록 상품의 가장 매력적인 각도와 핵심 혜택을 대형 폰트로 각인시킵니다.",
    check: "선명한 누끼/연출컷 + 호기심을 유발하는 카피",
  },
  {
    num: "02",
    name: "브랜드 스토리",
    tag: "신뢰 구축",
    icon: "📖",
    desc: "브랜드 철학, 탄생 배경, 장인정신 소개",
    strategy: "단순 제품 판매를 넘어 '왜 이 제품을 만들게 되었는지' 진정성 있는 스토리를 전달해 가격 저항을 낮춥니다.",
    check: "개발자의 고민 + 진정성 있는 슬로건",
  },
  {
    num: "03",
    name: "핵심 문제제기",
    tag: "공감대 형성",
    icon: "🎯",
    desc: "고객이 겪는 일상 속 불편함과 고통 포인트",
    strategy: "'혹시 이런 경험 없으신가요?' 고객이 겪고 있던 실제 불편함을 짚어내어 문제 해결 욕구를 자극합니다.",
    check: "불편한 상황 일러스트/사진 + 공감 질문",
  },
  {
    num: "04",
    name: "특장점 솔루션",
    tag: "핵심 USP",
    icon: "💡",
    desc: "경쟁사 대비 독보적인 제품만의 핵심 솔루션",
    strategy: "경쟁 제품에는 없는 우리 제품만의 기술력이나 특허, 독점 원료를 명확한 그래픽으로 제시합니다.",
    check: "3대 핵심 기능 요약 아이콘 + 혜택 중심 카피",
  },
  {
    num: "05",
    name: "디테일 컷",
    tag: "품질 입증",
    icon: "🔍",
    desc: "초근접 마감, 질감, 부품, 소재 퀄리티",
    strategy: "온라인 구매의 한계인 '만져보지 못함'을 해소하기 위해 바느질, 표면 마감, 조작부를 초접사로 보여줍니다.",
    check: "고해상도 매크로 컷 + 고급 소재 강조",
  },
  {
    num: "06",
    name: "실사용법 가이드",
    tag: "편의성",
    icon: "🛠️",
    desc: "누구나 쉬운 단계별 사용 및 관리 방법",
    strategy: "구매 후 사용이 어려울까 봐 망설이는 고객에게 1-2-3 단계의 초간단 사용법을 시각화합니다.",
    check: "단계별 번호 스텝퍼 + 직관적인 손동작 연출",
  },
  {
    num: "07",
    name: "비포 & 애프터",
    tag: "효과 체감",
    icon: "⚖️",
    desc: "사용 전후의 드라마틱한 변화 비교",
    strategy: "사용 전의 칙칙함/불편함과 사용 후의 쾌적함/편리함을 나란히 배치하여 구매 당위성을 극대화합니다.",
    check: "좌우 대비 직관적 비교 컷 + 수치적 개선율",
  },
  {
    num: "08",
    name: "라이프스타일 컷",
    tag: "감성 자극",
    icon: "🛋️",
    desc: "일상 공간(거실, 주방, 사무실 등) 속 감성 연출",
    strategy: "내 방, 내 사무실에 이 제품이 놓였을 때의 인테리어 조화와 감성적인 분위기를 상상하게 만듭니다.",
    check: "감성적인 인테리어 배경 + 자연광 연출",
  },
  {
    num: "09",
    name: "규격 & 스펙표",
    tag: "정보 제공",
    icon: "📐",
    desc: "가로/세로/높이, 용량, 재질, 중량, 정격전압",
    strategy: "반품과 교환을 방지하기 위해 실측 사이즈와 실제 무게, 소재 성분표를 깔끔한 인포그래픽 표로 제공합니다.",
    check: "치수 가이드라인 그래픽 + 상세 스펙 표",
  },
  {
    num: "10",
    name: "특허 및 품질인증",
    tag: "안전 검증",
    icon: "🏆",
    desc: "KC 안전인증, 시험성적서, 특허증, 수상 내역",
    strategy: "국가 공인 시험기관의 인증 마크와 유해물질 불검출 성적서를 노출해 고객의 불안감을 100% 종식시킵니다.",
    check: "공인 시험성적서 이미지 + KC 마크 엠블럼",
  },
  {
    num: "11",
    name: "실구매자 리얼 리뷰",
    tag: "사회적 증거",
    icon: "💬",
    desc: "평점 4.9점 실구매자들의 생생한 포토 후기 모음",
    strategy: "타인의 실제 구매 경험과 만족도를 통해 '나도 사도 되겠다'는 확신과 군중 심리를 유도합니다.",
    check: "별점 5개 평점 요약 + 실제 리뷰 말풍선 카드",
  },
  {
    num: "12",
    name: "자주 묻는 질문(FAQ)",
    tag: "이탈 방지",
    icon: "❓",
    desc: "구매 결제 직전 가장 많이 망설이는 질문 Q&A",
    strategy: "배송 기간, 호환성, 보관법 등 마지막 망설임 포인트를 선제적으로 답변하여 이탈을 원천 차단합니다.",
    check: "Q&A 아코디언 카드 + 친절하고 명확한 답변",
  },
  {
    num: "13",
    name: "배송 & 패키지",
    tag: "안심 배송",
    icon: "📦",
    desc: "파손 없는 꼼꼼한 완충 포장 및 당일 발송 안내",
    strategy: "선물용 패키지 구성과 에어캡 완충 포장 상태를 보여주어 배송 중 파손 우려를 불식시킵니다.",
    check: "실제 박스 패키지 사진 + 출고 마감 시간 강조",
  },
  {
    num: "14",
    name: "신뢰 보증 시스템",
    tag: "위험 제로",
    icon: "🛡️",
    desc: "100% 교환/환불 정책, 무상 A/S 보증",
    strategy: "'불만족 시 100% 환불' 등 파격적인 품질 보증 약속으로 구매자의 심리적 위험(Risk)을 0으로 만듭니다.",
    check: "품질 보증서 엠블럼 + 고객센터 안내",
  },
  {
    num: "15",
    name: "구매전환 CTA",
    tag: "최종 행동",
    icon: "🛒",
    desc: "오늘만 한정 혜택, 즉시 구매 유도 피날레",
    strategy: "오늘 주문 시 사은품 증정, 무료배송, 한정 수량 할인 등 긴급성(Urgency)을 부여해 결제를 촉진합니다.",
    check: "한정 혜택 배너 + 시선 집중 구매 버튼 유도",
  },
];

export function CommerceUsageGuide() {
  const [activeTab, setActiveTab] = useState<GuideTab>("steps");
  const [expandedSection, setExpandedSection] = useState<string | null>("01");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-6">
      {/* 1. 상단 히어로 카드 */}
      <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
              <ShoppingBag size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  AI 15단 상세페이지 자동화 실전 매뉴얼
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-600 text-white shadow-xs">
                  PRO SELLER
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
                대표 상품 사진 1장으로 기획·카피라이팅 작성부터 15개 섹션 고해상도 생성 및 세로 롱 이미지 병합까지 완벽 가이드
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/products/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02]"
            >
              <Sparkles size={14} />
              <span>지금 상품 제작하기</span>
            </Link>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200/70 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab("steps")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "steps"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/30"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/80"
            }`}
          >
            <Layers size={14} />
            <span>📋 5단계 완벽 실전 가이드</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sections")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "sections"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/30"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/80"
            }`}
          >
            <Palette size={14} />
            <span>🧱 15대 필수 섹션 상세 가이드</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("faq")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "faq"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/30"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/80"
            }`}
          >
            <HelpCircle size={14} />
            <span>💡 셀러 성공 꿀팁 & FAQ</span>
          </button>
        </div>
      </div>

      {/* 2. 탭 컨텐츠 영역 */}

      {/* [탭 1] 5단계 완벽 실전 가이드 */}
      {activeTab === "steps" && (
        <div className="space-y-5">
          {/* STEP 00: 사전 준비 (API 키 연동) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:border-blue-300 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200 font-mono text-xs font-black">
                  00
                </span>
                <span className="text-xs font-black text-amber-600 uppercase tracking-wider">PREPARATION</span>
                <h3 className="text-base font-bold text-slate-900">사전 준비 — Google Gemini API 키 등록</h3>
              </div>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
              >
                <span>API 키 설정 바로가기</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <KeyRound size={13} className="text-amber-500" />
                  <span>1. 본인 API 키 사용 원칙</span>
                </p>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  AIMaster의 최상위 원칙에 따라 회원은 본인이 발급받은 Google Gemini API 키를 직접 등록하여 사용합니다.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <ExternalLink size={13} className="text-blue-500" />
                  <span>2. 무료 발급 방법</span>
                </p>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Google AI Studio(aistudio.google.com)에서 무료 요금제(Free Tier)로 간편하게 API 키를 생성할 수 있습니다.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>3. 키 등록 및 보관</span>
                </p>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  좌측 메뉴 <span className="font-semibold text-slate-800">[API키등록·플랫폼연동]</span>에 입력하면 DB에 안전하게 암호화 보관됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* STEP 01: 상품 등록 및 사진 업로드 */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:border-blue-300 transition-all">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200 font-mono text-xs font-black">
                01
              </span>
              <span className="text-xs font-black text-blue-600 uppercase tracking-wider">STEP 01</span>
              <h3 className="text-base font-bold text-slate-900">대표 상품 사진 등록 & 참고 이미지 추가</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                좌측 메뉴의 <span className="font-bold text-blue-600">[1. 상품 및 상세페이지 분석]</span> 또는 대시보드의 <span className="font-bold text-slate-800">[+ 새 상품 분석하기]</span> 버튼을 클릭하여 새 상품 분석 페이지로 이동합니다.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2">
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40">
                  <h4 className="font-bold text-blue-900 mb-1.5 flex items-center gap-1.5">
                    <Camera size={14} className="text-blue-600" />
                    <span>대표 이미지 업로드 (필수 · 1장)</span>
                  </h4>
                  <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                    <li><strong>핵심 소스</strong>: 이후 생성되는 15개 섹션의 합성 기준이 되는 가장 중요한 사진입니다.</li>
                    <li><strong>권장 규격</strong>: 배경이 깔끔하게 제거된 <strong>누끼컷(투명 PNG)</strong> 또는 <strong>단색/흰색 배경의 1:1 정방형 고화질 컷</strong>.</li>
                    <li><strong>주의점</strong>: 그림자가 너무 짙거나 상품의 일부가 잘린 사진은 피해주세요.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40">
                  <h4 className="font-bold text-indigo-900 mb-1.5 flex items-center gap-1.5">
                    <UploadCloud size={14} className="text-indigo-600" />
                    <span>참고 이미지 업로드 (선택 · 최대 10장)</span>
                  </h4>
                  <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                    <li><strong>디테일 향상</strong>: 부속품, 패키지 상자, 다른 각도 컷, 질감 접사컷 등을 추가 업로드합니다.</li>
                    <li><strong>AI 학습</strong>: 참고 사진이 많을수록 Gemini가 제품의 실물 특징을 더욱 사실적으로 반영합니다.</li>
                    <li><strong>보조 텍스트</strong>: 제조사 스펙표나 원료 성분표 텍스트를 함께 적어주면 카피라이팅이 정교해집니다.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 02: Gemini Vision AI 정밀 분석 */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:border-blue-300 transition-all">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 font-mono text-xs font-black">
                02
              </span>
              <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">STEP 02</span>
              <h3 className="text-base font-bold text-slate-900">Gemini Vision AI 상품 정밀 분석 & 11개 필드 검토</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                사진 등록 후 <span className="font-bold text-blue-600">[AI 상품분석 시작]</span> 버튼을 누르면, 최신 Gemini 멀티모달 비전 모델이 사진과 입력 텍스트를 정밀 분석하여 상세페이지 기획에 필요한 **11대 핵심 필드**를 자동 완성합니다.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="font-bold text-slate-800 mb-2">🔍 자동 분석되어 추출되는 11개 항목:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-[11px]">
                  <span className="bg-white p-2 rounded-lg border border-slate-200 font-medium">1. 공식 상품명 (국문)</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200 font-medium">2. 적합 카테고리</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200 font-medium">3. 핵심 소구점 (USP 3대)</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200 font-medium">4. 상세 규격 & 스펙</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200 font-medium">5. 실사용법 및 보관법</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200 font-medium">6. 타깃 고객 페르소나</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200 font-medium">7. 메인 브랜드 컬러</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200 font-medium">8. 서브 포인트 컬러</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200 font-medium">9. 배경 연출 스타일</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200 font-medium">10. 감성 무드 키워드</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200 font-medium">11. 폰트 & 레이아웃 밀도</span>
                  <span className="bg-blue-50 text-blue-800 p-2 rounded-lg border border-blue-200 font-bold">12. 정상가 & 할인가</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>💡 셀러 검토 팁:</strong> AI가 채워준 11개 필드는 모두 자유롭게 수정할 수 있습니다. 특히 판매할 **정상가와 할인가(이벤트가)**를 입력하고, 강조하고 싶은 특장점이 있다면 소구점 입력칸에 단어를 추가해 주세요.
              </div>
            </div>
          </div>

          {/* STEP 03: 15단 섹션 스튜디오 및 모델별 생성 */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:border-blue-300 transition-all">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-50 text-pink-600 border border-pink-200 font-mono text-xs font-black">
                03
              </span>
              <span className="text-xs font-black text-pink-600 uppercase tracking-wider">STEP 03</span>
              <h3 className="text-base font-bold text-slate-900">15단 섹션 스튜디오 — 생성, 재생성, 직접등록</h3>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <p className="leading-relaxed">
                상품 등록이 완료되면 **15단 섹션 스튜디오**로 자동 이동합니다. 여기서 실제 쇼핑몰 상세페이지 레이아웃과 동일하게 01번부터 15번까지 섹션 카드들이 세로로 정렬됩니다.
              </p>

              {/* 모델 비교 카드 */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <p className="font-bold text-slate-800 mb-2">⚙️ 2가지 AI 이미지 생성 모델 선택 가이드:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <p className="font-bold text-blue-700 mb-0.5">Gemini 2.5 Flash (기본 권장 · 초고속 가성비)</p>
                    <p className="text-slate-500">장당 약 $0.038 (15장 전체 생성 시 약 $0.57). 빠른 속도와 감각적인 비주얼 렌더링에 적합합니다.</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <p className="font-bold text-purple-700 mb-0.5">Gemini 2.5 Pro (최고 화질 · 정밀 텍스트)</p>
                    <p className="text-slate-500">장당 약 $0.075 (15장 전체 생성 시 약 $1.13). 정교한 텍스트 묘사나 복잡한 디테일 표현에 강력합니다.</p>
                  </div>
                </div>
              </div>

              {/* 3가지 조작 방식 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200">
                  <p className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-blue-600" />
                    <span>1. 전체 일괄 자동 생성</span>
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    상단 <span className="font-semibold text-blue-700">[15개 섹션 전체 자동 생성]</span> 버튼을 누르면 1번부터 15번까지 순차적으로 전자동 합성됩니다.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200">
                  <p className="font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                    <RefreshCw size={13} className="text-indigo-600" />
                    <span>2. 개별 섹션 재생성</span>
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    특정 섹션만 마음에 들지 않을 경우 해당 섹션 카드의 <span className="font-semibold text-indigo-700">[🔄 재생성]</span> 버튼을 눌러 그 섹션만 다시 만듭니다.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <UploadCloud size={13} className="text-slate-600" />
                    <span>3. 보유 사진 직접등록</span>
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    이미 고화질 실물 사진을 보유한 섹션은 <span className="font-semibold text-slate-700">[+ 직접등록]</span> 버튼으로 실제 사진을 올려 바로 적용합니다.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                <span><strong>버전 히스토리 바:</strong> 각 섹션 하단에 과거 생성했던 이미지들이 저장되어 있어 언제든 클릭 한 번으로 이전 버전으로 롤백할 수 있습니다.</span>
                <span className="text-blue-600 font-bold shrink-0 ml-2">원클릭 롤백 지원</span>
              </div>
            </div>
          </div>

          {/* STEP 04: 세로 롱 이미지 병합 & 마켓 등록 */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:border-blue-300 transition-all">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 font-mono text-xs font-black">
                04
              </span>
              <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">STEP 04</span>
              <h3 className="text-base font-bold text-slate-900">최종 15단 세로 롱 이미지 병합 및 마켓 등록</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                섹션 생성이 1개 이상 완료되면 화면 하단에 **고정형(Sticky) 병합 다운로드 바**가 활성화됩니다.
              </p>

              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                  <Download size={16} className="text-emerald-600" />
                  <span>[최종 15단 상세페이지 세로 롱 이미지 병합 & 다운로드] 클릭</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  서버에서 Canvas / Sharp 초고속 이미지 프로세싱 엔진이 가동되어, 01번부터 15번까지의 선택된 이미지를 오차 없이 완벽한 단일 세로 롱 이미지(PNG)로 병합하여 즉시 다운로드해 드립니다.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-[11px]">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <p className="font-bold text-slate-800 mb-0.5">네이버 스마트스토어</p>
                  <p className="text-slate-500">스마트에디터 ONE에서 사진 1장으로 업로드하거나 분할 등록 가능</p>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <p className="font-bold text-slate-800 mb-0.5">쿠팡 윙 (WING)</p>
                  <p className="text-slate-500">상품등록 &gt; 상세설명 에디터에 이미지 첨부 한 번으로 100% 규격 호환</p>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <p className="font-bold text-slate-800 mb-0.5">자사몰 / 오픈마켓</p>
                  <p className="text-slate-500">11번가, G마켓, 카페24, 아임웹 등 모든 쇼핑몰 솔루션에 즉시 사용</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* [탭 2] 15대 필수 섹션 상세 가이드 */}
      {activeTab === "sections" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-900">
            <p className="font-bold mb-1 flex items-center gap-1.5">
              <BadgeCheck size={16} className="text-blue-600" />
              <span>네이버 스마트스토어 & 쿠팡 상위 1% 전환율 공식 기반 15개 섹션</span>
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              소비자의 구매 심리 흐름(주의 ➔ 흥미 ➔ 공감 ➔ 신뢰 ➔ 욕구 ➔ 확신 ➔ 결제)에 완벽히 맞추어 설계된 15대 필수 섹션입니다. 각 섹션을 클릭하면 상세 전략을 확인할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SECTIONS_15P_DETAIL.map((sec) => {
              const isExpanded = expandedSection === sec.num;
              return (
                <div
                  key={sec.num}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isExpanded
                      ? "border-blue-400 bg-white shadow-sm ring-1 ring-blue-400/20"
                      : "border-slate-200/90 bg-white hover:border-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedSection(isExpanded ? null : sec.num)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-mono text-xs font-black border border-blue-200/60">
                        #{sec.num}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{sec.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {sec.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{sec.desc}</p>
                      </div>
                    </div>
                    <span className="text-slate-400 text-xs">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-2 text-xs">
                      <div>
                        <p className="font-bold text-blue-900 text-[11px] mb-0.5">🎯 전환율 극대화 전략:</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{sec.strategy}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60">
                        <p className="font-bold text-emerald-800 text-[11px] mb-0.5">✅ 추천 시각 요소 & 체크포인트:</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{sec.check}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* [탭 3] 셀러 성공 꿀팁 & FAQ */}
      {activeTab === "faq" && (
        <div className="space-y-4">
          {/* 성공 꿀팁 카드 */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-3">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-600" />
              <span>상세페이지 AI 제작 시 전환율 200% 올리는 실전 꿀팁</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-amber-200/60">
                <p className="font-bold text-slate-900 mb-1">📸 1. 대표 사진은 스마트폰 정방형(1:1) 누끼컷</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  스튜디오 촬영이 아니더라도 스마트폰으로 흰 벽이나 책상 위에서 피사체를 정중앙에 두고 찍은 사진이면 충분합니다. 누끼 제거 앱(배경 지우기)을 한 번 거친 이미지를 넣으면 AI 합성 품질이 드라마틱하게 높아집니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-amber-200/60">
                <p className="font-bold text-slate-900 mb-1">✍️ 2. 소구점에 실제 고객의 후기 키워드 포함</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  스펙 분석 폼의 &quot;핵심 특징&quot; 칸에 경쟁사 리뷰에서 자주 칭찬받는 단어(예: &apos;가벼움&apos;, &apos;무소음&apos;, &apos;빠른 흡수&apos;)를 넣어보세요. AI가 그 단어를 카피라이팅 헤드라인에 적극 반영합니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-amber-200/60">
                <p className="font-bold text-slate-900 mb-1">🎨 3. 마음에 드는 섹션만 부분 재생성으로 비용 절약</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  15장을 전부 다시 생성할 필요가 없습니다. 01번 인트로 헤더나 07번 비포애프터처럼 감성이 중요한 섹션만 골라 [🔄 재생성]을 누르면 불필요한 API 비용을 90% 이상 절감할 수 있습니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-amber-200/60">
                <p className="font-bold text-slate-900 mb-1">⚖️ 4. 의료기기/건기식 과대광고 심의 준수</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  건강기능식품, 화장품, 의료기기 품목은 AI가 생성한 문구 중 &apos;치료&apos;, &apos;완치&apos;, &apos;100% 보장&apos; 등 과대광고 위반 소지가 있는 단어가 있는지 최종 점검 후 판매 등록을 진행해 주세요.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ 아코디언 */}
          <div className="space-y-2">
            {[
              {
                q: "Q. API 키가 없다고 뜨면서 생성이 안 됩니다. 어떻게 하나요?",
                a: "이 프로그램은 회원 본인의 Google Gemini API 키로 동작합니다. 좌측 메뉴의 [API키등록·플랫폼연동] 메뉴로 이동하신 후, 본인의 Gemini API 키를 등록해 주세요. 키는 Google AI Studio에서 무료로 즉시 발급받으실 수 있습니다.",
              },
              {
                q: "Q. 15개 섹션 중 일부 섹션만 원하는 사진으로 바꿀 수 있나요?",
                a: "네, 가능합니다! 각 섹션 카드 하단의 [+ 직접등록] 버튼을 누르시면, AI 생성 이미지 대신 본인이 직접 촬영하거나 포토샵 등으로 제작한 실물 이미지를 업로드하여 해당 섹션을 즉시 교체할 수 있습니다.",
              },
              {
                q: "Q. 세로 롱 이미지 병합 시 가로 해상도(너비)는 몇 픽셀인가요?",
                a: "이커머스 표준에 최적화된 860px 너비로 합성되어 스마트스토어, 쿠팡 윙, 11번가, 카페24 등에 업로드 시 깨짐이나 리사이징 왜곡 없이 선명하게 표시됩니다.",
              },
              {
                q: "Q. 과거에 생성했던 다른 버전의 이미지를 다시 선택할 수 있나요?",
                a: "네, 각 섹션 카드의 하단 'VERSIONS' 썸네일 바를 보시면 과거에 생성했던 이미지 히스토리가 모두 저장되어 있습니다. 원하는 버전의 썸네일을 클릭하시면 즉시 해당 버전이 활성화(선택)됩니다.",
              },
              {
                q: "Q. AI 이미지 생성 비용은 얼마 정도 발생하나요?",
                a: "본인 Google 계정의 무료 티어(Free Tier) 범위 내에서는 비용이 발생하지 않습니다. 유료 과금 기준으로도 Gemini 2.5 Flash 모델 사용 시 15개 섹션 전체를 생성하는 데 약 $0.57(한화 약 700원 수준)로 디자이너 외주 비용(건당 20~50만 원) 대비 99% 이상 절감됩니다.",
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3"
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-900">{faq.q}</span>
                    <span className="text-slate-400 text-xs shrink-0">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
