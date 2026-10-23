"use client";

import { useState } from "react";
import Link from "next/link";

interface StepItem {
  step: string;
  title: string;
  desc: string;
  icon: string;
  tags: string[];
}

const STEPS: StepItem[] = [
  {
    step: "STEP 01",
    title: "본인 AI API 키 등록 및 연동",
    desc: "좌측 'API키등록·플랫폼연동' 메뉴에서 Google Gemini, Replicate, OpenAI 등 사용하고자 하는 플랫폼의 개인 API 키를 등록합니다. 타인이나 운영자 키로 폴백되지 않고 본인 계정으로 안전하게 격리 호출됩니다.",
    icon: "🔑",
    tags: ["Gemini", "Replicate (FLUX/Recraft/Ideogram)", "OpenAI (GPT Image)"],
  },
  {
    step: "STEP 02",
    title: "한글 키워드 및 아이디어 입력",
    desc: "만들고자 하는 이미지의 핵심 상황과 피사체를 편안한 한국어로 입력합니다. 단순 단어(예: '비 오는 거리의 카페')만 적어도 AI가 정교한 시각적 상황으로 확장해 드립니다.",
    icon: "💡",
    tags: ["자연어 입력", "상황 묘사", "컨셉 지정"],
  },
  {
    step: "STEP 03",
    title: "AI 프롬프트 강화기 (make.com Nanobanana 엔진)",
    desc: "단 한 번의 클릭으로 카메라 렌즈(Sony A7R IV 50mm f/1.8), 황금빛 조명, 사실적 질감, 네거티브 제외 블록(no text, no illustration)이 자동으로 조합된 마스터 프롬프트로 고도화됩니다. 픽사 3D, 지브리 감성, 극장판 2D 등 화풍 프리셋도 지원합니다.",
    icon: "✨",
    tags: ["포토리얼리즘", "Sony A7R IV 메타데이터", "화풍 프리셋 3종"],
  },
  {
    step: "STEP 04",
    title: "AI 모델 엔진 & 종횡비 맞춤 생성",
    desc: "Gemini Nano Banana 2.1(1K/2K/4K), Gemini 3 Pro Image, FLUX 2.0, Z-Image, Recraft(SVG 벡터) 등 원하는 엔진과 화면비(16:9, 1:1, 9:16)를 선택하고 연속 1~10장을 고속 생성합니다.",
    icon: "🚀",
    tags: ["최신 정식 모델", "종횡비 선택", "1~10장 연속 생성"],
  },
  {
    step: "STEP 05",
    title: "결과 갤러리 확인 및 고화질 다운로드",
    desc: "생성된 이미지는 개인 작업 결과 갤러리에 안전하게 보관되며, 클릭 한 번으로 무손실 고화질 다운로드가 가능합니다. 타 서브프로그램과의 연계를 위한 프롬프트 복사 기능도 지원합니다.",
    icon: "🖼️",
    tags: ["개인 갤러리 보관", "고화질 다운로드", "프롬프트 재사용"],
  },
];

const GOLDEN_TIPS = [
  {
    title: "기본은 고품질의 사실적 실사 (포토리얼리즘)",
    desc: "추상적인 감정 단어 대신 화면에 보이는 구체적인 사물, 시간대, 광원, 질감을 묘사하세요. 예: '신비로운 숲'보다 '안개 낀 새벽 침엽수림 사이로 쏟아지는 틴달 광선과 이슬 맺힌 이끼 바위'가 훨씬 압도적인 결과물을 만듭니다.",
    badge: "실사 품질 원칙",
  },
  {
    title: "인물 묘사의 기본은 한국인",
    desc: "인물이 등장하는 이미지에서는 기본적으로 한국인(East Asian / Korean)으로 정교하게 묘사됩니다. 특정 해외 유명인이나 외국 배경 맥락이 필요한 경우에만 예외적으로 외국인 인물을 지정하세요.",
    badge: "인물 기준",
  },
  {
    title: "이미지 속 글자/워터마크 배제 원칙",
    desc: "AI 이미지 생성 시 글자가 뭉개지거나 왜곡되는 것을 방지하기 위해 'no text, no letters, no watermark'가 기본 적용됩니다. 썸네일이나 카드뉴스의 타이틀 텍스트는 캔버스 툴이나 HTML 레이어로 얹는 것이 가장 깔끔합니다.",
    badge: "텍스트 배제",
  },
  {
    title: "캐릭터 및 시리즈 일관성 유지 팁",
    desc: "웹툰, 스토리보드, 인플루언서 연작 제작 시 동일한 캐릭터를 유지하려면 외모, 헤어스타일, 의상 컬러, 고유 소품을 담은 '고정 묘사 블록'을 프롬프트마다 동일하게 반복 입력하세요.",
    badge: "일관성 유지",
  },
];

const FAQS = [
  {
    q: "이미지 생성 비용은 어떻게 청구되나요?",
    a: "AI 이미지 스튜디오는 회원 본인이 등록한 API 키(Google, Replicate, OpenAI)를 직접 호출합니다. 모든 이미지 생성 AI 모델은 무료 제공 티어가 없으며, 사용한 장수 및 해상도(1K/2K/4K)에 따라 본인 API 계정의 결제 수단으로 공식 가격표에 맞춰 과금됩니다.",
  },
  {
    q: "생성된 이미지의 상업적 이용 및 저작권은 어떻게 되나요?",
    a: "회원 본인의 API 키로 직접 생성한 이미지는 블로그, 유튜브 썸네일, 인스타그램 피드, 상세페이지 등 모든 상업적 목적에 자유롭게 활용하실 수 있습니다. 단, 타사의 등록 상표나 저작권 캐릭터를 침해하지 않는 프롬프트 작성을 권장합니다.",
  },
  {
    q: "원하는 특정 화풍(3D 애니, 수채화, 웹툰)을 만드는 가장 쉬운 방법은?",
    a: "1단계 프롬프트 강화기에서 '픽사 3D 애니메이션', '스튜디오 지브리 감성', '일본 2D 극장판' 프리셋 칩을 선택해 보세요. Cinema 4D 조명, 수채화 터치, 렌즈 플레어 메타데이터가 자동으로 추가되어 해당 화풍을 완벽하게 재현합니다.",
  },
  {
    q: "생성 중 오류가 나거나 대기 시간이 길어질 때는 어떻게 하나요?",
    a: "FLUX나 Ideogram 등 고화질 대형 모델은 대기열(Cold start) 상태에 따라 15~30초가 소요될 수 있습니다. 만약 401/403 오류가 발생한다면 'API키등록' 메뉴에서 본인의 API 키가 유효하고 크레딧 잔여량이 충분한지 확인해 주십시오.",
  },
];

export function ImageGuideView() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-12 pb-16">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/30 p-6 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-400">
            <span>📖</span>
            <span>공식 사용 매뉴얼 & 연동 가이드북</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
            아이디어를 초고화질 걸작으로 바꾸는 <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              AI 이미지 스튜디오 완전 정복 가이드
            </span>
          </h1>
          <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
            Google Gemini(Nano Banana 2.1), FLUX 2.0, OpenAI GPT Image, Z-Image, Recraft SVG까지!
            회원 본인의 API 키로 가장 저렴하고 안전하게 고품질 이미지를 생성하는 5단계 파이프라인과 실전 프롬프트 노하우를 안내합니다.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
            >
              <span>🎨</span>
              <span>작업실 바로가기</span>
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:border-amber-500/40 hover:text-amber-400 transition-all"
            >
              <span>🔑</span>
              <span>API 키 연동하기</span>
            </Link>
          </div>
        </div>
      </div>

      <section id="custom-prompts" className="scroll-mt-28 space-y-4 rounded-2xl border border-emerald-500/25 bg-zinc-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold text-emerald-400">📝 나만의 화풍 프롬프트 · 약 1분</p>
            <h2 className="mt-1 text-xl font-bold text-white">기본 예시를 나만의 이미지 표현으로 바꾸기</h2></div>
          <Link href="/prompts" className="rounded-xl border border-emerald-500/30 px-4 py-2 text-sm font-bold text-emerald-300">프롬프트 게시판 열기</Link>
        </div>
        <p className="text-sm leading-relaxed text-zinc-400">기본 예시에서 개인 사본을 만들면 본인만 볼 수 있습니다. 장소·인물·구도·빛·색감을 바꿔 다음 작업에도 불러오세요.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["STEP 1", "📚", "기본 예시 선택", "게시판의 ‘기본 예시’에서 원하는 화풍과 상황을 찾습니다."],
            ["STEP 2", "✏️", "나만의 버전 만들기", "버튼을 누른 뒤 이름·화풍·상황 묘사를 원하는 내용으로 수정합니다."],
            ["STEP 3", "🔒", "내 보관함에 저장", "저장하면 ‘나만의 프롬프트’에 본인 사본이 표시됩니다. 원본은 유지됩니다."],
            ["STEP 4", "🎨", "작업실에서 사용", "불러온 내용을 그대로 Step 2에 보내거나, 본인 OpenAI 키로 AI 추가 보강합니다."],
          ].map(([step, icon, title, description]) => <div key={step} className="rounded-xl border border-zinc-700 bg-zinc-950 p-4">
            <p className="text-xs font-bold text-emerald-400">{step} {icon}</p><h3 className="mt-2 text-sm font-bold text-white">{title}</h3><p className="mt-2 text-xs leading-relaxed text-zinc-400">{description}</p>
          </div>)}
        </div>
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-zinc-300">💡 본문에 대상·행동·배경·구도·빛·질감을 적으면 상황이 더 명확해집니다. ‘AI 보강 없이 그대로 Step 2에 사용’은 프롬프트를 바꾸지 않으며 별도 텍스트 AI 호출도 하지 않습니다. 실제 이미지 생성은 선택한 모델의 본인 키로 진행됩니다.</p>
        <p className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-relaxed text-zinc-300">⚠️ 개인 사본은 최초 저장일부터 30일 후 자동 삭제됩니다. 수정해도 기한은 연장되지 않으므로 필요한 내용은 만료 전에 복사해두세요. 기본 예시는 이 보관 기한과 별개로 계속 제공됩니다.</p>
      </section>

      {/* 5-Step Pipeline */}
      <div className="space-y-6">
        <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-amber-400">⚡</span> 5단계 제작 파이프라인 (Step-by-Step)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">초보자도 1분 만에 따라 할 수 있는 고품질 이미지 생성 프로세스</p>
          </div>
          <span className="text-xs font-bold text-amber-500/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            5 STEPS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map((item, idx) => (
            <div
              key={item.step}
              className={`rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-5 space-y-3 transition-all hover:border-amber-500/40 hover:bg-zinc-900 ${
                idx === 0 ? "lg:col-span-1" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {item.step}
                </span>
                <span className="text-2xl">{item.icon}</span>
              </div>
              <h3 className="text-base font-bold text-white">{item.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4 Golden Tips */}
      <div className="space-y-6">
        <div className="border-b border-zinc-800 pb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-amber-400">💎</span> 실전 이미지 프롬프트 4대 골든 팁
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">공식 프롬프트 규칙(IMAGE_PROMPT_RULES)에 기반한 전문가 생성 가이드</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GOLDEN_TIPS.map((tip) => (
            <div
              key={tip.title}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-2.5 hover:border-zinc-700 transition-colors"
            >
              <div className="inline-block rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/20">
                {tip.badge}
              </div>
              <h3 className="text-sm font-bold text-zinc-100">{tip.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Personal API Key & Security Alert */}
      <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 md:p-6 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <h3 className="text-base font-bold text-amber-300">최상위 불변 원칙: 회원 본인 API 키 연동 및 보안 격리</h3>
            <p className="text-xs text-zinc-400">운영자나 타인의 공용 키로 폴백되지 않으며 오직 본인의 키로만 안전하게 생성됩니다.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-zinc-300">
          <div className="rounded-xl bg-zinc-900/80 p-3 border border-zinc-800">
            <p className="font-bold text-amber-400 mb-1">✓ 무과금 원천 차단</p>
            <p className="text-[11px] text-zinc-400">등록된 키가 없으면 임의로 호출하지 않고 키 등록 창을 띄워 안전을 보장합니다.</p>
          </div>
          <div className="rounded-xl bg-zinc-900/80 p-3 border border-zinc-800">
            <p className="font-bold text-amber-400 mb-1">✓ 30일 생성물 소유권</p>
            <p className="text-[11px] text-zinc-400">생성된 이미지는 회원 본인의 갤러리에만 보관되며 타 회원과 공유되지 않습니다.</p>
          </div>
          <div className="rounded-xl bg-zinc-900/80 p-3 border border-zinc-800">
            <p className="font-bold text-amber-400 mb-1">✓ 브라우저 암호화 저장</p>
            <p className="text-[11px] text-zinc-400">등록한 키는 암호화 세션으로 안전하게 관리되며 언제든 삭제 또는 변경 가능합니다.</p>
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-4">
        <div className="border-b border-zinc-800 pb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-amber-400">❓</span> 자주 묻는 질문 (FAQ)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">이용 전 꼭 알아두어야 할 주요 궁금증을 정리했습니다.</p>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left text-sm font-bold text-zinc-200 hover:text-amber-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-amber-400 font-black">Q.</span>
                    <span>{faq.q}</span>
                  </span>
                  <span className="text-xs text-zinc-500 font-mono ml-2">
                    {isOpen ? "▲ 접기" : "▼ 펼치기"}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/40">
                    <span className="text-amber-400/80 font-bold mr-1">A.</span>
                    {faq.a}
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
