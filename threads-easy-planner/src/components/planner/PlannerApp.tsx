"use client";

import { useState, useEffect } from "react";
import {
  getSuggestedTopicsAction,
  generateThreadPlanAction,
  rewriteThreadPlanAction,
} from "@/lib/actions/planner";
import type { TopicSuggestion, ThreadPlanResult, RewriteMode } from "@/types/planner";
import { REWRITE_MODES } from "@/types/planner";
import { TARGET_CATEGORIES } from "@/lib/constants/categories";
import {
  AI_MODEL_OPTIONS,
  DEFAULT_AI_MODELS,
  PROVIDER_SHORT_LABELS,
  type AIModelProvider,
} from "@/lib/ai/models";

export function PlannerApp() {
  // 상태 관리
  const [topicInput, setTopicInput] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // AI 추론 엔진 및 모델 선택 상태
  const [selectedProvider, setSelectedProvider] = useState<AIModelProvider>("openai");
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4.1");
  const [missingProviderName, setMissingProviderName] = useState<string | null>(null);

  // 로딩 상태
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [activeRewriteMode, setActiveRewriteMode] = useState<RewriteMode | null>(null);

  // 데이터
  const [suggestedTopics, setSuggestedTopics] = useState<TopicSuggestion[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ThreadPlanResult | null>(null);
  const [usedModelLabel, setUsedModelLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [needApiKeyModal, setNeedApiKeyModal] = useState(false);

  // localStorage에서 이전에 선택한 AI 엔진 및 모델 복원
  useEffect(() => {
    try {
      const savedProvider = localStorage.getItem("threads_planner_provider") as AIModelProvider | null;
      const savedModel = localStorage.getItem("threads_planner_model");
      if (savedProvider && ["openai", "gemini", "anthropic"].includes(savedProvider)) {
        setSelectedProvider(savedProvider);
        if (savedModel && AI_MODEL_OPTIONS.some((o) => o.value === savedModel && o.provider === savedProvider)) {
          setSelectedModel(savedModel);
        } else {
          setSelectedModel(DEFAULT_AI_MODELS[savedProvider]);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  function handleSelectProvider(provider: AIModelProvider) {
    setSelectedProvider(provider);
    const defaultModel = DEFAULT_AI_MODELS[provider];
    setSelectedModel(defaultModel);
    try {
      localStorage.setItem("threads_planner_provider", provider);
      localStorage.setItem("threads_planner_model", defaultModel);
    } catch {
      // ignore
    }
  }

  function handleSelectModel(modelVal: string) {
    setSelectedModel(modelVal);
    try {
      localStorage.setItem("threads_planner_model", modelVal);
    } catch {
      // ignore
    }
  }

  // 1. "오늘 뭐 쓰지?" 카테고리 기반 주제 추천
  async function handleSuggestTopics(categoryId?: string) {
    const targetCat = categoryId || selectedCategory || "tips";
    setSelectedCategory(targetCat);
    setShowCategoryPicker(true);
    setIsSuggesting(true);
    setErrorMessage(null);
    try {
      const res = await getSuggestedTopicsAction(targetCat, topicInput.trim() || undefined, {
        provider: selectedProvider,
        model: selectedModel,
      });
      if (res.needApiKey) {
        setMissingProviderName(res.missingProvider ? PROVIDER_SHORT_LABELS[res.missingProvider] : PROVIDER_SHORT_LABELS[selectedProvider]);
        setNeedApiKeyModal(true);
        return;
      }
      if (!res.success || !res.data) {
        setErrorMessage(res.error || "주제 추천에 실패했습니다.");
        return;
      }
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length === 0) {
        setErrorMessage("추천 주제를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      setSuggestedTopics(list);
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSuggesting(false);
    }
  }

  // 2. 추천 주제 선택 후 즉시 글 생성
  async function handleSelectTopicAndGenerate(selectedTopic: string) {
    setTopicInput(selectedTopic);
    await handleGenerate(selectedTopic);
  }

  // 3. 글 생성 실행
  async function handleGenerate(targetTopic?: string) {
    const topicToUse = targetTopic || topicInput;
    if (!topicToUse.trim()) {
      setErrorMessage("주제를 입력하거나 아래 '오늘 뭐 쓰지?'에서 추천 주제를 골라주세요.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const res = await generateThreadPlanAction(topicToUse, undefined, {
        provider: selectedProvider,
        model: selectedModel,
      });
      if (res.needApiKey) {
        setMissingProviderName(res.missingProvider ? PROVIDER_SHORT_LABELS[res.missingProvider] : PROVIDER_SHORT_LABELS[selectedProvider]);
        setNeedApiKeyModal(true);
        return;
      }
      if (!res.success || !res.data) {
        setErrorMessage(res.error || "글 생성에 실패했습니다.");
        return;
      }
      setCurrentPlan(res.data);
      const activeModelObj = AI_MODEL_OPTIONS.find((o) => o.value === selectedModel);
      setUsedModelLabel(activeModelObj ? activeModelObj.shortLabel : selectedModel);
      // 생성 후 추천 목록은 닫고 결과 화면에 집중
      setShowCategoryPicker(false);
    } catch {
      setErrorMessage("글 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }

  // 4. 7종 "다시 써줘" 원클릭 리라이팅
  async function handleRewrite(mode: RewriteMode) {
    if (!currentPlan) return;

    setIsRewriting(true);
    setActiveRewriteMode(mode);
    setErrorMessage(null);
    try {
      const res = await rewriteThreadPlanAction(currentPlan, mode, {
        provider: selectedProvider,
        model: selectedModel,
      });
      if (res.needApiKey) {
        setMissingProviderName(res.missingProvider ? PROVIDER_SHORT_LABELS[res.missingProvider] : PROVIDER_SHORT_LABELS[selectedProvider]);
        setNeedApiKeyModal(true);
        return;
      }
      if (!res.success || !res.data) {
        setErrorMessage(res.error || "다시 쓰기에 실패했습니다.");
        return;
      }
      setCurrentPlan(res.data);
      const activeModelObj = AI_MODEL_OPTIONS.find((o) => o.value === selectedModel);
      setUsedModelLabel(activeModelObj ? activeModelObj.shortLabel : selectedModel);
      showCopyToast("새로운 버전으로 다시 작성되었습니다!");
    } catch {
      setErrorMessage("다시 쓰기 중 오류가 발생했습니다.");
    } finally {
      setIsRewriting(false);
      setActiveRewriteMode(null);
    }
  }

  // 복사 헬퍼
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    showCopyToast(`📋 ${label} 클립보드에 복사되었습니다!`);
  }

  function showCopyToast(msg: string) {
    setCopySuccess(msg);
    setTimeout(() => setCopySuccess(null), 2500);
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-16">
      {/* 토스트 알림 */}
      {copySuccess && (
        <div className="fixed top-6 right-6 z-50 rounded-xl bg-neutral-900 text-white px-4 py-2.5 text-sm font-medium shadow-xl border border-neutral-700 animate-in fade-in slide-in-from-top-2">
          {copySuccess}
        </div>
      )}

      {/* 에러 알림 */}
      {errorMessage && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-semibold ml-4"
          >
            닫기
          </button>
        </div>
      )}

      {/* 메인 히어로 & 주제 입력 영역 */}
      <section className="text-center pt-2 md:pt-6 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-700">
          <span>⚡ 초보자 맞춤형</span>
          <span className="text-neutral-300">•</span>
          <span>원클릭 스레드 기획</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-neutral-900 tracking-tight">
          오늘 스레드 뭐 쓰지? 🤔
        </h1>
        <p className="text-sm md:text-base text-neutral-500 max-w-xl mx-auto leading-relaxed">
          고민하지 마세요. 주제를 입력하거나 버튼 하나만 누르면,
          <br className="hidden sm:block" />
          피드를 멈추는 <strong>첫 문장 후킹부터 본문, 댓글 CTA까지</strong> 3초 만에 완성됩니다.
        </p>
      </section>

      {/* 핵심 인터랙션 바: 주제 입력 + 오늘 뭐 쓰지? 버튼 + 생성 버튼 + 하단 AI 모델 선택기 */}
      <div className="rounded-3xl bg-white p-4 md:p-6 shadow-sm border border-neutral-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  handleGenerate();
                }
              }}
              placeholder="예: 자취 꿀템, 월요병 극복법, 챗GPT 업무 활용 (비워두고 버튼 클릭 가능)"
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/50 px-4 py-3.5 text-base text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 transition-all"
            />
            {topicInput && (
              <button
                type="button"
                onClick={() => setTopicInput("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-sm"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 오늘 뭐 쓰지? 버튼 */}
            <button
              type="button"
              onClick={() => {
                const cat = selectedCategory || "tips";
                handleSuggestTopics(cat);
              }}
              disabled={isSuggesting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-3.5 text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <span>{isSuggesting ? "⏳" : "🎲"}</span>
              <span>{isSuggesting ? "추천 중..." : "오늘 뭐 쓰지?"}</span>
            </button>

            {/* 글 생성 버튼 */}
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isGenerating || (!topicInput.trim() && suggestedTopics.length === 0)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold px-6 py-3.5 text-sm transition-all shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              <span>{isGenerating ? "✍️" : "✨"}</span>
              <span>{isGenerating ? "작성 중..." : "글 생성하기"}</span>
            </button>
          </div>
        </div>

        {/* 🎲오늘 뭐 쓰지? ✨글 생성하기 하단 추론 모델 선택 패널 */}
        <div className="rounded-2xl bg-neutral-50/90 p-3.5 md:p-4 border border-neutral-200/90 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
              <span>🤖</span>
              <span>사용할 AI 추론 엔진 및 세부 모델 선택</span>
            </span>
            <span className="text-[11px] text-neutral-500 font-medium">
              현재 설정: <strong className="text-neutral-900 font-bold">{AI_MODEL_OPTIONS.find((o) => o.value === selectedModel)?.shortLabel || selectedModel}</strong>
            </span>
          </div>

          {/* 3대 Provider 선택 버튼 (OpenAI / Gemini / Claude) */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleSelectProvider("openai")}
              className={`rounded-xl p-2.5 border font-bold text-center flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedProvider === "openai"
                  ? "border-neutral-900 bg-neutral-900 text-white shadow-xs"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span className="text-base">🤖</span>
              <span className="text-xs leading-none">OpenAI (GPT)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectProvider("gemini")}
              className={`rounded-xl p-2.5 border font-bold text-center flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedProvider === "gemini"
                  ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span className="text-base">✨</span>
              <span className="text-xs leading-none">Google Gemini</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectProvider("anthropic")}
              className={`rounded-xl p-2.5 border font-bold text-center flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedProvider === "anthropic"
                  ? "border-purple-600 bg-purple-600 text-white shadow-xs"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span className="text-base">🧠</span>
              <span className="text-xs leading-none">Anthropic Claude</span>
            </button>
          </div>

          {/* 세부 실행 모델 드롭다운 셀렉터 */}
          <div className="pt-2 border-t border-neutral-200/60 flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-[11px] font-bold text-neutral-600 sm:w-44 flex-shrink-0 flex items-center gap-1">
              <span>🎯</span>
              <span>{PROVIDER_SHORT_LABELS[selectedProvider]} 세부 모델:</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => handleSelectModel(e.target.value)}
              className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 focus:border-neutral-900 focus:outline-none shadow-xs cursor-pointer"
            >
              {AI_MODEL_OPTIONS.filter((opt) => opt.provider === selectedProvider).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 오늘 뭐 쓰지? 카테고리 칩 선택 & 10개 추천 주제 영역 */}
        {showCategoryPicker && (
          <div className="pt-4 border-t border-neutral-100 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                💡 관심 있는 업종/타깃을 골라보세요
              </span>
              <button
                type="button"
                onClick={() => setShowCategoryPicker(false)}
                className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                접기 ▲
              </button>
            </div>

            {/* 카테고리 칩 목록 */}
            <div className="flex flex-wrap gap-2">
              {TARGET_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      handleSuggestTopics(cat.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-neutral-900 text-white shadow-sm"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* 추천된 10개 주제 목록 */}
            {isSuggesting ? (
              <div className="py-8 text-center space-y-2">
                <div className="inline-block animate-spin text-2xl">🌀</div>
                <div className="text-sm font-semibold text-neutral-600">
                  스레드에서 지금 가장 핫한 주제 10개를 발굴하고 있어요...
                </div>
              </div>
            ) : suggestedTopics.length > 0 ? (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-500">🔥</span>
                    <span>추천 주제를 클릭하면 바로 글이 완성됩니다! (10선)</span>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-normal">
                    원하는 주제를 클릭해보세요
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {suggestedTopics.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      type="button"
                      onClick={() => handleSelectTopicAndGenerate(item.topic)}
                      className="text-left rounded-2xl border border-neutral-200 bg-neutral-50/60 p-3.5 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all group flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 group-hover:bg-neutral-800 group-hover:text-amber-300">
                            #{idx + 1}
                          </span>
                          <span className="text-xs text-neutral-400 group-hover:text-neutral-300">
                            {item.whyItWorks}
                          </span>
                        </div>
                        <div className="font-bold text-sm text-neutral-900 group-hover:text-white leading-snug">
                          {item.topic}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-neutral-500 group-hover:text-neutral-300 italic truncate">
                        &quot;{item.hookPreview}&quot;
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 로딩 표시 */}
      {isGenerating && (
        <div className="rounded-3xl bg-white border border-neutral-200 p-12 text-center space-y-4 shadow-sm animate-pulse">
          <div className="text-4xl">✍️</div>
          <div className="text-lg font-bold text-neutral-800">
            {PROVIDER_SHORT_LABELS[selectedProvider]} ({AI_MODEL_OPTIONS.find(o => o.value === selectedModel)?.shortLabel || selectedModel}) 맞춤 글을 작성하고 있어요...
          </div>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            1초 만에 스크롤을 멈추는 첫 문장 후킹, 모바일 최적화 줄바꿈, 댓글 유도 질문까지 한번에 기획 중입니다.
          </p>
        </div>
      )}

      {/* 글 생성 결과 카드 (5단 구성) */}
      {currentPlan && !isGenerating && (
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* 카드 헤더: 주제명 & 모델 배지 & 전체 복사 액션 */}
          <div className="bg-neutral-900 text-white p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                  <span>🎯 기획 완료 주제</span>
                </span>
                {usedModelLabel && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {usedModelLabel}
                  </span>
                )}
              </div>
              <h2 className="text-lg md:text-xl font-bold tracking-tight">
                {currentPlan.topic}
              </h2>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `${currentPlan.content}\n\n[첫 댓글/CTA]\n${currentPlan.cta}`,
                    "전체 스레드 세트가"
                  )
                }
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-neutral-900 font-bold px-4 py-2.5 text-xs hover:bg-neutral-100 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <span>📋</span>
                <span>전체 복사</span>
              </button>
            </div>
          </div>

          <div className="p-5 md:p-8 space-y-6">
            {/* 1. 첫 문장 후킹 박스 */}
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4 md:p-5 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-800 inline-flex items-center gap-1.5">
                  <span>⚡ 1. 첫 문장 후킹 (1초 만에 피드 멈춤)</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentPlan.hook, "후킹 문장이")}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                >
                  복사하기
                </button>
              </div>
              <p className="text-base md:text-lg font-black text-neutral-900 leading-snug">
                &ldquo;{currentPlan.hook}&rdquo;
              </p>
            </div>

            {/* 2. 전체 글 본문 박스 (모바일 스레드 스타일 미리보기) */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-4 md:p-6 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60">
                <span className="text-xs font-bold text-neutral-700 inline-flex items-center gap-1.5">
                  <span>📝 2. 스레드 전체 본문</span>
                  <span className="text-[11px] text-neutral-400 font-normal">
                    (공백 포함 약 {currentPlan.content.length}자)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentPlan.content, "본문이")}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:underline cursor-pointer"
                >
                  본문만 복사
                </button>
              </div>

              {/* 스레드 포스팅 뷰 */}
              <div className="whitespace-pre-line text-sm md:text-base text-neutral-800 leading-relaxed font-sans pt-1">
                {currentPlan.content}
              </div>
            </div>

            {/* 3. 마지막 댓글/CTA 박스 */}
            <div className="rounded-2xl bg-blue-50/70 border border-blue-200/70 p-4 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-900 inline-flex items-center gap-1.5">
                  <span>💬 3. 마지막 댓글 / CTA (알고리즘 폭발 유도)</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentPlan.cta, "댓글/CTA가")}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                >
                  복사하기
                </button>
              </div>
              <p className="text-sm md:text-base font-semibold text-blue-950">
                👉 {currentPlan.cta}
              </p>
              <p className="text-[11px] text-blue-600/80 mt-1">
                * 본문 마지막 줄에 덧붙이거나, 첫 번째 댓글로 바로 남겨 독자 참여를 유도하세요.
              </p>
            </div>

            {/* 4. 이어질 후속 콘텐츠 5개 */}
            {currentPlan.followUpIdeas && currentPlan.followUpIdeas.length > 0 && (
              <div className="rounded-2xl bg-neutral-50 border border-neutral-200/80 p-4 md:p-5 space-y-3">
                <div className="text-xs font-bold text-neutral-700 inline-flex items-center gap-1.5">
                  <span>💡 4. 이 글과 이어서 작성할 후속 콘텐츠 (5선)</span>
                </div>
                <ul className="space-y-2">
                  {currentPlan.followUpIdeas.map((idea, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs md:text-sm text-neutral-700 hover:text-neutral-900"
                    >
                      <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-neutral-800 text-[11px] font-bold mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug pt-0.5">{idea}</span>
                      <button
                        type="button"
                        onClick={() => handleSelectTopicAndGenerate(idea)}
                        className="text-[11px] text-neutral-400 hover:text-neutral-900 font-semibold underline ml-auto flex-shrink-0 cursor-pointer"
                      >
                        이 주제로 글 쓰기 →
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 5. 7종 "다시 써줘" 원클릭 리라이팅 영역 */}
            <div className="pt-6 border-t border-neutral-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <span>🔄</span>
                  <span>마음에 들 때까지 원클릭으로 다시 쓰기</span>
                </div>
                {isRewriting && (
                  <span className="text-xs font-semibold text-amber-600 animate-pulse">
                    ✨ {activeRewriteMode ? REWRITE_MODES.find(m => m.mode === activeRewriteMode)?.label : "수정"} 중...
                  </span>
                )}
              </div>

              {/* 7개 버튼 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {REWRITE_MODES.map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    disabled={isRewriting}
                    onClick={() => handleRewrite(item.mode)}
                    title={item.desc}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white p-2.5 text-center text-xs font-bold text-neutral-800 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all active:scale-95 disabled:opacity-50 group cursor-pointer"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-[11px] leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API 키 등록 유도 모달 */}
      {needApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 space-y-5 text-center shadow-2xl animate-in zoom-in-95">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
              🔑
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-neutral-900">
                {missingProviderName || PROVIDER_SHORT_LABELS[selectedProvider]} API 키 등록이 필요합니다
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                스레드 글 생성을 위해 회원 본인의 {missingProviderName || PROVIDER_SHORT_LABELS[selectedProvider]} API 키를 등록해주세요.
                (엔진은 무료 제공되며, 연료는 본인 키를 사용합니다)
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href="/settings"
                className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white hover:bg-black transition-colors"
              >
                API키 등록하러 가기
              </a>
              <button
                type="button"
                onClick={() => setNeedApiKeyModal(false)}
                className="w-full rounded-xl py-2.5 text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
