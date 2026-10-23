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
import { LAYOUT_PRESETS, type LayoutPreset } from "@/lib/layoutPresets";
import { IMAGE_MODEL_OPTIONS, IMAGE_MODEL_COST_USD } from "@/lib/ai/imageModels";

// v1.19: 규격·단가는 실제 코드 값을 그대로 보여 준다(안내 문구가 실제와 어긋나지 않게).
const PRESET_KEYS = Object.keys(LAYOUT_PRESETS) as LayoutPreset[];


// 탭 정의
type GuideTab = "steps" | "sections" | "faq";

// v1.19: 쿠팡 12단·스마트스토어 9단 섹션별 전략 — 섹션 이름·순서는 DB 시스템 템플릿(20261021_layout_presets_v1_16.sql)과 같다.
type SectionGuide = { num: string; name: string; tag: string; icon: string; desc: string; strategy: string; check: string };

const SECTIONS_COUPANG12_DETAIL: SectionGuide[] = [
  { num: "01", name: "프로모션 배너", tag: "첫 화면", icon: "🏷️", desc: "상품명과 실제 가격 정보로 여는 상단 배너",
    strategy: "할인가를 입력했을 때만 가격을 크게 보여 주고 정상가는 취소선으로 둡니다. 할인가가 비어 있으면 가격·특가·한정 문구 없이 상품명과 핵심 장점을 헤드라인으로 씁니다.",
    check: "실제 진행 중인 혜택만 표기 · 상품 대표컷 크게" },
  { num: "02", name: "메인 후킹(공감)", tag: "공감", icon: "💬", desc: "고객이 겪는 불편을 한 문장으로 짚기",
    strategy: "「이런 적 있으시죠?」처럼 타깃 고객의 실제 불편을 먼저 꺼내 스크롤을 멈추게 합니다.", check: "고민 상황 연출컷 + 짧은 질문형 카피" },
  { num: "03", name: "대표컷 & 핵심 스펙", tag: "한눈 요약", icon: "📋", desc: "크기·용량·소재 등 핵심 수치 3~4개",
    strategy: "쿠팡 고객은 비교 구매가 많아 스펙을 앞쪽에 둡니다. 입력한 스펙만 쓰고 수치를 지어내지 않습니다.", check: "정면 대표컷 + 아이콘형 스펙 3~4칸" },
  { num: "04", name: "특장점 01 (소재·성분)", tag: "신뢰", icon: "🧪", desc: "무엇으로 만들었는지",
    strategy: "소재·성분이 주는 이점을 고객 언어로 풀어 씁니다(예: 「통기성 좋은 메쉬」).", check: "소재 근접컷 + 한 줄 이점" },
  { num: "05", name: "특장점 02 (기능·편의)", tag: "편의", icon: "⚙️", desc: "쓰기 편한 이유",
    strategy: "버튼 하나·세척 쉬움처럼 일상에서 체감되는 편의를 보여 줍니다.", check: "사용 장면 + 기능 표시 화살표" },
  { num: "06", name: "특장점 03 (디자인·디테일)", tag: "디자인", icon: "🎨", desc: "모양·색상·마감",
    strategy: "색상 옵션과 마감 품질을 보여 주어 「싸 보이지 않을까」 하는 걱정을 줄입니다.", check: "색상별 나열컷 · 마감 디테일" },
  { num: "07", name: "라이프스타일 컷", tag: "상상", icon: "🏡", desc: "실제 생활 속 사용 모습",
    strategy: "집·사무실·야외 등 타깃 고객이 쓰는 장소를 보여 주어 구매 후 모습을 떠올리게 합니다.", check: "한국인 모델·생활 공간 연출" },
  { num: "08", name: "비교 우위", tag: "비교", icon: "⚖️", desc: "일반 제품과 무엇이 다른지",
    strategy: "특정 경쟁사 이름 없이 「일반 제품 vs 이 상품」 표로 차이를 보여 줍니다. 확인되지 않은 수치는 쓰지 않습니다.", check: "2열 비교표 · 체크 아이콘" },
  { num: "09", name: "초근접 디테일", tag: "품질", icon: "🔍", desc: "박음질·버튼·표면을 가까이",
    strategy: "확대컷으로 실물 품질을 보여 주어 반품 걱정을 줄입니다.", check: "매크로 근접컷 2~3장" },
  { num: "10", name: "실전 활용 팁", tag: "사용법", icon: "💡", desc: "이렇게 쓰면 더 좋아요",
    strategy: "입력한 사용법을 2~3단계로 나눠 처음 쓰는 고객도 바로 따라 하게 합니다.", check: "번호 붙은 단계 그림" },
  { num: "11", name: "추천 고객 체크리스트", tag: "확신", icon: "✅", desc: "이런 분께 추천합니다",
    strategy: "타깃 고객 3~4유형을 체크리스트로 보여 주어 「나에게 맞다」는 확신을 줍니다.", check: "체크박스 목록 + 인물 아이콘" },
  { num: "12", name: "구성품 · 배송/FAQ 안심", tag: "마무리", icon: "📦", desc: "무엇이 오는지, 자주 묻는 질문",
    strategy: "구성품을 한 장에 펼쳐 보여 주고 배송·교환 질문에 미리 답해 문의를 줄입니다.", check: "구성품 플랫레이 + Q&A 2~3개" },
];

const SECTIONS_SMARTSTORE9_DETAIL: SectionGuide[] = [
  { num: "01", name: "메인 후킹 & 프로모션", tag: "감성 첫인상", icon: "🌿", desc: "감성 헤드카피 한 줄",
    strategy: "분위기 있는 대표컷과 감성 카피로 시작합니다. 할인가를 입력했을 때만 짧은 가격 문구 1줄을 더하고, 비어 있으면 가격·특가 문구를 넣지 않습니다.", check: "여백 많은 대표컷 · 감성 카피 1줄" },
  { num: "02", name: "대표 비주얼 & 브랜드 스토리", tag: "스토리", icon: "📖", desc: "왜 이 상품을 만들었는지",
    strategy: "브랜드의 출발점이나 만든 이유를 짧게 들려주어 스마트스토어 고객이 중시하는 신뢰와 호감을 쌓습니다.", check: "브랜드 무드컷 + 2~3줄 이야기" },
  { num: "03", name: "특장점 01 (핵심 소재·기능)", tag: "핵심", icon: "💎", desc: "가장 중요한 장점 하나",
    strategy: "가장 큰 장점 하나만 깊게 보여 줍니다. 여러 개를 나열하지 않습니다.", check: "근접컷 + 큰 제목 1줄" },
  { num: "04", name: "특장점 02 (편의·디자인)", tag: "편의", icon: "🪄", desc: "쓰기 편하고 예쁜 이유",
    strategy: "일상에서 느끼는 편리함과 디자인을 함께 보여 줍니다.", check: "사용 장면 · 색상 옵션" },
  { num: "05", name: "라이프스타일 감성 연출", tag: "공감", icon: "☕", desc: "이 상품이 있는 하루",
    strategy: "후기를 지어내지 않고, 상품이 놓인 생활 장면으로 「갖고 싶다」는 감정을 만듭니다.", check: "한국인 모델·따뜻한 조명" },
  { num: "06", name: "비교 우위 팩트체크", tag: "근거", icon: "📏", desc: "확인된 사실로 비교",
    strategy: "입력한 스펙·소재처럼 확인된 사실만으로 일반 제품과 비교합니다. 인증·수상·판매량은 근거가 있을 때만 씁니다.", check: "팩트 표 · 출처 있는 수치만" },
  { num: "07", name: "초근접 퀄리티 디테일", tag: "품질", icon: "🔎", desc: "가까이 볼수록 좋은 품질",
    strategy: "질감·마감을 확대해 사진으로만 보는 온라인 구매의 불안을 줄입니다.", check: "매크로 컷 2장" },
  { num: "08", name: "추천 고객 체크리스트", tag: "확신", icon: "🙋", desc: "이런 분께 잘 맞아요",
    strategy: "타깃 고객 유형을 부드러운 말투의 체크리스트로 정리합니다.", check: "체크 목록 3~4개" },
  { num: "09", name: "구성품 · 구매 안내/FAQ", tag: "안심", icon: "🎁", desc: "구성품과 자주 묻는 질문",
    strategy: "구성품·배송·교환 안내를 정리해 구매 직전 망설임을 줄입니다.", check: "구성품 컷 + Q&A" },
];

// 15개 섹션 상세 정보
const SECTIONS_15P_DETAIL: SectionGuide[] = [
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
    desc: "구매 이유를 한 번 더 정리하는 마지막 행동 유도",
    strategy: "핵심 장점을 한 줄로 다시 정리하고 구매 버튼으로 시선을 모읍니다. 무료배송·사은품·할인은 실제로 진행 중일 때만 쓰고(할인가를 비우면 AI가 혜택 문구를 넣지 않습니다), 근거 없는 「한정 수량」으로 재촉하지 않습니다.",
    check: "핵심 장점 요약 + 시선 집중 구매 버튼"
  },
];

const SECTION_GUIDES: Record<LayoutPreset, { intro: string; sections: SectionGuide[] }> = {
  shop15: {
    intro: "소비자의 구매 심리 흐름(주의 ➔ 흥미 ➔ 공감 ➔ 신뢰 ➔ 욕구 ➔ 확신 ➔ 결제)에 맞춘 15개 섹션입니다. 정보가 많은 상품에 맞습니다.",
    sections: SECTIONS_15P_DETAIL,
  },
  coupang12: {
    intro: "비교 구매가 많은 쿠팡 고객에 맞춰 스펙과 특장점을 앞쪽에, 구성품·FAQ를 마지막에 둔 12단입니다.",
    sections: SECTIONS_COUPANG12_DETAIL,
  },
  smartstore9: {
    intro: "브랜드 신뢰와 감성을 중시하는 스마트스토어 고객에 맞춰 스토리와 생활 장면을 앞세운 9단입니다.",
    sections: SECTIONS_SMARTSTORE9_DETAIL,
  },
};

export function CommerceUsageGuide() {
  const [activeTab, setActiveTab] = useState<GuideTab>("steps");
  const [expandedSection, setExpandedSection] = useState<string | null>("01");
  const [guidePreset, setGuidePreset] = useState<LayoutPreset>("shop15");
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
                  AI 상세페이지 자동화 실전 매뉴얼
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-600 text-white shadow-xs">
                  PRO SELLER
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
                대표 상품 사진 1장으로 기획·카피 작성부터 15섹션·쿠팡 12단·스마트스토어 9단 이미지 생성, 세로 롱 이미지·HTML 상세페이지 내보내기까지
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
            <span>🧱 규격·섹션 구성 가이드</span>
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
                    <li><strong>핵심 소스</strong>: 이후 생성되는 모든 섹션 이미지의 합성 기준이 되는 가장 중요한 사진입니다.</li>
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
              <h3 className="text-base font-bold text-slate-900">Gemini Vision AI 상품 정밀 분석 & 12개 항목 검토</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                사진 등록 후 <span className="font-bold text-blue-600">[Gemini AI로 상품 소구점 분석하기]</span> 버튼을 누르면, 최신 Gemini 멀티모달 비전 모델이 사진과 입력 텍스트를 정밀 분석하여 상세페이지 기획에 필요한 <strong>12개 핵심 항목</strong>을 자동 완성합니다.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="font-bold text-slate-800 mb-2">🔍 자동 분석되어 추출되는 12개 항목:</p>
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
                <strong>💡 셀러 검토 팁:</strong> AI가 채워준 12개 항목은 모두 자유롭게 수정할 수 있습니다. 특히 판매할 <strong>정상가와 할인가(이벤트가)</strong>를 입력하고, 강조하고 싶은 특장점이 있다면 소구점 입력칸에 단어를 추가해 주세요.
              </div>
            </div>
          </div>

          {/* STEP 03: 섹션 스튜디오 및 모델별 생성 */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:border-blue-300 transition-all">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-50 text-pink-600 border border-pink-200 font-mono text-xs font-black">
                03
              </span>
              <span className="text-xs font-black text-pink-600 uppercase tracking-wider">STEP 03</span>
              <h3 className="text-base font-bold text-slate-900">섹션 스튜디오 — 생성, 재생성, 직접등록</h3>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <p className="leading-relaxed">
                상품 등록이 완료되면 <strong>섹션 스튜디오</strong>로 자동 이동합니다. 상품을 등록할 때 고른 규격대로 섹션 카드가 01번부터 차례로 세로 정렬됩니다.
              </p>

              {/* 모델 비교 카드 */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <p className="font-bold text-slate-800 mb-2">⚙️ 2가지 AI 이미지 생성 모델 선택 가이드:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  {IMAGE_MODEL_OPTIONS.map((opt) => (
                    <div key={opt.value} className="bg-white p-3 rounded-lg border border-slate-200">
                      <p className="font-bold text-blue-700 mb-0.5">{opt.label}</p>
                      <p className="text-slate-500">
                        {`장당 약 $${IMAGE_MODEL_COST_USD[opt.value].toFixed(3)} · 15섹션 약 $${(IMAGE_MODEL_COST_USD[opt.value] * 15).toFixed(2)} · 12단 약 $${(IMAGE_MODEL_COST_USD[opt.value] * 12).toFixed(2)} · 9단 약 $${(IMAGE_MODEL_COST_USD[opt.value] * 9).toFixed(2)}`}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">Google 요금표(2K 이미지 1장) 기준 추정치이며 회원 본인 Gemini 키로 청구됩니다. 요금은 바뀔 수 있습니다.</p>
              </div>

              {/* 3가지 조작 방식 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200">
                  <p className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-blue-600" />
                    <span>1. 전체 일괄 자동 생성</span>
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    상단 <span className="font-semibold text-blue-700">[○개 섹션 전체 자동 생성]</span> 버튼을 누르면 규격의 모든 섹션을 01번부터 차례로 만듭니다.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200">
                  <p className="font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                    <RefreshCw size={13} className="text-indigo-600" />
                    <span>2. 한 섹션만 생성·재생성</span>
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    아직 안 만든 섹션은 카드의 <span className="font-semibold text-indigo-700">[✨ 생성]</span>, 마음에 들지 않는 섹션은 <span className="font-semibold text-indigo-700">[🔄 재생성]</span>으로 그 섹션 1장만 만듭니다. 버튼에 1장 예상 비용이 표시됩니다.
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
              <h3 className="text-base font-bold text-slate-900">세로 롱 이미지·HTML 내보내기 및 마켓 등록</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                섹션 이미지가 1장 이상 준비되면 두 가지 방법으로 내보낼 수 있습니다. 내보내기 전에 <strong>📱 모바일 미리보기</strong>로 휴대폰 화면에서 어떻게 보이는지 먼저 확인해 보세요.
              </p>

              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                  <Download size={16} className="text-emerald-600" />
                  <span>① 세로 롱 이미지(860px PNG) 병합 & 다운로드</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  화면 하단 고정 버튼을 누르면 각 섹션에서 선택한 이미지를 860px 너비로 맞춰 한 장의 세로 롱 이미지(PNG)로 합쳐 내려받습니다. AI 호출이 없어 비용이 들지 않습니다.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                  <span>🧾</span>
                  <span>② HTML 상세페이지로 내보내기</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  쿠팡·스마트스토어·프리미엄 스타일 중 하나를 고르면 섹션 이미지와 상품 정보로 글자를 고칠 수 있는 HTML 상세페이지를 씁니다.
                  이미지는 860px로 줄여 파일 안에 넣으므로 HTML 파일 하나만 내려받으면 됩니다. Gemini 글 생성 1회(회원 본인 키, 10원 안팎)가 들고 1~2분 걸립니다. 결과는 저장되지 않으니 만든 뒤 바로 내려받아 주세요.
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

      {/* [탭 2] 규격·섹션 구성 가이드 */}
      {activeTab === "sections" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRESET_KEYS.map((key) => {
              const active = guidePreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setGuidePreset(key);
                    setExpandedSection("01");
                  }}
                  aria-pressed={active}
                  className={`p-4 rounded-2xl text-left border shadow-2xs transition-all ${
                    active ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400/30" : "bg-white border-slate-200/90 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-black text-slate-900">{LAYOUT_PRESETS[key].label}</p>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {LAYOUT_PRESETS[key].sections}장
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{LAYOUT_PRESETS[key].description}</p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 px-1">
            규격은 새 상품을 등록할 때 고릅니다. 위 카드를 누르면 그 규격의 섹션별 전략을 아래에서 볼 수 있습니다.
          </p>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-900">
            <p className="font-bold mb-1 flex items-center gap-1.5">
              <BadgeCheck size={16} className="text-blue-600" />
              <span>{LAYOUT_PRESETS[guidePreset].label} — 섹션별 전략</span>
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {SECTION_GUIDES[guidePreset].intro} 각 섹션을 누르면 상세 전략을 확인할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SECTION_GUIDES[guidePreset].sections.map((sec) => {
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
                  전체를 다시 생성할 필요가 없습니다. 01번 인트로 헤더처럼 감성이 중요한 섹션만 골라 [🔄 재생성]을 누르면 불필요한 API 비용을 90% 이상 절감할 수 있습니다.
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
                q: "Q. 일부 섹션만 원하는 사진으로 바꿀 수 있나요?",
                a: "네, 가능합니다! 각 섹션 카드 하단의 [+ 직접등록] 버튼을 누르시면, AI 생성 이미지 대신 본인이 직접 촬영하거나 포토샵 등으로 제작한 실물 이미지를 업로드하여 해당 섹션을 즉시 교체할 수 있습니다.",
              },
              {
                q: "Q. 세로 롱 이미지 병합 시 가로 해상도(너비)는 몇 픽셀인가요?",
                a: "이커머스 표준에 최적화된 860px 너비로 합성되어 스마트스토어, 쿠팡 윙, 11번가, 카페24 등에 업로드 시 깨짐이나 리사이징 왜곡 없이 선명하게 표시됩니다.",
              },
              {
                q: "Q. 15섹션·쿠팡 12단·스마트스토어 9단은 어떻게 고르나요?",
                a: "새 상품을 등록할 때 규격을 고릅니다. 정보가 많은 상품은 15섹션, 쿠팡 로켓배송처럼 가격·스펙 비교가 중요한 상품은 쿠팡 12단, 감성·후기 중심의 스마트스토어 상품은 9단이 맞습니다. 할인가를 비워 두면 AI가 특가·한정 같은 혜택 문구를 지어내지 않습니다.",
              },
              {
                q: "Q. 세로 롱 이미지와 HTML 내보내기는 무엇이 다른가요?",
                a: "세로 롱 이미지는 섹션 이미지를 한 장으로 합친 PNG라 어느 쇼핑몰에나 바로 올릴 수 있고 비용이 없습니다. HTML은 글자를 나중에 고칠 수 있고 검색에 글자가 노출되는 장점이 있으며, Gemini 글 생성 1회 비용이 듭니다.",
              },
              {
                q: "Q. 이미지 속 글자(가격·행사 문구)만 고칠 수 있나요?",
                a: "네, 완료된 섹션 카드의 [✏️ 문구] 버튼을 누르면 AI 비용 없이 브라우저에서 고칠 수 있습니다. 고칠 글자 위를 끌어 사각형으로 지정하고 새 문구·크기·색을 정한 뒤 [이 부분 적용] → [💾 새 버전으로 저장]을 누르세요. 원래 이미지는 버전 목록에 그대로 남습니다. 지정한 부분은 사각형 바깥에서 가장 많은 색으로 덮이는데, 배지처럼 글자 뒤에 색 도형이 있으면 [💧 찍기]로 도형 안쪽 색을 찍거나 [안쪽 색]을 누르면 도형을 살린 채 글자만 바꿀 수 있습니다. 둥근 배지 모양까지 살리려면 사각형을 배지보다 넓게 잡지 말고 배지 안쪽 글자 부분만 지정하세요(넓게 잡으면 모서리가 각지게 덮입니다). 배경이 복잡한 사진 위 글자는 덮은 자리가 티 날 수 있어 [🔄 재생성]이 더 나을 수 있습니다.",
              },
              {
                q: "Q. 움직이는 GIF도 섹션에 넣을 수 있나요?",
                a: "네. 상세페이지 GIF 자동화에서 변환을 마친 뒤 [🛍 상세페이지로]를 누르면 「GIF 받기」 창이 열리고, 상품과 섹션을 골라 바로 넣을 수 있습니다(내려받았다 다시 올릴 필요 없음). 섹션의 [+ 직접등록]으로 GIF 파일(10MB 이하)을 올려도 됩니다. 움직이는 GIF는 [섹션별 ZIP]에 원본 그대로 들어가고, 세로 롱 이미지·HTML에는 첫 장면으로 들어갑니다. GIF 섹션에는 [✏️ 문구] 버튼이 나오지 않습니다(다시 그리면 움직임이 사라짐).",
              },
              {
                q: "Q. 과거에 생성했던 다른 버전의 이미지를 다시 선택할 수 있나요?",
                a: "네, 각 섹션 카드의 하단 'VERSIONS' 썸네일 바를 보시면 과거에 생성했던 이미지 히스토리가 모두 저장되어 있습니다. 원하는 버전의 썸네일을 클릭하시면 즉시 해당 버전이 활성화(선택)됩니다.",
              },
              {
                q: "Q. AI 이미지 생성 비용은 얼마 정도 발생하나요?",
                a: `회원 본인 Gemini 키로 청구됩니다. Google 요금표(2K 1장) 기준 Nanobanana2는 장당 약 $${IMAGE_MODEL_COST_USD.nanobanana2.toFixed(3)}, Pro는 약 $${IMAGE_MODEL_COST_USD.nanobananaPro.toFixed(3)}입니다. Nanobanana2로 쿠팡 12단 전체를 만들면 약 $${(IMAGE_MODEL_COST_USD.nanobanana2 * 12).toFixed(2)}입니다. 무료 사용량은 계정·모델마다 다르니 Google AI Studio에서 확인해 주세요. 섹션별 [✨ 생성]·[🔄 재생성]으로 필요한 장만 만들면 비용을 줄일 수 있습니다.`,
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
