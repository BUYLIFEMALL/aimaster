"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dna,
  Microscope,
  Wand2,
  FlaskConical,
  KeyRound,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Camera,
  SunMedium,
  Palette,
  Layers,
  Sparkle,
  SlidersHorizontal,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Cpu,
  Boxes,
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "이미지 비주얼 DNA 분석",
    href: "/analyze",
    badge: "Step 1: Ingestion & Scan",
    icon: Microscope,
    color: "from-cyan-500 to-blue-600",
    summary: "참조 이미지를 정밀 스캔하여 6대 비주얼 유전자(카메라·조명·컬러·텍스처·무드·구도)를 즉각 분해합니다.",
    features: [
      "초점거리, 조리개, 카메라 앵글 역추적",
      "주요 색상 HEX 팔레트 자동 추출",
      "자연광·스튜디오 조명 및 그림자 맵 분석",
      "스타일 마스터 프롬프트 1차 생성",
    ],
  },
  {
    step: "02",
    title: "프롬프트 미세 보정 & 변이",
    href: "/refine",
    badge: "Step 2: Gene Mutation",
    icon: Wand2,
    color: "from-violet-500 to-purple-600",
    summary: "추출된 스타일 DNA를 온전히 복제(Clone)하거나 원하는 요소만 유전자 변이(Mutate)하여 맞춤형 프롬프트로 다듬습니다.",
    features: [
      "피사체(Subject) 교체 및 배경 무드 유지",
      "클론 모드 vs 아티스틱 변이 가중치 슬라이더",
      "네거티브 프롬프트 자동 최적화",
      "플랫폼별(Midjourney, FLUX, SD) 문법 변환",
    ],
  },
  {
    step: "03",
    title: "결과 생성 & 오리지널 비교",
    href: "/test",
    badge: "Step 3: Synthesis & Bench",
    icon: FlaskConical,
    color: "from-emerald-500 to-teal-600",
    summary: "회원 본인의 이미지 모델 API 키로 즉시 시각화 렌더링을 진행하고, 원본 이미지와의 스타일 일치도를 검증합니다.",
    features: [
      "회원 본인 API 키 기반 직접 렌더링",
      "원본 vs 생성 이미지 1:1 사이드 스플릿 비교",
      "조명/색감 유사도 매칭 스코어 산출",
      "고해상도 다운로드 및 보관함 저장",
    ],
  },
];

const DNA_PARAMETERS = [
  {
    icon: Camera,
    title: "카메라 & 광학 세팅",
    desc: "렌즈 초점거리(35mm, 85mm 등), 조리개 심도(f/1.4 DoF), 샷 구도(익스트림 클로즈업, 로우앵글).",
  },
  {
    icon: SunMedium,
    title: "라이팅 & 분위기",
    desc: "키 라이트, 림 라이트, 골든 아워 자연광, 볼륨메트릭 갓레이, 네온 글로우 등 빛의 방향과 질감.",
  },
  {
    icon: Palette,
    title: "색채 유전자 (HEX)",
    desc: "도미넌트(주조색), 서브 컬러, 포인트 악센트 색상 및 톤온톤 배색 구조를 HEX 코드로 정확히 분석.",
  },
  {
    icon: Layers,
    title: "렌더링 텍스처 & 매체",
    desc: "35mm 필름 그레인, 옥테인 3D 렌더, 수채화 텍스처, 시네마틱 8K 등 매체의 표면 질감.",
  },
  {
    icon: Sparkle,
    title: "아티스틱 무드 & 테마",
    desc: "사이버펑크, 미니멀리즘, 빈티지 레트로, 네오 느와르, 유토피안 판타지 등 전체적인 미학적 사조.",
  },
  {
    icon: SlidersHorizontal,
    title: "네거티브 가드레일",
    desc: "왜곡된 손가락, 부자연스러운 텍스처, 과포화 등 원치 않는 요소를 원천 차단하는 네거티브 키워드.",
  },
];

const FAQS = [
  {
    q: "어떤 이미지를 넣어야 가장 정확한 스타일 DNA가 추출되나요?",
    a: "해상도가 선명하고 고유의 조명, 색감, 연출이 뚜렷한 이미지가 가장 이상적입니다. 핀터레스트, 비핸스 등에서 수집한 레퍼런스 이미지나 본인이 제작하고자 하는 분위기의 대표 샘플을 업로드하시면 95% 이상의 높은 분석 정확도를 보입니다.",
  },
  {
    q: "클론(Clone) 모드와 변이(Mutation) 모드는 어떻게 다른가요?",
    a: "클론 모드는 원본의 조명, 색상, 질감, 렌즈 세팅을 100% 흡사하게 재현하여 다른 사물이나 인물에 그대로 입히는 기능입니다. 변이 모드는 원본의 스타일 토큰 중 특정 요소(예: 낮 조명을 사이버펑크 네온으로 변경, 배경 톤 변경 등)를 사용자가 원하는 방향으로 변형하여 새로운 스타일을 창조하는 기능입니다.",
  },
  {
    q: "추출된 마스터 프롬프트는 다른 AI 생성 툴에서도 쓸 수 있나요?",
    a: "네! 분석된 프롬프트는 표준 영문 프롬프트 구조로 출력되므로 미드저니(Midjourney), FLUX, 스테이블 디퓨전(SDXL), 바나나 캔버스, DALL-E 3 등 모든 주요 생성형 AI 도구에 그대로 복사하여 사용할 수 있습니다.",
  },
  {
    q: "테스트 이미지 생성 시 비용이나 크레딧이 차감되나요?",
    a: "본 프로그램은 '회원 본인 API 키 직접 연동' 원칙을 준수합니다. [🔑 API키등록·플랫폼연동] 메뉴에서 회원님 본인의 Google Gemini API 키를 등록하여 사용하므로, 플랫폼 수수료나 중개 크레딧 차감 없이 사용자 본인 계정의 요금제/무료 한도 내에서 투명하게 작동합니다.",
  },
  {
    q: "분석한 데이터와 생성된 이미지는 어디에 보관되나요?",
    a: "분석된 스타일 DNA 카드는 회원 본인 계정 전용 보관함에 안전하게 격리 저장됩니다. 생성 콘텐츠 격리 원칙에 따라 타 회원과 공유되지 않으며, 언제든 보관함에서 다시 열람하거나 프롬프트를 재추출할 수 있습니다.",
  },
];

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#0c0f17] text-[#f8fafc] p-4 md:p-8 space-y-10">
      {/* 1. 상단 히어로 배너 */}
      <div className="relative overflow-hidden rounded-3xl border border-[#222d42] bg-gradient-to-br from-[#131824] via-[#101420] to-[#0c0f17] p-6 md:p-10 shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
            <Dna size={14} className="text-cyan-400" />
            <span>AI 비주얼 유전자 분석기 {APP_VERSION}</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            이미지의 <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-violet-400 bg-clip-text text-transparent">스타일 DNA</span>를 정밀 분석하고,<br />
            동일한 감성의 아트를 완벽히 복제하세요
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            원하는 레퍼런스 이미지를 업로드하면 시각적 DNA(카메라 조리개, 빛의 산란, 팔레트 HEX, 텍스처, 아티스틱 무드)를 역공학 분해하여 마스터 프롬프트로 재구성합니다.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-xs md:text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-transform hover:scale-102 hover:shadow-cyan-500/40"
            >
              <Microscope size={16} />
              <span>지금 이미지 DNA 분석 시작</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-[#222d42] bg-[#182030] px-5 py-3 text-xs md:text-sm font-bold text-slate-200 transition-colors hover:bg-[#222d42] hover:text-white"
            >
              <KeyRound size={16} className="text-cyan-400" />
              <span>본인 API 키 설정</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 표준 3단계 워크플로우 */}
      <div className="space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Step-by-Step Pipeline</span>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">표준 3단계 분석 및 창작 프로세스</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {WORKFLOW_STEPS.map((wf) => {
            const Icon = wf.icon;
            return (
              <div
                key={wf.step}
                className="group relative flex flex-col justify-between rounded-2xl border border-[#222d42] bg-[#131824] p-6 transition-all hover:border-cyan-500/40 hover:bg-[#182030]/80 shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">{wf.badge}</span>
                    <span className={`text-2xl font-black bg-gradient-to-r ${wf.color} bg-clip-text text-transparent`}>
                      {wf.step}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${wf.color} text-white shadow-md`}>
                      <Icon size={20} />
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {wf.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {wf.summary}
                  </p>

                  <ul className="space-y-2 pt-2 border-t border-[#222d42]">
                    {wf.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-400">
                        <Sparkles size={13} className="shrink-0 text-cyan-400 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <Link
                    href={wf.href}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#222d42] bg-[#0c0f17] py-2.5 text-xs font-bold text-slate-300 group-hover:border-cyan-500/40 group-hover:bg-cyan-500/10 group-hover:text-cyan-300 transition-all"
                  >
                    <span>단계 바로가기</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 스타일 DNA 정밀 분석 6대 파라미터 */}
      <div className="rounded-3xl border border-[#222d42] bg-[#131824] p-6 md:p-8 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-violet-400">DNA Architecture</span>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">스타일 DNA를 구성하는 6대 비주얼 유전자</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            단순한 키워드 추출을 넘어, 전문 촬영 감독과 비주얼 디렉터의 시선으로 이미지를 구성하는 모든 변수를 분석합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DNA_PARAMETERS.map((param, index) => {
            const Icon = param.icon;
            return (
              <div
                key={index}
                className="rounded-2xl border border-[#222d42] bg-[#0c0f17] p-5 space-y-3 hover:border-violet-500/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    <Icon size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-white">{param.title}</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{param.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 회원 본인 API 키 연동 원칙 안내 */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 via-[#131824] to-violet-950/30 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              <ShieldCheck size={16} />
              <span>최상위 보안 원칙 (회원 본인 키 독립 연동)</span>
            </div>
            <h3 className="text-lg md:text-xl font-extrabold text-white">
              Google Gemini API 키 직접 등록으로 안전하고 자유롭게 분석하세요
            </h3>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              본 플랫폼은 운영자나 타 회원의 API 키를 공유하지 않으며, 회원님이 등록하신 본인 키는 브라우저 및 회원 데이터베이스에 암호화 보관되어 본인 요청 시에만 독립 호출됩니다.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[#222d42] bg-[#0c0f17] px-4 py-2.5 text-xs font-bold text-slate-200 hover:text-white hover:border-cyan-500/40 transition-colors"
            >
              <span>Gemini 무료 키 발급</span>
              <ExternalLink size={13} />
            </a>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition-colors"
            >
              <KeyRound size={14} />
              <span>API 키 등록하러 가기</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 5. 자주 묻는 질문 (FAQ) 아코디언 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-cyan-400" />
          <h2 className="text-xl md:text-2xl font-extrabold text-white">자주 묻는 질문 (FAQ)</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-[#222d42] bg-[#131824] transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left text-xs md:text-sm font-bold text-slate-200 hover:text-white"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-[11px] font-mono font-bold text-cyan-400 border border-cyan-500/20">
                      Q{index + 1}
                    </span>
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-cyan-400" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#222d42] bg-[#0c0f17]/70 px-5 py-4 text-xs md:text-sm text-slate-300 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. 하단 바로가기 푸터 카드 */}
      <div className="rounded-2xl border border-[#222d42] bg-[#131824] p-6 text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20">
          <Dna size={24} />
        </div>
        <h3 className="text-lg font-bold text-white">준비되셨나요? 지금 나만의 스타일 DNA를 추출해보세요</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          복잡한 프롬프트 엔지니어링 없이, 이미지 한 장으로 동일한 퀄리티의 비주얼 아트를 손쉽게 재창조할 수 있습니다.
        </p>
        <div className="pt-2">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-3 text-xs md:text-sm font-bold text-white shadow-lg shadow-cyan-500/25 hover:scale-102 transition-transform"
          >
            <span>이미지 분석 시작하기</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
