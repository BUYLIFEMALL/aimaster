"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clapperboard,
  Sparkles,
  KeyRound,
  ImagePlus,
  Wand2,
  Scissors,
  Video,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Film,
  Camera,
  PlaySquare,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { GLOSSARY } from "@/lib/storyboard/glossary";

// 파이프라인 단계 데이터
const PIPELINE_STEPS = [
  {
    step: "01",
    badge: "API KEY",
    title: "본인 Google Gemini API 키 연동",
    desc: "사이드바의 [API키등록·플랫폼연동] 메뉴에서 본인의 Google AI Studio Gemini API 키를 등록합니다. 회원 본인의 키로만 작동하여 보안이 안전하고 사용량 제한 없이 자유롭게 제작할 수 있습니다.",
    tip: "Gemini 2.5 Flash 및 Pro 비전 모델을 사용하여 고해상도 이미지 분석 및 콘택트 시트 생성을 지원합니다.",
    icon: KeyRound,
    color: "amber",
  },
  {
    step: "02",
    badge: "UPLOAD & TOPIC",
    title: "레퍼런스 이미지 업로드 & 로그라인 제안",
    desc: "영화 분위기나 캐릭터, 조명 레퍼런스가 담긴 이미지 1장을 업로드합니다. 원하는 줄거리나 테마가 있으면 입력하고, 막막할 때는 [AI 제안] 버튼을 눌러 이미지에 어울리는 한 줄 로그라인을 즉시 추천받습니다.",
    tip: "드래그앤드롭으로 간편하게 업로드할 수 있으며, 긴 변 1600px로 최적화되어 빠른 처리 속도를 보장합니다.",
    icon: ImagePlus,
    color: "sky",
  },
  {
    step: "03",
    badge: "ANALYSIS",
    title: "4단계 감정선 & 9컷 키프레임 자동 분석",
    desc: "AI가 업로드된 원본 이미지의 구도, 조명, 피사체, 색감을 정밀 분해합니다. 이를 기반으로 기승전결 4단계 감정선과 스토리 흐름에 최적화된 9컷 키프레임(Action, Shot, Camera, Lighting, Sound)을 기획합니다.",
    tip: "ELS(원경)부터 CU(클로즈업), Dutch 앵글 등 전문 영화 연출 문법이 자동으로 적용됩니다.",
    icon: Wand2,
    color: "purple",
  },
  {
    step: "04",
    badge: "MASTER SHEET",
    title: "3:2 마스터 콘택트 시트 렌더링 & 3×3 정밀 분할",
    desc: "9컷이 하나의 3:2 비율 마스터 필름 콘택트 시트로 완성됩니다. [자르기 및 다운로드] 메뉴에서 브라우저 기반 슬라이더로 상하좌우 경계를 미세 조정한 뒤, 9장의 고화질 개별 키프레임을 ZIP 파일로 한 번에 내려받습니다.",
    tip: "더 디테일한 영화적 질감이 필요할 때는 Pro 2K 고화질 엔진을 선택할 수 있습니다.",
    icon: Scissors,
    color: "emerald",
  },
  {
    step: "05",
    badge: "VIDEO PROMPT",
    title: "Runway · Kling · Luma 맞춤 영상 프롬프트 생성",
    desc: "목표 영상 길이(5초/8초/10초/15초)와 대사 언어를 선택하면, 영상 생성 AI 서비스에 바로 복사해 붙여넣을 수 있는 마스터 스타일 프롬프트와 컷별 시간 배분 프롬프트, JSON 명세서가 자동 추출됩니다.",
    tip: "1번 컷을 시작 이미지(Start Image)로 업로드하면 완벽하게 연속성 있는 비디오 클립을 얻을 수 있습니다.",
    icon: Video,
    color: "rose",
  },
];

// 비디오 AI 연계 팁
const VIDEO_AI_TOOLS = [
  {
    name: "Runway Gen-3 Alpha",
    badge: "추천",
    role: "카메라 무빙 & 텍스처",
    desc: "스튜디오에서 다운로드한 1번 컷을 'First Frame'에 넣고, 제공된 마스터 스타일 프롬프트를 입력하면 일관된 질감의 고화질 시네마틱 무빙 영상을 생성할 수 있습니다.",
  },
  {
    name: "Kling AI 1.5",
    badge: "자연스러운 모션",
    role: "인물 표정 & 물리 엔진",
    desc: "동양인 및 사실적 인물 묘사에 탁월합니다. 컷별 프롬프트의 카메라 모션 지시어(Pan, Tilt, Dolly)를 모션 브러시와 함께 사용하면 최적의 결과를 냅니다.",
  },
  {
    name: "Luma Dream Machine",
    badge: "빠른 렌더링",
    role: "동적 샷 & 조명 변화",
    desc: "드라마틱한 광원 변화와 빠른 액션 샷 생성에 강력합니다. 스튜디오에서 추출된 Scene별 프롬프트를 순서대로 입력하여 숏폼/티저 영상을 신속히 제작하세요.",
  },
];

// 자주 묻는 질문 FAQ
const FAQS = [
  {
    q: "어떤 이미지를 레퍼런스로 올리는 것이 가장 좋은가요?",
    a: "조명과 피사체의 윤곽이 뚜렷하고, 특정 무드(사이버펑크, 누아르, 빈티지 필름, 시네마틱 다큐멘터리 등)가 잘 드러난 이미지를 추천합니다. 영화 스틸컷 느낌이나 감각적인 사진일수록 AI가 더 풍성한 4단계 감정선과 9컷 키프레임을 설계합니다.",
  },
  {
    q: "API 키 비용은 얼마나 발생하나요?",
    a: "회원님 본인의 Google Gemini API 키를 직접 등록하여 사용하므로, 비용은 Google Cloud 콘솔 본인 계정 기준으로만 청구됩니다. 표준 엔진(Gemini 2.5 Flash)은 매우 저렴하며 무료 제공 한도(Free Tier) 내에서도 다수의 스토리보드를 시험 제작할 수 있습니다. Pro 엔진은 고화질 이미지 생성을 위해 과금이 발생할 수 있으니 프로젝트 필요에 따라 선택하세요.",
  },
  {
    q: "9컷 마스터 시트에서 특정 컷 경계가 맞지 않을 때는 어떻게 하나요?",
    a: "[자르기 및 다운로드] 버튼을 누르면 내장된 인터랙티브 슬라이더 에디터가 열립니다. 상단/중단/하단 각 3열의 상하 경계선(Top/Bottom)과 좌우 여백(Left/Right)을 픽셀 단위로 조절하여 완벽한 비율로 9장의 JPG를 정밀하게 분할할 수 있습니다.",
  },
  {
    q: "추출된 영상 프롬프트를 어떻게 활용해야 하나요?",
    a: "영상 프롬프트 패널에서 전체 톤을 잡는 [마스터 프롬프트(Style, Character, Environment)]와 각 씬별 프롬프트(Duration, Shot, Prompt, Dialogue)를 각각 원클릭으로 복사할 수 있습니다. 또한 [JSON 다운로드]를 통해 자동화 파이프라인이나 ComfyUI, 비디오 워크플로우에 직접 연동할 수 있습니다.",
  },
];

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [filterCat, setFilterCat] = useState<string>("ALL");

  // 용어 카테고리 분류
  const shotSizeTerms = GLOSSARY.filter((g) =>
    ["ELS", "LS", "MLS", "MS", "MCU", "CU", "ECU", "Two Shot"].includes(g.term)
  );
  const angleTerms = GLOSSARY.filter((g) =>
    ["Low Angle", "High Angle", "Bird's Eye", "Dutch", "OTS", "POV"].includes(g.term)
  );
  const movingTerms = GLOSSARY.filter((g) =>
    ["Rack Focus", "Dolly Zoom", "Pan", "Tilt", "Tracking"].includes(g.term)
  );

  const displayedGlossary =
    filterCat === "SHOT"
      ? shotSizeTerms
      : filterCat === "ANGLE"
      ? angleTerms
      : filterCat === "MOVE"
      ? movingTerms
      : GLOSSARY;

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-16">
      {/* 1. 헤더 히어로 배너 */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-[#131926] via-[#0f1420] to-[#0b0f17] p-8 shadow-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-400">
              <Film size={14} />
              <span>크리에이티브 아틀리에 · 영화 제작 가이드북</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-100 sm:text-3xl">
              📖 시네마틱 스토리보드 스튜디오 완벽 활용 매뉴얼
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              단 한 장의 레퍼런스 이미지에서 출발하여 구도·조명·감정선을 정밀 분석하고, 3:2 비율의 9컷 마스터 콘택트 시트 렌더링부터 Runway·Kling·Luma 맞춤 영상 AI 프롬프트까지 원스톱으로 완성하는 파이프라인 가이드입니다.
            </p>
          </div>
          <Link
            href="/studio"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition hover:from-amber-400 hover:to-amber-500 hover:shadow-[0_0_25px_rgba(245,158,11,0.45)]"
          >
            <Sparkles size={16} />
            <span>스튜디오 시작하기</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* 2. 5단계 제작 파이프라인 인포그래픽 */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-amber-500" size={20} />
            <h2 className="text-lg font-black tracking-tight text-slate-100">
              5단계 시네마틱 제작 파이프라인 (Step-by-Step)
            </h2>
          </div>
          <span className="rounded-md border border-slate-800 bg-[#131926] px-2.5 py-1 text-xs font-medium text-slate-400">
            초보자도 3분 완성
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {PIPELINE_STEPS.map((item, idx) => {
            const Icon = item.icon;
            const isWide = idx === 3 || idx === 4;
            return (
              <div
                key={item.step}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-[#131926] p-5 transition hover:border-slate-700 hover:shadow-lg ${
                  isWide ? "lg:col-span-1" : ""
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-xs font-black text-amber-400">
                      {item.step}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-[#182030] px-2 py-0.5 text-[10px] font-bold text-slate-400">
                      {item.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    <div className="rounded-lg bg-[#182030] p-2 text-amber-400">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-100">{item.title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">{item.desc}</p>
                </div>
                <div className="mt-4 rounded-xl border border-slate-800/80 bg-[#0e131f] p-2.5 text-[11px] text-slate-400">
                  <span className="font-semibold text-amber-400">💡 Tip: </span>
                  {item.tip}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. 비디오 AI 생성 툴(Runway, Kling, Luma) 연계 팁 */}
      <section className="rounded-3xl border border-slate-800 bg-[#131926] p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <PlaySquare className="text-rose-500" size={20} />
            <h2 className="text-lg font-black tracking-tight text-slate-100">
              Runway · Kling · Luma 비디오 AI 실전 연동 노하우
            </h2>
          </div>
          <span className="text-xs text-slate-400">스토리보드에서 영상 클립으로 직행</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {VIDEO_AI_TOOLS.map((tool) => (
            <div
              key={tool.name}
              className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#0e131f] p-5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-slate-100">{tool.name}</p>
                  <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                    {tool.badge}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-amber-400">{tool.role}</p>
                <p className="pt-1 text-xs leading-relaxed text-slate-400">{tool.desc}</p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>100% 프롬프트 호환</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. 전문 촬영 & 앵글 용어 치트시트 */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Camera className="text-amber-500" size={20} />
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-100">
                시네마틱 촬영 & 앵글 용어 치트시트 ({displayedGlossary.length}선)
              </h2>
              <p className="text-xs text-slate-400">AI가 9컷 키프레임 설계 시 적용하는 영화 연출 문법 사전</p>
            </div>
          </div>
          {/* 필터 탭 */}
          <div className="flex rounded-xl border border-slate-800 bg-[#0e131f] p-1 text-xs font-bold">
            {[
              { id: "ALL", label: "전체보기" },
              { id: "SHOT", label: "샷 크기 (8)" },
              { id: "ANGLE", label: "카메라 앵글 (6)" },
              { id: "MOVE", label: "카메라 무빙 (5)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterCat(tab.id)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  filterCat === tab.id
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {displayedGlossary.map((g) => (
            <div
              key={g.term}
              className="group rounded-2xl border border-slate-800 bg-[#131926] p-4 transition hover:border-slate-700"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-sm font-black text-amber-400 group-hover:text-amber-300">
                  {g.term}
                </span>
                <span className="text-[11px] text-slate-400">{g.full}</span>
              </div>
              <p className="mt-1.5 text-xs font-medium text-slate-200">{g.ko}</p>
              <p className="mt-1 text-[11px] text-slate-400">{g.en}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. 자주 묻는 질문 FAQ 아코디언 */}
      <section className="rounded-3xl border border-slate-800 bg-[#131926] p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <HelpCircle className="text-amber-500" size={20} />
          <h2 className="text-lg font-black tracking-tight text-slate-100">
            자주 묻는 질문 (FAQ)
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0e131f] transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                >
                  <span className="text-sm font-bold text-slate-200">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-amber-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-800/60 p-4 pt-3 text-xs leading-relaxed text-slate-400">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. 하단 안전 안내 & 스튜디오 이동 CTA */}
      <section className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-gradient-to-r from-[#131926] via-[#101624] to-[#0e131f] p-6 sm:flex-row sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-400">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-100">안전한 회원 본인 API 키 기반 시스템</p>
            <p className="text-xs text-slate-400">운영자나 타인의 키로 폴백하지 않으며, 모든 생성물은 안전하게 보존됩니다.</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-3">
          <Link
            href="/settings"
            className="rounded-xl border border-slate-700 bg-[#182030] px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-[#202b40]"
          >
            API 키 설정
          </Link>
          <Link
            href="/studio"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:from-amber-400 hover:to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
          >
            <Clapperboard size={15} />
            <span>스토리보드 제작하기</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
