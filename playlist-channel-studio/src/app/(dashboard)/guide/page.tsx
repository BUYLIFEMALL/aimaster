"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ListMusic,
  Headphones,
  Sparkles,
  ArrowLeft,
  KeyRound,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  Zap,
  HelpCircle,
  Radio,
  Sliders,
  Flame,
  Music2,
  Copy,
  Layers,
  Compass,
} from "lucide-react";

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeGenreCategory, setActiveGenreCategory] = useState<string>("힐링 & 카페");

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      num: "01",
      title: "감성 장르 셀렉션",
      desc: "Lo-Fi, 시티팝, 재즈, 어쿠스틱 등 23종 프리셋 또는 원하는 음악 스타일을 자유롭게 선택합니다.",
      tags: ["23종 장르", "취향 맞춤"],
      icon: Radio,
    },
    {
      num: "02",
      title: "AI 감성 타이틀 10종 기획",
      desc: "유튜브 알고리즘 클릭률을 극대화하는 'playlist 이모지 한국어 문장 | 영어키워드' 형식의 제목 10종을 제안받습니다.",
      tags: ["클릭률 극대화", "알고리즘 최적화"],
      icon: Sparkles,
    },
    {
      num: "03",
      title: "Suno 5.0 작곡 프롬프트 생성",
      desc: "선택한 분위기에 최적화된 Suno 5.0 음악 생성 프롬프트 3변형(900자 최적화)을 원클릭 복사합니다.",
      tags: ["Suno AI", "900자 최적화"],
      icon: Music2,
    },
    {
      num: "04",
      title: "5개국어 맞춤 가사 & 메타데이터",
      desc: "곡 구조, 감성 비유 강도, 이중 언어 비율을 조정한 완성형 가사와 유튜브 설명글·해시태그를 일괄 생성합니다.",
      tags: ["5개국어 가사", "SEO 메타데이터"],
      icon: FileText,
    },
    {
      num: "05",
      title: "캔버스 무손실 한글 썸네일 합성",
      desc: "글자 없는 고화질 AI 배경 렌더링 후, 14종 감성 폰트와 브라우저 캔버스로 깨짐 없는 한글 썸네일을 완성합니다.",
      tags: ["14종 감성폰트", "무손실 Canvas"],
      icon: ImageIcon,
    },
    // 2026-10-20 병합 E: Youtube Playlist 자동화의 영상 만들기
    {
      num: "06",
      title: "영상 만들기 — 스펙트럼·배경 → 1080p MP4",
      desc: "Suno에서 만든 곡 파일을 「영상 만들기」에 넣고, 음악에 반응하는 스펙트럼 10종·파티클·필터·오버레이와 AI 배경을 얹어 브라우저에서 바로 1080p MP4로 내보냅니다. 곡별 챕터 타임스탬프도 복사할 수 있어요.",
      tags: ["브라우저 렌더", "챕터 타임스탬프"],
      icon: Layers,
    },
  ];

  const genreCategories = [
    {
      title: "힐링 & 카페",
      desc: "공부할 때, 작업할 때, 비 오는 날 편안하게 듣기 좋은 이지리스닝 플레이리스트",
      genres: [
        { name: "비 오는 날 Lo-Fi", mood: "잔잔한 빗소리와 따뜻한 로파이 비트, 새벽 감성", bpm: "70~85 BPM" },
        { name: "감성 카페 재즈", mood: "부드러운 피아노와 콘트라베이스, 에스프레소 향기", bpm: "80~100 BPM" },
        { name: "어쿠스틱 인디", mood: "통기타 아르페지오와 감미로운 보컬, 노을빛 분위기", bpm: "75~90 BPM" },
        { name: "따스한 침실 팝", mood: "몽환적인 신스 패드와 포근한 베이스라인", bpm: "65~80 BPM" },
      ],
    },
    {
      title: "비트 & 에너지",
      desc: "드라이브, 운동, 게임, 야간 작업 시 텐션을 올려주는 그루브 플레이리스트",
      genres: [
        { name: "레트로 시티팝", mood: "80년대 도쿄의 네온사인, 펑키한 베이스와 청량한 브라스", bpm: "110~125 BPM" },
        { name: "나이트 드라이브 R&B", mood: "트렌디한 808 베이스와 매혹적인 보컬 찹", bpm: "85~95 BPM" },
        { name: "신스웨이브 사이버펑크", mood: "아날로그 신디사이저, 밤거리 네온 스트리트 질주", bpm: "105~120 BPM" },
        { name: "칠아웃 딥하우스", mood: "세련된 킥 사운드와 라운지 클럽 바이브", bpm: "120~126 BPM" },
      ],
    },
    {
      title: "시네마틱 & 무드",
      desc: "명상, 독서, 영화 같은 깊은 사색에 빠져들게 하는 시네마틱 사운드",
      genres: [
        { name: "새벽녘 앰비언트", mood: "우주를 유영하는 듯한 드론 사운드, 무중력 휴식", bpm: "Slow / Free" },
        { name: "시네마틱 오케스트라", mood: "스트링 콰르텟과 감성 피아노, 서사적인 감동", bpm: "Dynamic" },
        { name: "빈티지 바이닐 재즈", mood: "LP 판 튀는 지직거림, 50년대 뉴욕 바의 향수", bpm: "75~90 BPM" },
        { name: "동양풍 감성 오리엔탈", mood: "국악 악기와 현대적 비트의 조화, 고즈넉한 여운", bpm: "80~95 BPM" },
      ],
    },
  ];

  const faqs = [
    {
      q: "Q1. 「영상 만들기」는 어떻게 쓰나요?",
      a: "왼쪽 메뉴 ② 영상 만들기에서 ① 음악·배경 넣기(곡 파일 끌어다 놓기, 배경 이미지·영상 올리기 또는 AI 배경 생성) → ② 편집·미리보기(스펙트럼·파티클·필터 고르기) → ③ MP4 내보내기 순서로 진행합니다. 영상은 서버가 아니라 회원님 브라우저(크롬·엣지 권장)에서 만들어지므로, 내보내는 동안 탭을 닫지 마세요. AI 배경 생성만 회원님 본인 Gemini 키를 씁니다.",
    },
    {
      q: "Q2. 예전 「Youtube Playlist 자동화」를 쓰던 사람은 어떻게 하나요?",
      a: "2026-10-20부터 이 프로그램의 「영상 만들기」로 합쳐졌습니다. 같은 기능을 그대로 쓸 수 있고, Gemini 키도 다시 등록할 필요가 없습니다. 예전 주소로 들어와도 이 화면으로 이동합니다.",
    },
    {
      q: "Q3. 플레이리스트 제작 시 AI API 호출 비용은 어떻게 되나요?",
      a: "YOUTUBE 플레이리스트 자동화는 회원님 본인이 등록한 AI 키(Google Gemini, OpenAI, Anthropic Claude)를 직접 호출하므로 별도의 중간 과금이 없습니다. 특히 Google Gemini의 경우 구글 AI 스튜디오에서 제공하는 무료 할당량(Free Tier) 범위 내에서 비용 없이 음악 기획, 가사, 메타데이터, 썸네일을 생성하실 수 있습니다.",
    },
    {
      q: "Q4. Suno AI에 프롬프트를 넣을 때 900자 제한이 왜 중요한가요?",
      a: "Suno AI의 스타일 프롬프트 입력창은 글자 수 한도가 존재하며, 너무 긴 프롬프트는 뒷부분이 잘려 의도한 악기 구성이나 장르 특성이 반영되지 않습니다. 본 스튜디오의 엔진은 Suno 5.0에 완벽히 최적화하여 장르, BPM, 악기, 보컬 톤, 감정 키워드를 900자 미만으로 정밀 압축 생성합니다.",
    },
    {
      q: "Q5. 썸네일에서 한글 텍스트가 깨지지 않는 비결은 무엇인가요?",
      a: "AI 이미지 생성 모델에게 텍스트를 직접 그리게 하면 한글 자음과 모음이 뭉개지거나 깨지는 현상이 발생합니다. 본 스튜디오는 글자가 없는 고화질 시네마틱 배경 이미지만을 AI로 렌더링한 후, 브라우저 Canvas 기술을 이용해 상업용 무료 한글 폰트 14종을 선명하게 합성하므로 100% 무손실 텍스트를 보장합니다.",
    },
    {
      q: "Q6. 제작한 플레이리스트 영상으로 유튜브 수익 창출이 가능한가요?",
      a: "네, 가능합니다! 본인이 발급받은 Suno AI 유료 구독 계정(Pro/Premier)으로 생성한 음원은 상업적 권리가 온전히 사용자에게 귀속됩니다. 여기에 본 스튜디오가 제공하는 저작권 프리 AI 썸네일과 검색 최적화(SEO) 메타데이터를 결합하시면 유튜브 파트너 프로그램(YPP) 승인 및 광고 수익 창출이 원활합니다.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* 1. 상단 네비게이션 헤더 */}
      <header className="sticky top-0 z-40 bg-[#0c0c12]/90 backdrop-blur-md border-b border-cyan-500/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/studio"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors group font-medium px-2.5 py-1.5 rounded-md hover:bg-slate-900 border border-transparent hover:border-cyan-500/30"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>플레이리스트 스튜디오 복귀</span>
            </Link>
            <span className="text-slate-800">|</span>
            <a
              href="https://aimaster.buylife.xyz"
              className="text-xs text-slate-400 hover:text-cyan-400 transition-colors hidden sm:inline"
            >
              AIMaster 메인
            </a>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm shadow-cyan-500/20">
              <Headphones className="w-3 h-3 text-cyan-400 animate-pulse" />
              사이버 네온 콘솔 가이드
            </span>
            <Link
              href="/studio"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:brightness-110 transition-all shadow-md shadow-cyan-500/20"
            >
              지금 만들기
            </Link>
          </div>
        </div>
      </header>

      {/* 2. 히어로 배너 섹션 */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 border-b border-cyan-500/20 bg-gradient-to-b from-[#0c0c14] via-[#09090b] to-[#09090b]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-72 bg-gradient-to-tr from-cyan-500/10 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-5 shadow-inner">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>23종 장르 셀렉션 & Suno 5.0 작곡·썸네일 올인원 가이드북</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            조회수를 폭발시키는 감성 플레이리스트! <br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
              유튜브 플레이리스트 채널 제작 마스터 가이드
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            장르 선택부터 클릭을 부르는 타이틀 기획, Suno 5.0 음악 프롬프트, 5개국어 맞춤 가사,
            알고리즘 최적화 메타데이터, 깨짐 없는 한글 썸네일 합성까지 5분 만에 완성하세요.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14141e] border border-cyan-500/20">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>회원 본인 API 키 무제한 연동</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14141e] border border-purple-500/20">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span>Suno 5.0 900자 최적화 프롬프트</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14141e] border border-cyan-500/20">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>14종 무손실 한글 폰트 캔버스</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 본문 컨텐츠 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16 flex-1">
        {/* 파트 1: 5단계 플레이리스트 제작 파이프라인 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> 5-Step Workflow
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                완벽한 플레이리스트를 완성하는 5단계 제작 파이프라인
              </h2>
            </div>
            <span className="text-xs text-slate-500">초보자 맞춤 직관적 콘솔 프로세스</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {steps.map((st) => {
              const IconComp = st.icon;
              return (
                <div
                  key={st.num}
                  className="relative p-4 rounded-xl bg-[#12121a] border border-slate-800 hover:border-cyan-500/50 transition-all group flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                        STEP {st.num}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                        <IconComp className="w-4 h-4" />
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors mb-1.5">
                      {st.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {st.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-1">
                    {st.tags.map((tg) => (
                      <span
                        key={tg}
                        className="text-[10px] font-medium text-slate-400 bg-black/50 px-1.5 py-0.5 rounded border border-slate-800"
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

        {/* 파트 2: AI API 키 발급 & 안전 연동 안내 */}
        <section className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#12121a] to-[#161622] border border-cyan-500/30 relative overflow-hidden shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
                <KeyRound className="w-3.5 h-3.5" />
                <span>최상위 절대 규칙 준수 — 본인 API 키 직접 연동</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                Google Gemini / OpenAI / Claude 키 안전 연동
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                운영자 키 폴백 없이, 회원님 본인의 개인 API 키를 등록하여 안전하게 사용합니다.
                구글 AI 스튜디오(Google AI Studio)에서 Gemini 무료 API 키를 발급받으시면 일일 무료 할당량 내에서 비용 걱정 없이 고화질 썸네일과 음악 프롬프트를 무제한 기획할 수 있습니다.
              </p>
            </div>

            <div className="flex-shrink-0 flex flex-col gap-2.5">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
              >
                <span>Google AI Studio 키 발급</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-cyan-500/30 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>스튜디오에서 키 등록하기</span>
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 font-bold text-[11px] mt-0.5">
                1
              </div>
              <div className="text-slate-300">
                <span className="font-semibold text-white block mb-0.5">Google 계정 로그인</span>
                AI 스튜디오 접속 후 구글 계정으로 로그인합니다.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 font-bold text-[11px] mt-0.5">
                2
              </div>
              <div className="text-slate-300">
                <span className="font-semibold text-white block mb-0.5">API 키 생성 (Get Key)</span>
                'Create API Key'를 눌러 무료 프로젝트 키를 복사합니다.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 font-bold text-[11px] mt-0.5">
                3
              </div>
              <div className="text-slate-300">
                <span className="font-semibold text-white block mb-0.5">연동 및 로컬 암호화 저장</span>
                좌측 사이드바 '🔑 API키등록'에 입력하면 즉시 활성화됩니다.
              </div>
            </div>
          </div>
        </section>

        {/* 파트 3: 23종 장르 맵 & Suno 작곡 치트시트 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4" /> 23 Genre Presets
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                23종 감성 장르 & Suno 5.0 작곡 치트시트
              </h2>
            </div>
            <span className="text-xs text-slate-500">인기 유튜브 플레이리스트 장르 완벽 분석</span>
          </div>

          {/* 3대 카테고리 탭 */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-[#12121a] rounded-xl border border-slate-800">
            {genreCategories.map((cat) => (
              <button
                key={cat.title}
                onClick={() => setActiveGenreCategory(cat.title)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeGenreCategory === cat.title
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>

          {/* 활성화된 탭 상세 목록 */}
          {genreCategories
            .filter((c) => c.title === activeGenreCategory)
            .map((cat) => (
              <div key={cat.title} className="p-6 rounded-2xl bg-[#12121a] border border-slate-800 space-y-4">
                <p className="text-xs text-slate-400">{cat.desc}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {cat.genres.map((g) => (
                    <div
                      key={g.name}
                      className="p-4 rounded-xl bg-[#09090e] border border-slate-800/90 hover:border-cyan-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-cyan-300">{g.name}</span>
                        <span className="text-[10px] font-mono font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                          {g.bpm}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{g.mood}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </section>

        {/* 파트 4: 유튜브 알고리즘 떡상 노하우 3원칙 */}
        <section className="p-6 sm:p-8 rounded-2xl bg-[#12121a] border border-slate-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-black font-bold shadow-md shadow-cyan-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Algorithm Growth Formula
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                유튜브 시청 지속 시간 & 클릭률(CTR) 2배 상승 노하우
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#09090e] border border-slate-800 space-y-2">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                1. 2중 키워드 감성 타이틀
              </div>
              <p className="text-slate-400 leading-relaxed">
                "playlist 비 오는 날 커피 향과 함께 듣는 재즈 | Jazz & Rainy Cafe"처럼 감성적인 한글 문구와 직관적인 영문 태그를 조합하여 검색 노출과 클릭률을 동시에 확보합니다.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#09090e] border border-slate-800 space-y-2">
              <div className="font-bold text-purple-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                2. 타임라인(Chapters) 자동 기입
              </div>
              <p className="text-slate-400 leading-relaxed">
                생성된 곡별 제목과 재생 시간을 유튜브 영상 설명란에 타임라인(00:00 곡명)으로 기재하면 시청 편의성이 극대화되고 구글 검색 챕터 색인에 반영됩니다.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#09090e] border border-slate-800 space-y-2">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                3. 시네마틱 무손실 썸네일
              </div>
              <p className="text-slate-400 leading-relaxed">
                이미지 중앙 또는 좌측 상단에 굵고 선명한 감성 한글 타이틀을 배치하고, 14종 상업용 무료 폰트 중 장르 분위기에 맞는 서체를 골라 브랜딩 통일성을 유지합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 파트 5: 자주 묻는 질문 (FAQ) 아코디언 */}
        <section className="space-y-6">
          <div>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
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
                  className="rounded-xl border border-slate-800 bg-[#12121a] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-850 transition-colors"
                  >
                    <span className="text-sm sm:text-base font-bold text-white">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-cyan-400 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 파트 6: 하단 시작 CTA */}
        <section className="text-center py-10 px-6 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-purple-500/10 to-cyan-500/15 border border-cyan-500/30 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-black mx-auto shadow-lg shadow-cyan-500/30">
            <Headphones className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            지금 바로 당신만의 감성 플레이리스트 채널을 시작해보세요!
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            23종 장르 셀렉션과 AI 원스톱 엔진이 여러분의 음악 크리에이터 여정을 강력하게 서포트합니다.
          </p>
          <div className="pt-2">
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:brightness-110 transition-all shadow-xl shadow-cyan-500/25"
            >
              <Sparkles className="w-4 h-4" />
              <span>플레이리스트 스튜디오 바로가기</span>
            </Link>
          </div>
        </section>
      </main>

      {/* 4. 푸터 */}
      <footer className="border-t border-slate-800/80 bg-[#07070a] py-8 px-4 text-center text-xs text-slate-500">
        <p className="flex items-center justify-center gap-2">
          <span>YOUTUBE 플레이리스트 자동화</span>
          <span>•</span>
          <span>사이버 네온 다크 콘솔 템플릿</span>
          <span>•</span>
          <a
            href="https://aimaster.buylife.xyz"
            className="text-cyan-400 hover:underline"
          >
            AIMaster 공식 플랫폼
          </a>
        </p>
      </footer>
    </div>
  );
}
