"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Heart,
  ImageIcon,
  Maximize2,
  PenLine,
  Download,
  Key,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Type,
  Camera,
  Layers,
} from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "생성된 글귀 이미지는 상업적/SNS에 자유롭게 사용할 수 있나요?",
    a: "네! 회원님께서 생성하신 글귀와 이미지는 인스타그램 피드, 릴스, 유튜브 쇼츠, 카카오톡 프로필, 블로그 등에 자유롭게 업로드하고 사용하실 수 있습니다. Pixabay·Pexels 배경 사진은 각 사이트의 라이선스에 따라 무료로 쓸 수 있으며(사진의 「원본 보기」에서 조건을 확인해 주세요), AI 나노바나나 이미지는 회원님 본인의 Gemini API 키로 생성되어 온전히 회원님께 귀속됩니다.",
  },
  {
    q: "AI 나노바나나 이미지와 Pixabay·Pexels 무료 사진의 차이는 무엇인가요?",
    a: "Pixabay·Pexels 사진은 전 세계 전문 사진작가들이 촬영한 실사 풍경, 카페, 노을, 바다 등 고해상도 실사 이미지를 즉시 검색·적용할 수 있습니다. 반면 AI 나노바나나(`gemini-nano-banana-2.1`)는 선택하신 감성 글귀의 시적 분위기에 맞추어 세상에 단 하나뿐인 독창적인 감성 일러스트 및 배경을 즉석에서 직접 그려냅니다.",
  },
  {
    q: "인스타그램 릴스나 틱톡에 올리려면 어떤 비율이 좋은가요?",
    a: "숏폼(인스타그램 릴스, 유튜브 쇼츠, 틱톡)이나 스마트폰 배경화면으로 사용하시려면 [9:16] 세로형 비율을 권장합니다. 일반 인스타그램 피드나 카카오톡 공유용으로는 [1:1] 정방형 비율이 가장 안정적이고 가독성이 뛰어납니다.",
  },
  {
    q: "다운로드한 이미지가 서버에 남지 않고 안전한가요?",
    a: "본 프로그램의 글귀 합성 및 렌더링은 100% 회원님의 웹 브라우저(HTML5 Canvas API) 내부에서 온디바이스로 처리됩니다. 작업하신 문구와 이미지는 외부 서버로 전송되거나 저장되지 않으므로 개인정보와 창작물이 완벽하게 보호됩니다.",
  },
  {
    q: "Google Gemini API 키는 어디에 쓰이고 비용은 어떻게 되나요?",
    a: "감성 글귀 텍스트 생성과 AI 나노바나나 이미지 생성 시에만 회원님 본인의 Google Gemini API 키가 사용됩니다. Google AI Studio에서 제공하는 무료 할당량(Free Tier) 범위 내에서 충분히 이용하실 수 있어 추가 과금 부담 없이 감성 카드를 제작할 수 있습니다.",
  },
];

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* 히어로 비주얼 배너 */}
      <div className="relative overflow-hidden rounded-3xl border border-[#e7e0d3] bg-gradient-to-br from-[#ffffff] via-[#fcfaf5] to-[#f7f2e8] p-6 sm:p-10 shadow-sm">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-rose-200/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 right-24 h-64 w-64 rounded-full bg-amber-200/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-bold text-rose-700">
            <Heart className="h-3.5 w-3.5 fill-rose-500/30 text-rose-600" />
            <span>Emotion Calligraphy Studio Master Guide</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 leading-tight">
            마음을 울리는 감성 글귀 & 캘리그라피
            <br />
            <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">
              완벽 카드뉴스 제작 가이드북
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            주제 선택부터 AI 감성 카피라이팅, Pixabay·Pexels 및 나노바나나 배경 매칭, 그리고 브라우저 온디바이스 캘리그라피 캔버스 렌더링까지 이어지는 5단계 제작 노하우를 안내합니다.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:brightness-105 transition-all"
            >
              <PenLine className="h-4 w-4" />
              <span>글귀 제작 스튜디오 입장</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-[#ded6c8] bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-[#fbf8f1] transition-all"
            >
              <Key className="h-3.5 w-3.5 text-amber-600" />
              <span>Gemini API 키 설정 콘솔</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 5단계 파이프라인 다이어그램 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          <h2 className="text-base font-bold text-stone-900">5단계 감성 글귀 제작 파이프라인</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* STEP 1 */}
          <div className="rounded-2xl border border-[#e7e0d3] bg-white p-5 space-y-3 shadow-2xs hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-rose-600">STEP 01</span>
              <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-stone-900">감성 주제 선택</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              인생명언, 따뜻한 위로, 새벽 감성 등 프리셋을 고르거나 직접 원하는 주제를 입력합니다.
            </p>
          </div>

          {/* STEP 2 */}
          <div className="rounded-2xl border border-[#e7e0d3] bg-white p-5 space-y-3 shadow-2xs hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-rose-600">STEP 02</span>
              <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                <ImageIcon className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-stone-900">배경 소스 지정</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              AI 나노바나나 독창 일러스트 또는 Pixabay·Pexels 무료 고해상도 감성 사진 중 선택합니다.
            </p>
          </div>

          {/* STEP 3 */}
          <div className="rounded-2xl border border-[#e7e0d3] bg-white p-5 space-y-3 shadow-2xs hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-rose-600">STEP 03</span>
              <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                <Maximize2 className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-stone-900">화면 비율 결정</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              9:16 릴스/쇼츠 세로형, 1:1 인스타그램 정방형 피드 중 목적에 맞게 지정합니다.
            </p>
          </div>

          {/* STEP 4 */}
          <div className="rounded-2xl border border-[#e7e0d3] bg-white p-5 space-y-3 shadow-2xs hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-rose-600">STEP 04</span>
              <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                <PenLine className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-stone-900">글귀 생성 & 편집</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              원하는 줄 수(5~8줄)를 정하고 AI로 생성된 감성 문구 중 마음에 드는 글귀를 선택·수정합니다.
            </p>
          </div>

          {/* STEP 5 */}
          <div className="rounded-2xl border border-[#e7e0d3] bg-white p-5 space-y-3 shadow-2xs hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-rose-600">STEP 05</span>
              <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                <Download className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-stone-900">완성 & 고화질 저장</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              서체, 글자 크기, 어두운 오버레이 강도를 조절한 후 브라우저에서 무손실 PNG/JPG로 다운로드합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 캘리그라피 서체 & 배경 가이드 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 서체 가이드 */}
        <div className="rounded-2xl border border-[#e7e0d3] bg-white p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 text-stone-900">
            <Type className="h-5 w-5 text-rose-600" />
            <h3 className="text-sm font-bold">감성 캘리그라피 서체 추천 매칭</h3>
          </div>
          <div className="space-y-3 text-xs text-stone-600 leading-relaxed">
            <div className="rounded-xl border border-[#ede6db] bg-[#fdfbf7] p-3 space-y-1">
              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[10px] text-rose-800">나눔명조</span>
                <span>클래식한 시, 인생 철학, 묵직한 명언</span>
              </div>
              <p className="text-stone-500 text-[11.5px]">
                단정하고 격조 높은 붓글씨의 획이 살아있어 시문학이나 묵직한 인생 조언 카드에 가장 잘 어울립니다.
              </p>
            </div>

            <div className="rounded-xl border border-[#ede6db] bg-[#fdfbf7] p-3 space-y-1">
              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] text-amber-800">나눔손글씨 펜</span>
                <span>따뜻한 위로, 다정한 편지, 일상 공감</span>
              </div>
              <p className="text-stone-500 text-[11.5px]">
                손으로 직접 쓴 듯한 자연스러운 필기체로 지친 마음을 다독이는 힐링 글귀에 최적화되어 있습니다.
              </p>
            </div>

            <div className="rounded-xl border border-[#ede6db] bg-[#fdfbf7] p-3 space-y-1">
              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                <span className="rounded bg-stone-200 px-1.5 py-0.2 text-[10px] text-stone-800">고운돋움 / 기본고딕</span>
                <span>현대적인 에세이, 자기계발 명언</span>
              </div>
              <p className="text-stone-500 text-[11.5px]">
                깔끔하고 가독성이 좋아 인스타그램 피드나 카드뉴스 형태의 직관적인 전달에 매우 효과적입니다.
              </p>
            </div>
          </div>
        </div>

        {/* 배경 이미지 활용법 */}
        <div className="rounded-2xl border border-[#e7e0d3] bg-white p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 text-stone-900">
            <Camera className="h-5 w-5 text-rose-600" />
            <h3 className="text-sm font-bold">무료 사진(Pixabay·Pexels) vs 나노바나나 배경 활용 노하우</h3>
          </div>
          <div className="space-y-3 text-xs text-stone-600 leading-relaxed">
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>오버레이 어둡기 조절 필수:</strong> 사진 배경이 밝을 경우 글자가 묻힐 수 있습니다. [디자인 패널]에서 어둡기 슬라이더를 30%~50% 정도로 설정하면 글귀의 시인성이 대폭 상승합니다.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>무료 실사 사진(Pixabay·Pexels):</strong> 노을, 바다, 잔잔한 호수, 창가의 커피 등 서정적인 실사 분위기를 원할 때 강력 추천합니다.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>AI 나노바나나 수채화 감성:</strong> 글귀의 은유적 표현(예: 별이 쏟아지는 밤, 아침 안개 속 등대)을 세상에 단 하나뿐인 예술적인 일러스트로 표현할 수 있습니다.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 100% 온디바이스 로컬 보안 안내 */}
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 to-orange-50/50 p-6 space-y-3">
        <div className="flex items-center gap-2 text-amber-900">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          <h3 className="text-sm font-bold">100% 온디바이스(Canvas) 로컬 프라이버시 보안</h3>
        </div>
        <p className="text-xs text-amber-950/90 leading-relaxed">
          AIMaster는 회원의 창작물을 서버에 무단 수집하거나 저장하지 않습니다.
          <br />
          본 프로그램의 모든 글귀 렌더링과 이미지 합성은 브라우저 내부(HTML5 Canvas)에서 100% 로컬로 즉시 처리되어 다운로드되므로, 회원님의 비밀 글귀나 창작 콘텐츠가 안전하게 보호됩니다.
        </p>
      </div>

      {/* FAQ 아코디언 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-rose-600" />
          <h2 className="text-base font-bold text-stone-900">자주 묻는 질문 (FAQ)</h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-[#e7e0d3] bg-white transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-4 text-left text-xs sm:text-sm font-bold text-stone-900 hover:text-rose-600"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${
                      isOpen ? "rotate-180 text-rose-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#f0e9dc] bg-[#fdfbf7] p-4 text-xs text-stone-600 leading-relaxed">
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
