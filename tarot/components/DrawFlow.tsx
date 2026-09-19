"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SPREAD_CONFIGS,
  CARD_STYLES,
  GEMINI_MODEL_OPTIONS,
  OPENAI_MODEL_OPTIONS,
  type SpreadType,
  type CardStyle,
  drawCards,
  serializeDraw,
} from "@/lib/deck";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

const PROVIDER_LABELS = {
  gemini: "Google Gemini (AI 카드 일러스트 생성)",
  openai: "OpenAI GPT (AI 타로 종합 심층 해석 생성)",
};

const GUIDE_LINKS = [
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
];

export function DrawFlow({
  initialGeminiKey,
  initialOpenaiKey,
}: {
  initialGeminiKey?: string | null;
  initialOpenaiKey?: string | null;
}) {
  const router = useRouter();
  const [spreadType, setSpreadType] = useState<SpreadType>("three_cards");
  const [cardStyle, setCardStyle] = useState<CardStyle>("watercolor");
  const [geminiModel, setGeminiModel] = useState<string>("nanobanana-2-2k");
  const [openaiModel, setOpenaiModel] = useState<string>("gpt-5.6-sol");
  const [question, setQuestion] = useState("");
  const [isShuffling, setIsShuffling] = useState(false);
  const [showApiKeySection, setShowApiKeySection] = useState(
    !initialGeminiKey || !initialOpenaiKey,
  );

  const selectedSpread = SPREAD_CONFIGS[spreadType];

  function handleDraw() {
    if (isShuffling) return;
    setIsShuffling(true);

    window.setTimeout(() => {
      const drawn = drawCards(spreadType);
      const params = new URLSearchParams();
      params.set("cards", serializeDraw(drawn, spreadType, cardStyle));
      if (question.trim()) params.set("q", question.trim().slice(0, 300));
      params.set("gm", geminiModel);
      params.set("om", openaiModel);
      router.push(`/result?${params.toString()}`);
    }, 900);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 타이틀 및 헤더 */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔮</div>
        <h1 className="text-2xl font-black text-neutral-900 mb-2">AIMaster 타로점 리딩</h1>
        <p className="text-sm text-neutral-500 leading-relaxed">
          고민의 깊이와 목적에 맞는 스프레드와 마음이 끌리는 아트 스타일을 선택해보세요.
        </p>
      </div>

      {/* 1. 스프레드 라인업 선택 */}
      <div className="mb-8">
        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
          STEP 1. 타로 스프레드 선택
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(SPREAD_CONFIGS) as SpreadType[]).map((st) => {
            const config = SPREAD_CONFIGS[st];
            const isSelected = spreadType === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setSpreadType(st)}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? "border-neutral-900 bg-neutral-900 text-white shadow-lg scale-[1.01]"
                    : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {config.badge}
                  </span>
                  <span className={`text-xs ${isSelected ? "text-neutral-300" : "text-neutral-400"}`}>
                    {config.cardCount}장
                  </span>
                </div>
                <h3 className="font-bold text-sm mb-1">{config.title}</h3>
                <p
                  className={`text-xs leading-relaxed whitespace-pre-line ${
                    isSelected ? "text-neutral-300" : "text-neutral-500"
                  }`}
                >
                  {config.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 타로 일러스트 아트 스타일 선택 */}
      <div className="mb-8">
        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
          STEP 2. AI 타로 카드 화풍(아트 스타일) 선택
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {(Object.keys(CARD_STYLES) as CardStyle[]).map((cs) => {
            const style = CARD_STYLES[cs];
            const isSelected = cardStyle === cs;
            return (
              <button
                key={cs}
                type="button"
                onClick={() => setCardStyle(cs)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-purple-700 bg-purple-950 text-white shadow-md ring-2 ring-purple-500/20"
                    : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{style.badge}</span>
                </div>
                <h4 className="font-bold text-xs mb-0.5">{style.name}</h4>
                <p
                  className={`text-[11px] leading-tight line-clamp-1 ${
                    isSelected ? "text-purple-200" : "text-neutral-400"
                  }`}
                >
                  {style.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🤖 AI 모델 선택 드롭다운 UI */}
      <div className="mb-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
          ⚙️ AI 모델 선택 (옵션)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              🎨 Gemini 카드 그림 모델
            </label>
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800"
            >
              {GEMINI_MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              ✍️ OpenAI 심층 해석 모델
            </label>
            <select
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800"
            >
              {OPENAI_MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. 질문 입력 (선택) */}
      <div className="mb-8">
        <label htmlFor="question" className="mb-2 block text-xs font-bold text-neutral-500 uppercase tracking-wider">
          STEP 3. 고민 및 질문 입력 (선택)
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="예) 조만간 새로운 프로젝트를 시작하려는데 어떤 마음가짐으로 임하면 좋을까요?"
          className="w-full px-4 py-3 rounded-2xl border border-neutral-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
        />
        <p className="mt-1 text-right text-[11px] text-neutral-400">{question.length}/300</p>
      </div>

      {/* 카드 뽑기 연출 및 버튼 */}
      <div className="flex flex-col items-center gap-4 mb-12">
        <div
          className={`flex gap-[-8px] ${isShuffling ? "card-shuffle-anim" : ""}`}
          aria-hidden="true"
        >
          {Array.from({ length: selectedSpread.cardCount }).map((_, i) => (
            <div
              key={i}
              style={{ marginLeft: i === 0 ? 0 : -20 }}
              className="w-14 h-22 rounded-lg bg-gradient-to-br from-indigo-950 via-purple-900 to-black border-2 border-amber-400/40 shadow-md flex items-center justify-center text-lg"
            >
              🌙
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleDraw}
          disabled={isShuffling}
          className="w-full max-w-sm px-8 py-4 rounded-2xl bg-neutral-900 text-white font-bold text-lg hover:bg-neutral-800 transition-all shadow-xl disabled:opacity-60"
        >
          {isShuffling
            ? "카드를 신비롭게 섞는 중..."
            : `🔮 ${selectedSpread.title} (${selectedSpread.cardCount}장) 카드 뽑기`}
        </button>
      </div>

      {/* 🔑 맨 하단: API 키 등록 및 안내 섹션 */}
      <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔑</span>
            <h2 className="text-sm font-bold text-neutral-900">
              AI 타로 카드 생성 & 심층 해석용 API 키 설정
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowApiKeySection(!showApiKeySection)}
            className="text-xs font-semibold text-purple-700 hover:underline"
          >
            {showApiKeySection ? "접기 ▲" : "등록/수정 열기 ▼"}
          </button>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed mb-4">
          세상에 단 하나뿐인 <strong>AI 타로 카드 일러스트 생성(Google Gemini)</strong>과{" "}
          <strong>AI 종합 심층 해석(OpenAI)</strong>을 받기 위해선 회원 본인의 API 키 등록이 필요합니다.
          <br />
          등록한 키는 본인 계정에 안전하게 저장되며, 키가 등록되어 있어야 결과 페이지에서 고유한 타로 이미지와 종합 해석이 완성됩니다.
        </p>

        {/* 상태 요약 배지 */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              initialGeminiKey
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            🎨 Gemini (그림): {initialGeminiKey ? "등록됨 ✅" : "미등록 ⚠️"}
          </span>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              initialOpenaiKey
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            ✍️ OpenAI (해석): {initialOpenaiKey ? "등록됨 ✅" : "미등록 ⚠️"}
          </span>
        </div>

        {/* API 키 인라인 등록 폼 및 발급 매뉴얼 (토글) */}
        {showApiKeySection && (
          <div className="space-y-4 pt-3 border-t border-purple-100">
            <div className="space-y-3">
              <ApiKeyRow
                provider="gemini"
                label={PROVIDER_LABELS.gemini}
                maskedValue={initialGeminiKey ?? null}
              />
              <ApiKeyRow
                provider="openai"
                label={PROVIDER_LABELS.openai}
                maskedValue={initialOpenaiKey ?? null}
              />
            </div>

            <div className="rounded-xl bg-white p-4 border border-purple-100">
              <p className="text-xs font-bold text-neutral-900 mb-2">📖 키 발급 방법 (팝업 매뉴얼 열기)</p>
              <div className="flex flex-wrap gap-2">
                {GUIDE_LINKS.map((guide) => (
                  <GuideLinkButton key={guide.guideId} guideId={guide.guideId} label={guide.label} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
