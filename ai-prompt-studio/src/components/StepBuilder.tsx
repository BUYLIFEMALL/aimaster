"use client";

import { useState } from "react";
import {
  Sparkles,
  Bot,
  ListTodo,
  FileCode2,
  ShieldAlert,
  Paperclip,
  Wand2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  FileText,
} from "lucide-react";
import { PromptFormData, PromptMode, CapabilityConstraint } from "@/types/prompt";
import { SuggestType } from "@/lib/prompt-engine";

interface StepBuilderProps {
  formData: PromptFormData;
  onChange: (data: Partial<PromptFormData>) => void;
  onGenerate: () => void;
  onPrevStep: () => void;
  isGenerating: boolean;
  onCallSuggest: (
    type: SuggestType,
    context: { goal: string; role?: string; task?: string }
  ) => Promise<string[] | string>;
}

const CONSTRAINT_OPTIONS: { id: CapabilityConstraint; label: string; desc: string }[] = [
  { id: "WEB_SEARCH", label: "웹 검색 금지", desc: "외부 검색 없이 내부 지식만 사용" },
  { id: "CODE_INTERPRETER", label: "코드 실행 금지", desc: "Python 코드 생성/실행 배제" },
  { id: "IMAGE_GEN", label: "이미지 생성 금지", desc: "DALL-E 등 비주얼 도구 호출 차단" },
  { id: "NO_AI", label: "순수 논리 추론 강제", desc: "도구 의존 없이 오직 문맥 기반 순수 추론" },
];

export function StepBuilder({
  formData,
  onChange,
  onGenerate,
  onPrevStep,
  isGenerating,
  onCallSuggest,
}: StepBuilderProps) {
  const [loadingSuggest, setLoadingSuggest] = useState<SuggestType | null>(null);
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [structureSuggestions, setStructureSuggestions] = useState<string[]>([]);
  const [chainSuggestions, setChainSuggestions] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  // AI 필드별 제안 호출 핸들러
  const handleSuggest = async (type: SuggestType) => {
    if (!formData.goal.trim()) {
      alert("먼저 '1. 목적(Goal)'을 한 줄 이상 입력해주세요.");
      return;
    }

    try {
      setLoadingSuggest(type);
      const res = await onCallSuggest(type, {
        goal: formData.goal,
        role: formData.role,
        task: formData.task,
      });

      if (type === "enhance_goal" && typeof res === "string") {
        onChange({ goal: res });
      } else if (type === "recommend_roles" && Array.isArray(res)) {
        setRoleSuggestions(res);
      } else if (type === "draft_task" && typeof res === "string") {
        onChange({ task: res });
      } else if (type === "suggest_structure" && Array.isArray(res)) {
        setStructureSuggestions(res);
      } else if (type === "suggest_chain" && Array.isArray(res)) {
        setChainSuggestions(res);
      }
    } catch (err: any) {
      alert(err.message || "AI 제안 호출에 실패했습니다.");
    } finally {
      setLoadingSuggest(null);
    }
  };

  // 파일 업로드 처리 (텍스트/마크다운 추출)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        // 기존 작업문에 참고 자료로 부착
        const appendText = `\n\n[첨부 참고 자료 (${file.name})]:\n${text.slice(0, 3000)}`;
        onChange({ task: (formData.task || "") + appendText });
      }
    };
    reader.readAsText(file);
  };

  const toggleConstraint = (c: CapabilityConstraint) => {
    const current = formData.excludedCapabilities || [];
    if (current.includes(c)) {
      onChange({ excludedCapabilities: current.filter((x) => x !== c) });
    } else {
      onChange({ excludedCapabilities: [...current, c] });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 상단 모드 안내 바 */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white font-bold text-xs shadow-xs">
            {formData.mode}
          </div>
          <div>
            <h2 className="text-sm font-black text-neutral-900">
              {formData.mode === "RTSC" && "RTSC 마스터 엔지니어링"}
              {formData.mode === "BUSINESS" && "비즈니스 프레임워크 설계 (CO-STAR, RTF 등)"}
              {formData.mode === "ARCHITECT" && "프롬프트 아키텍트 (Zero-Question 즉시 실행문)"}
              {formData.mode === "VERTEX_XML" && "Vertex AI XML 태그 구조화"}
              {formData.mode === "COT_REASONING" && "논리적 추론(CoT) & 내부 독백 설계"}
            </h2>
            <p className="text-[11px] text-neutral-500">
              각 단계별 AI 실시간 제안 버튼을 활용하여 완성도 높은 메타 프롬프트를 빌드하세요.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onPrevStep}
          className="text-xs text-neutral-500 hover:text-violet-600 font-bold flex items-center gap-1"
        >
          <ArrowLeft size={13} />
          모드 변경
        </button>
      </div>

      {/* Step 1: 목적 (Goal) */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-[11px] font-black">
              1
            </span>
            목적 및 핵심 목표 (Goal)
            <span className="text-rose-500">*</span>
          </label>

          {/* AI 구체화 버튼 */}
          <button
            type="button"
            disabled={loadingSuggest === "enhance_goal"}
            onClick={() => handleSuggest("enhance_goal")}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200/60 transition-all disabled:opacity-50"
          >
            {loadingSuggest === "enhance_goal" ? (
              <Loader2 size={12} className="animate-spin text-violet-600" />
            ) : (
              <Wand2 size={12} className="text-violet-600" />
            )}
            <span>AI 구체화 (배경/의도 확장)</span>
          </button>
        </div>

        <textarea
          value={formData.goal}
          onChange={(e) => onChange({ goal: e.target.value })}
          placeholder="달성하고자 하는 명확한 목적을 입력하세요. (예: 2026년 B2B SaaS 신규 기능 론칭을 위한 콜드메일 시퀀스 3종 기획)"
          rows={3}
          className="w-full rounded-xl border border-neutral-300 bg-neutral-50/30 p-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-200 focus:outline-hidden transition-all shadow-2xs resize-none"
        />
      </div>

      {/* Step 2: 역할 (Role) */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-[11px] font-black">
              2
            </span>
            전문가 페르소나 및 역할 (Role)
          </label>

          {/* 추천 역할 5선 버튼 */}
          <button
            type="button"
            disabled={loadingSuggest === "recommend_roles"}
            onClick={() => handleSuggest("recommend_roles")}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 transition-all disabled:opacity-50"
          >
            {loadingSuggest === "recommend_roles" ? (
              <Loader2 size={12} className="animate-spin text-indigo-600" />
            ) : (
              <Bot size={12} className="text-indigo-600" />
            )}
            <span>추천 역할 5선</span>
          </button>
        </div>

        <input
          type="text"
          value={formData.role || ""}
          onChange={(e) => onChange({ role: e.target.value })}
          placeholder="예: 10년 차 B2B 세일즈 마케팅 디렉터, 글로벌 테크 카피라이터"
          className="w-full rounded-xl border border-neutral-300 bg-neutral-50/30 p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-200 focus:outline-hidden transition-all shadow-2xs"
        />

        {/* AI 추천 역할 칩 리스트 */}
        {roleSuggestions.length > 0 && (
          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
              <span>추천된 전문가 페르소나 (클릭 시 자동 입력):</span>
              <button
                type="button"
                onClick={() => setRoleSuggestions([])}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={12} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {roleSuggestions.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange({ role: r })}
                  className="px-2.5 py-1 text-xs rounded-lg font-bold bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 shadow-2xs transition-all text-left"
                >
                  + {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 3: 세부 작업 지시 (Task) + 파일 첨부 */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-[11px] font-black">
              3
            </span>
            상세 작업 지침 (Task)
          </label>

          <div className="flex items-center gap-2">
            {/* 작업문 자동 작성 버튼 */}
            <button
              type="button"
              disabled={loadingSuggest === "draft_task"}
              onClick={() => handleSuggest("draft_task")}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200/60 transition-all disabled:opacity-50"
            >
              {loadingSuggest === "draft_task" ? (
                <Loader2 size={12} className="animate-spin text-violet-600" />
              ) : (
                <ListTodo size={12} className="text-violet-600" />
              )}
              <span>작업문 자동 작성</span>
            </button>

            {/* 파일 첨부 버튼 */}
            <label className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer transition-all border border-neutral-200">
              <Paperclip size={12} />
              <span>파일 첨부</span>
              <input
                type="file"
                accept=".txt,.md,.json,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {fileName && (
          <div className="flex items-center gap-2 text-xs text-violet-700 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-200">
            <FileText size={13} />
            <span className="font-bold truncate">첨부 완료: {fileName}</span>
            <button
              type="button"
              onClick={() => setFileName(null)}
              className="ml-auto text-neutral-400 hover:text-neutral-600"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <textarea
          value={formData.task || ""}
          onChange={(e) => onChange({ task: e.target.value })}
          placeholder="AI가 수행해야 할 세부 작업 지시사항을 입력하세요. (단계별 프로세스, 질문 항목, 포함할 내용 등)"
          rows={4}
          className="w-full rounded-xl border border-neutral-300 bg-neutral-50/30 p-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-200 focus:outline-hidden transition-all shadow-2xs resize-none font-mono text-xs"
        />
      </div>

      {/* Step 4: 구조화 & 제약조건 (Structure & Chain) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 출력 형식 (Structure) */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
              <FileCode2 size={14} className="text-violet-600" />
              출력 형식 (Structure)
            </label>
            <button
              type="button"
              disabled={loadingSuggest === "suggest_structure"}
              onClick={() => handleSuggest("suggest_structure")}
              className="text-[11px] font-bold text-violet-600 hover:underline disabled:opacity-50"
            >
              + 포맷 추천
            </button>
          </div>
          <input
            type="text"
            value={formData.structure || ""}
            onChange={(e) => onChange({ structure: e.target.value })}
            placeholder="예: 마크다운 표, 번호형 요약 보고서"
            className="w-full rounded-xl border border-neutral-300 bg-neutral-50/30 p-3 text-xs text-neutral-900 focus:border-violet-500 focus:bg-white focus:outline-hidden"
          />
          {structureSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {structureSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange({ structure: s })}
                  className="text-[10px] bg-neutral-100 hover:bg-violet-100 text-neutral-700 px-2 py-0.5 rounded-md font-medium text-left truncate max-w-full"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 제약 및 사고 체인 (Chain) */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-indigo-600" />
              제약 & 사고 체인 (Chain)
            </label>
            <button
              type="button"
              disabled={loadingSuggest === "suggest_chain"}
              onClick={() => handleSuggest("suggest_chain")}
              className="text-[11px] font-bold text-indigo-600 hover:underline disabled:opacity-50"
            >
              + 제약 추천
            </button>
          </div>
          <input
            type="text"
            value={formData.chain || ""}
            onChange={(e) => onChange({ chain: e.target.value })}
            placeholder="예: 답변 전 <thought> 태그 내에서 논리 검토"
            className="w-full rounded-xl border border-neutral-300 bg-neutral-50/30 p-3 text-xs text-neutral-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
          />
          {chainSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {chainSuggestions.map((c, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange({ chain: c })}
                  className="text-[10px] bg-neutral-100 hover:bg-indigo-100 text-neutral-700 px-2 py-0.5 rounded-md font-medium text-left truncate max-w-full"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 모델 기능 제한 (Capability Constraints) */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-amber-600" size={16} />
          <h3 className="text-xs font-black text-neutral-900">
            모델 기능 제한 (Capability Constraints)
          </h3>
          <span className="text-[11px] text-neutral-500">
            생성되는 프롬프트에 도구 호출 금지 지시를 주입합니다
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {CONSTRAINT_OPTIONS.map(({ id, label, desc }) => {
            const isChecked = formData.excludedCapabilities?.includes(id);

            return (
              <div
                key={id}
                onClick={() => toggleConstraint(id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                  isChecked
                    ? "border-amber-500 bg-amber-50/40 shadow-2xs"
                    : "border-neutral-200 bg-neutral-50/30 hover:bg-white"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    isChecked
                      ? "border-amber-600 bg-amber-600 text-white"
                      : "border-neutral-300 bg-white"
                  }`}
                >
                  {isChecked && <Check size={11} strokeWidth={3} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-neutral-900 leading-tight">
                    {label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-neutral-500 leading-tight">
                    {desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 최종 생성 액션 바 */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onPrevStep}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-bold text-xs hover:bg-neutral-100 transition-all"
        >
          <ArrowLeft size={14} />
          <span>이전: 모드 및 프리셋</span>
        </button>

        <button
          type="button"
          disabled={isGenerating || !formData.goal.trim()}
          onClick={onGenerate}
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>메타 프롬프트 정밀 엔지니어링 중...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>✨ 메타 프롬프트 생성하기</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
