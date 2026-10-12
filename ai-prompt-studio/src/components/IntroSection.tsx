"use client";

import { useState } from "react";
import {
  Wand2,
  Layers,
  Sparkles,
  Bot,
  Compass,
  CodeXml,
  Brain,
  Zap,
  ArrowRight,
  BookOpen,
  Filter,
} from "lucide-react";
import { PromptMode, MagicStrategyType } from "@/types/prompt";
import { PROMPT_MODES, PROMPT_PRESETS, PromptPreset } from "@/data/presets";

interface IntroSectionProps {
  currentMode: PromptMode;
  onSelectMode: (mode: PromptMode) => void;
  onApplyPreset: (preset: PromptPreset) => void;
  onQuickMagic: (magicType: MagicStrategyType, rawIdea: string) => void;
  onNextStep: () => void;
}

const MODE_ICONS: Record<PromptMode, any> = {
  RTSC: Bot,
  BUSINESS: Compass,
  ARCHITECT: Wand2,
  VERTEX_XML: CodeXml,
  COT_REASONING: Brain,
  QUICK_ENHANCE: Zap,
};

const CATEGORIES = ["전체", "비즈니스 기획", "개발 / 코딩", "마케팅 / 카피", "데이터 / 분석", "창작 / 글쓰기"];

export function IntroSection({
  currentMode,
  onSelectMode,
  onApplyPreset,
  onQuickMagic,
  onNextStep,
}: IntroSectionProps) {
  const [quickInput, setQuickInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");

  const filteredPresets = PROMPT_PRESETS.filter((p) => {
    if (selectedCategory === "전체") return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 1. 상단: 빠른 프롬프트 만들기 (Quick Magic) */}
      <section className="bg-gradient-to-br from-violet-50 via-white to-indigo-50 border border-violet-100 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
            <Zap size={16} />
          </div>
          <div>
            <h2 className="text-base font-black text-neutral-900">
              ⚡ 빠른 프롬프트 만들기 (Quick Magic)
            </h2>
            <p className="text-xs text-neutral-600">
              복잡한 설정 없이 단 한 줄의 아이디어에 3대 마법 수식을 즉시 적용하여 실행형 프롬프트를 완성합니다.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative">
            <textarea
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="예: 신규 건강기능식품 런칭을 위한 2030 타겟 상세페이지 카피라이팅 기획안을 작성해줘"
              rows={2}
              className="w-full rounded-xl border border-neutral-300 bg-white p-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-hidden transition-all shadow-2xs resize-none"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              disabled={!quickInput.trim()}
              onClick={() => onQuickMagic("INTERVIEW", quickInput)}
              className="group flex flex-col items-start p-3 rounded-xl border border-neutral-200 bg-white hover:border-violet-500 hover:bg-violet-50/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700">
                <Sparkles size={13} className="text-violet-600" />
                <span>1. 역질문 유도 (Interview)</span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500 group-hover:text-neutral-600">
                AI가 질문을 역으로 던져 요구사항을 구체화하도록 유도
              </p>
            </button>

            <button
              type="button"
              disabled={!quickInput.trim()}
              onClick={() => onQuickMagic("AUTO_PERSONA", quickInput)}
              className="group flex flex-col items-start p-3 rounded-xl border border-neutral-200 bg-white hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                <Bot size={13} className="text-indigo-600" />
                <span>2. 페르소나 부여 (Auto Persona)</span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500 group-hover:text-neutral-600">
                주제에 최적화된 최고 권위 전문가 페르소나 자동 매핑
              </p>
            </button>

            <button
              type="button"
              disabled={!quickInput.trim()}
              onClick={() => onQuickMagic("CRITICAL_REFINE", quickInput)}
              className="group flex flex-col items-start p-3 rounded-xl border border-neutral-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <Brain size={13} className="text-emerald-600" />
                <span>3. 비판적 개선 (Critical Refine)</span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500 group-hover:text-neutral-600">
                약점과 한계를 날카롭게 분석·보완하는 메타 지침 생성
              </p>
            </button>
          </div>
        </div>
      </section>

      {/* 2. 중앙: 5대 프로 모드 선택 카드 (스크린샷 5종과 100% 일치) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-violet-600" size={18} />
            <h2 className="text-base font-black text-neutral-900">
              5대 프로 엔지니어링 모드 선택
            </h2>
          </div>
          <span className="text-xs text-neutral-500 font-medium">
            원하는 프롬프트 구조화 방식을 선택하세요
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {PROMPT_MODES.map((modeMeta) => {
            const isSelected = currentMode === modeMeta.id;
            const Icon = MODE_ICONS[modeMeta.id] || Sparkles;

            return (
              <div
                key={modeMeta.id}
                onClick={() => {
                  onSelectMode(modeMeta.id);
                  onNextStep();
                }}
                className={`group relative flex flex-col justify-between p-4 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  isSelected
                    ? "border-violet-600 bg-violet-50/40 shadow-sm ring-2 ring-violet-500/20"
                    : "border-neutral-200 bg-white hover:border-violet-400 hover:shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        isSelected
                          ? "bg-violet-600 text-white shadow-xs"
                          : "bg-neutral-100 text-neutral-600 group-hover:bg-violet-100 group-hover:text-violet-700"
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    {isSelected && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-600 text-white">
                        선택됨
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-black text-neutral-900 group-hover:text-violet-700 transition-colors leading-tight">
                    {modeMeta.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-neutral-500 leading-snug line-clamp-3">
                    {modeMeta.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-violet-600">
                    {modeMeta.id}
                  </span>
                  <span className="text-[11px] font-bold text-violet-700 group-hover:text-violet-900 flex items-center gap-1 transition-colors">
                    시작하기 <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. 하단: 50종 카테고리별 실전 예제 프리셋 라이브러리 */}
      <section className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={18} />
            <div>
              <h3 className="text-sm font-black text-neutral-900">
                실전 검증 프리셋 라이브러리 (50종)
              </h3>
              <p className="text-[11px] text-neutral-500">
                원하는 주제를 클릭하면 4단계 설정값이 즉시 자동으로 채워집니다.
              </p>
            </div>
          </div>

          {/* 카테고리 필터 칩 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={12} className="text-neutral-400" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                  selectedCategory === cat
                    ? "bg-violet-600 text-white shadow-2xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 프리셋 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
          {filteredPresets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                onApplyPreset(preset);
                onNextStep();
              }}
              className="group p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-white hover:border-violet-500 hover:shadow-xs transition-all cursor-pointer text-left flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-200/80 text-neutral-700">
                    {preset.category}
                  </span>
                  <span className="text-[10px] font-mono text-violet-600 font-bold">
                    {preset.mode}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-neutral-900 group-hover:text-violet-700 transition-colors line-clamp-1">
                  {preset.title}
                </h4>
                <p className="mt-1 text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                  {preset.goal}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[11px] text-violet-600 font-bold">
                <span>프리셋 불러오기</span>
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 다음 단계 버튼 */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNextStep}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-sm transition-all"
        >
          <span>2단계: 정밀 엔지니어링 진행하기</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
