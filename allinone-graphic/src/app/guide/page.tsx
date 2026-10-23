"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Key,
  Layers,
  Wand2,
  Sliders,
  Image as ImageIcon,
  Brush,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Palette,
  Lightbulb,
  HelpCircle,
  Briefcase,
  Code,
  Gamepad2,
  Video,
  ShoppingBag,
  GraduationCap,
  Calendar,
} from "lucide-react";

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeGroupTab, setActiveGroupTab] = useState<string>("IT 및 기술");

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      num: "01",
      title: "직군 & 템플릿 탐색",
      desc: "좌측 사이드바 5대 그룹·19개 전문 직군에서 내 프로젝트에 딱 맞는 그래픽 템플릿을 선택합니다.",
      tags: ["123종 프리셋", "직군별 최적화"],
      icon: Layers,
      color: "from-amber-500 to-yellow-500",
      bgLight: "bg-amber-50 border-amber-200/70 text-amber-700",
    },
    {
      num: "02",
      title: "AI 자동 입력 도우미",
      desc: "어떤 문구를 넣을지 고민될 땐 'AI 자동 완성' 버튼을 눌러 프로젝트명만으로 완벽한 프롬프트를 기획합니다.",
      tags: ["원클릭 기획", "전문 프롬프트 생성"],
      icon: Wand2,
      color: "from-amber-600 to-orange-500",
      bgLight: "bg-orange-50 border-orange-200/70 text-orange-700",
    },
    {
      num: "03",
      title: "스타일 & 화각 정밀 조정",
      desc: "화각(와이드/클로즈업), 렌더링 스타일(3D, 플랫, 실사, 사이버펑크), 종횡비(1:1, 16:9, 9:16)를 정밀 지정합니다.",
      tags: ["스타일 믹스", "다각도 카메라"],
      icon: Sliders,
      color: "from-yellow-500 to-amber-600",
      bgLight: "bg-yellow-50 border-yellow-200/70 text-yellow-700",
    },
    {
      num: "04",
      title: "초고화질 AI 그래픽 렌더링",
      desc: "본인의 Gemini Imagen 엔진을 통해 수 초 만에 디테일이 살아있는 고해상도 상업용 그래픽을 즉각 렌더링합니다.",
      tags: ["초고속 렌더", "상업용 퀄리티"],
      icon: ImageIcon,
      color: "from-amber-500 to-amber-700",
      bgLight: "bg-amber-50 border-amber-200/70 text-amber-800",
    },
    {
      num: "05",
      title: "스마트 매직 에디터 (Inpainting)",
      desc: "결과물에서 마음에 들지 않는 부분이나 교체할 오브젝트만 브러시로 칠해 감쪽같이 부분 재수정합니다.",
      tags: ["브러시 마스킹", "무손실 부분수정"],
      icon: Brush,
      color: "from-amber-600 to-yellow-600",
      bgLight: "bg-amber-50 border-amber-200/70 text-amber-700",
    },
  ];

  const presetGroups = [
    {
      title: "IT 및 기술",
      desc: "개발자, 디자이너, 데이터 분석가, 시스템 엔지니어를 위한 미래지향적 UI/UX & 기술 비주얼",
      icon: Code,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      subItems: [
        { name: "풀스택 개발자", count: 8, examples: "서버 아키텍처 다이어그램, 코드 리뷰 배너, 터미널 대시보드" },
        { name: "AI/ML 연구원", count: 7, examples: "뉴럴 네트워크 시각화, 딥러닝 파이프라인, AI 모델 비교 인포" },
        { name: "UI/UX 디자이너", count: 8, examples: "모바일 앱 목업, 와이어프레임 컴포넌트, 인터랙션 쇼케이스" },
        { name: "클라우드 DevOps", count: 6, examples: "쿠버네티스 클러스터 맵, CI/CD 배포 모니터, 인프라 배너" },
      ],
    },
    {
      title: "창작 및 예술",
      desc: "게임 기획자, 영상 크리에이터, 웹툰/일러스트레이터, 사운드 디자이너를 위한 고감도 아트워크",
      icon: Gamepad2,
      color: "text-purple-600 bg-purple-50 border-purple-200",
      subItems: [
        { name: "게임 컨셉 아티스트", count: 9, examples: "판타지 랜드스케이프, SF 무기 디자인, 던전 보스 캐릭터" },
        { name: "유튜브 크리에이터", count: 8, examples: "시선강탈 썸네일, 타이틀 인트로 백그라운드, 구독 유도 카드" },
        { name: "웹툰/스토리보더", count: 7, examples: "웹툰 컷 구성, 감정별 캐릭터 시트, 드라마틱 시네마틱 컷" },
        { name: "애니메이션 디렉터", count: 6, examples: "2D/3D 하이브리드 배경, 키프레임 포스터, 감성 일러스트" },
      ],
    },
    {
      title: "비즈니스 및 마케팅",
      desc: "스타트업 CEO, 마케터, 투자심사역, 컨설턴트를 위한 설득력 있는 비즈니스 프레젠테이션 그래픽",
      icon: Briefcase,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      subItems: [
        { name: "퍼포먼스 마케터", count: 8, examples: "전환율 극대화 SNS 광고 배너, 프로모션 팝업, 세일 카피 그래픽" },
        { name: "스타트업 창업가", count: 7, examples: "IR 피치덱 표지, 비전 슬로건 포스터, 로드맵 타임라인" },
        { name: "브랜드 전략가", count: 6, examples: "브랜드 무드보드, 컬러 팔레트 가이드, CI/BI 아이덴티티 씬" },
        { name: "경영 컨설턴트", count: 6, examples: "전략 매트릭스 도표, 시장 점유율 분석 차트, 조직 혁신 도식" },
      ],
    },
    {
      title: "커머스 및 자영업",
      desc: "스마트스토어, F&B 요식업, 패션/뷰티, 인테리어 매장 운영자를 위한 실전 매출 견인 그래픽",
      icon: ShoppingBag,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      subItems: [
        { name: "스마트스토어 셀러", count: 8, examples: "상품 상세페이지 대표 컷, 옵션 안내 블록, 고객 리뷰 강조 배너" },
        { name: "카페 & 레스토랑", count: 7, examples: "시그니처 메뉴판, 감성 테이블 매트, 시즌 한정 메뉴 포스터" },
        { name: "패션/뷰티 셀렉터", count: 7, examples: "OOTD 룩북 커버, 성분 비교 뷰티 차트, 시즌 세일 룩북" },
        { name: "공간/인테리어", count: 6, examples: "쇼룸 인테리어 투시도, 가구 배치 가이드, 패브릭 텍스처 보드" },
      ],
    },
    {
      title: "전문 서비스 및 라이프",
      desc: "교육자, 헬스/피트니스, 공인중개사, 이벤트 플래너를 위한 신뢰도 높은 전문 라이프스타일 그래픽",
      icon: GraduationCap,
      color: "text-rose-600 bg-rose-50 border-rose-200",
      subItems: [
        { name: "에듀케이터/강사", count: 8, examples: "온라인 클래스 썸네일, 강의 목차 인포그래픽, 수료증 프레임" },
        { name: "피트니스 코치", count: 7, examples: "체계적 운동 루틴 표, 식단 플래너 그래픽, 바디프로필 무드" },
        { name: "부동산/공인중개사", count: 6, examples: "프리미엄 매물 브로슈어, 입지 분석 인포맵, 단지 조감도 배너" },
        { name: "웨딩/이벤트 플래너", count: 6, examples: "모바일 청첩장 메인, 행사 순서도 카드, 파티 VIP 초청장" },
      ],
    },
  ];

  const faqs = [
    {
      q: "Q1. 올인원 그래픽 자동화 생성 시 별도 비용이 발생하나요?",
      a: "아닙니다. 구글 AI 스튜디오(Google AI Studio)에서 발급받은 본인의 Gemini API 키를 연동하여 사용하며, 구글이 제공하는 무료 할당량(Free Tier) 범위 내에서 일체의 비용 없이 자유롭게 그래픽을 생성하실 수 있습니다. AIMaster는 중간 수수료나 이미지 생성 건당 과금을 전혀 부과하지 않습니다.",
    },
    {
      q: "Q2. 생성된 그래픽 이미지는 상업적으로 자유롭게 쓸 수 있나요?",
      a: "네, 맞습니다! 본인이 발급받은 Gemini Imagen 모델 라이선스 규정에 따라 생성된 모든 그래픽은 상업적 광고 배너, 상세페이지, 유튜브 썸네일, SNS 마케팅, 인쇄물 브로슈어 등 원하는 모든 비즈니스 영역에서 저작권 걱정 없이 자유롭게 사용하실 수 있습니다.",
    },
    {
      q: "Q3. 생성된 이미지 중 일부 텍스트나 사물만 수정하고 싶을 때는 어떻게 하나요?",
      a: "결과물 화면 우측 상단의 '스마트 매직 에디터(인페인팅)' 기능을 사용하시면 됩니다. 수정하고 싶은 영역을 브러시로 마스킹(Masking)한 후, 변경하고 싶은 내용(예: '노트북을 최신 태블릿으로 변경')을 텍스트로 적어주시면 전체 구도와 조명은 그대로 유지한 채 해당 영역만 마법처럼 교체됩니다.",
    },
    {
      q: "Q4. 스마트폰이나 태블릿 등 모바일 환경에서도 사용이 가능한가요?",
      a: "네, 완벽하게 지원됩니다. AI 올인원 그래픽 자동화 스튜디오는 최신 반응형 디자인(Responsive Web)으로 설계되어, 스마트폰 화면(375px~390px)에서도 좌측 슬라이딩 메뉴와 직관적인 카드 컨트롤러를 통해 언제 어디서나 고화질 그래픽을 기획하고 생성하실 수 있습니다.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-white">
      {/* 1. 상단 글로벌 네비게이션 헤더 */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors group font-medium px-2.5 py-1.5 rounded-md hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>그래픽 스튜디오 복귀</span>
            </Link>
            <span className="text-slate-700">|</span>
            <a
              href="https://www.buylife.xyz"
              className="text-xs text-slate-400 hover:text-amber-400 transition-colors hidden sm:inline"
            >
              AIMaster 메인
            </a>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              크리에이티브 아틀리에 가이드
            </span>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 transition-all shadow-md shadow-amber-500/20"
            >
              지금 만들기
            </Link>
          </div>
        </div>
      </header>

      {/* 2. 메인 히어로 섹션 */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-72 bg-gradient-to-tr from-amber-500/10 via-yellow-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-5 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>19개 직군 123종 전문 그래픽 템플릿 & 매직 에디터 가이드북</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            아이디어가 즉시 상업용 비주얼로! <br />
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              AI 올인원 그래픽 자동화 마스터 가이드
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            프롬프트 작성의 막막함 없이 직군만 고르면 끝! <br className="hidden sm:inline" />
            원클릭 AI 기획, 스타일·화각 미세조정, Gemini 고해상도 렌더링, 인페인팅 부분수정까지
            초보자도 5분 만에 전문가급 그래픽을 완성할 수 있습니다.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>본인 Gemini 키 무제한 연동</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>123종 프리셋 즉시 사용</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>상업용 무료 라이선스</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 본문 컨텐츠 영역 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16 flex-1">
        {/* 파트 1: 5단계 그래픽 제작 파이프라인 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> 5-Step Pipeline
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                완벽한 그래픽을 완성하는 5단계 제작 파이프라인
              </h2>
            </div>
            <span className="text-xs text-slate-400">초보자 맞춤 직관적 프로세스</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {steps.map((st, idx) => {
              const IconComp = st.icon;
              return (
                <div
                  key={st.num}
                  className="relative p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-amber-500/50 transition-all group flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        STEP {st.num}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                        <IconComp className="w-4 h-4" />
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors mb-1.5">
                      {st.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {st.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-wrap gap-1">
                    {st.tags.map((tg) => (
                      <span
                        key={tg}
                        className="text-[10px] font-medium text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded"
                      >
                        #{tg}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 파트 2: 본인 Gemini API 키 발급 & 연동 안내 */}
        <section className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-850/90 border border-amber-500/30 relative overflow-hidden shadow-xl">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                <Key className="w-3.5 h-3.5" />
                <span>최상위 절대 규칙 준수 — 본인 API 키 직접 연동</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                Google AI Studio 무료 API 키 1분 발급 & 안전 연동
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                AIMaster는 운영자 키를 대신 쓰거나 타인 키를 공유하지 않습니다. 구글에서 무료로 발급되는
                본인 전용 Gemini API 키를 등록하면, 누구의 간섭도 없이 일일 무료 할당량 내에서 안전하게 고화질 그래픽을
                생성할 수 있습니다.
              </p>
            </div>

            <div className="flex-shrink-0 flex flex-col gap-2.5">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20"
              >
                <span>Google AI Studio 키 발급</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/70 transition-colors"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>스튜디오에서 키 입력하기</span>
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 font-bold text-[11px] mt-0.5">
                1
              </div>
              <div className="text-slate-300">
                <span className="font-semibold text-white block mb-0.5">Google 로그인</span>
                구글 AI 스튜디오 접속 후 본인 구글 계정으로 로그인합니다.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 font-bold text-[11px] mt-0.5">
                2
              </div>
              <div className="text-slate-300">
                <span className="font-semibold text-white block mb-0.5">API 키 생성 (Get API key)</span>
                'Create API key' 버튼을 클릭해 무료 프로젝트 키를 복사합니다.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 font-bold text-[11px] mt-0.5">
                3
              </div>
              <div className="text-slate-300">
                <span className="font-semibold text-white block mb-0.5">스튜디오 연동 & 로컬 보관</span>
                좌측 사이드바 하단 '🔑 API키등록'에 붙여넣으면 즉시 활성화됩니다.
              </div>
            </div>
          </div>
        </section>

        {/* 파트 3: 19개 직군 123종 프리셋 맵 치트시트 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-4 h-4" /> 123 Presets Catalog
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                19개 전문 직군별 그래픽 프리셋 맵 치트시트
              </h2>
            </div>
            <span className="text-xs text-slate-400">업무별 최적화된 프롬프트 자동 탑재</span>
          </div>

          {/* 5대 그룹 탭 버튼 */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-800/80 rounded-xl border border-slate-700/70">
            {presetGroups.map((grp) => (
              <button
                key={grp.title}
                onClick={() => setActiveGroupTab(grp.title)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeGroupTab === grp.title
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <span>{grp.title}</span>
              </button>
            ))}
          </div>

          {/* 활성화된 탭의 상세 내용 */}
          {presetGroups
            .filter((g) => g.title === activeGroupTab)
            .map((grp) => {
              const GrpIcon = grp.icon;
              return (
                <div
                  key={grp.title}
                  className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <GrpIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{grp.title} 분야 프리셋 목록</h3>
                      <p className="text-xs text-slate-400">{grp.desc}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {grp.subItems.map((sub) => (
                      <div
                        key={sub.name}
                        className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-amber-400">{sub.name}</span>
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {sub.count}종 템플릿
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          <strong className="text-slate-300">대표 제작물:</strong> {sub.examples}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </section>

        {/* 파트 4: 스마트 매직 에디터 (인페인팅) 실전 노하우 */}
        <section className="p-6 sm:p-8 rounded-2xl bg-slate-800/40 border border-slate-700/80 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Brush className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Magic Inpainting Masterclass
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                마음에 들지 않는 부분만 1초 만에 감쪽같이! 스마트 매직 에디터 팁
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                1. 브러시 크기 미세 조절
              </div>
              <p className="text-slate-400 leading-relaxed">
                바꾸고 싶은 사물이나 텍스트 영역보다 살짝 여유 있게(약 10~15%) 마스킹 칠을 해주면 경계면이 어색하지 않고 자연스럽게 블렌딩됩니다.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                2. 명확한 변경 키워드 제시
              </div>
              <p className="text-slate-400 leading-relaxed">
                "노트북을 최신 메탈릭 실버 태블릿으로 교체", "배경의 머그컵을 테이크아웃 커피잔으로 변경"처럼 대상과 색상, 재질을 구체적으로 적습니다.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                3. 히스토리 무제한 되돌리기
              </div>
              <p className="text-slate-400 leading-relaxed">
                인페인팅 결과가 마음에 들지 않으면 언제든 원본 또는 직전 생성본으로 즉시 롤백할 수 있으니 부담 없이 실험해보세요.
              </p>
            </div>
          </div>
        </section>

        {/* 파트 5: 자주 묻는 질문 (FAQ) 아코디언 */}
        <section className="space-y-6">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> FAQ
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              자주 묻는 질문 (FAQ)
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-xl border border-slate-700/80 bg-slate-800/40 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-800/70 transition-colors"
                  >
                    <span className="text-sm sm:text-base font-bold text-white">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-amber-400 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-700/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 파트 6: 즉시 시작 CTA 배너 */}
        <section className="text-center py-10 px-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/30 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 mx-auto shadow-lg shadow-amber-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            지금 바로 당신만의 상업용 그래픽을 완성해보세요!
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            123종 프리셋과 나노바나나 고화질 생성 엔진이 당신의 크리에이티브 작업을 빛의 속도로 가속합니다.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 transition-all shadow-xl shadow-amber-500/25"
            >
              <Sparkles className="w-4 h-4" />
              <span>그래픽 스튜디오 바로가기</span>
            </Link>
          </div>
        </section>
      </main>

      {/* 4. 푸터 */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <p className="flex items-center justify-center gap-2">
          <span>AI 올인원 그래픽 자동화 스튜디오</span>
          <span>•</span>
          <span>크리에이티브 아틀리에 템플릿</span>
          <span>•</span>
          <a
            href="https://www.buylife.xyz"
            className="text-amber-500 hover:underline"
          >
            AIMaster 공식 플랫폼
          </a>
        </p>
      </footer>
    </div>
  );
}
