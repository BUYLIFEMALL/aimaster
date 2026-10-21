"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Download,
  Lightbulb,
  Sparkles,
  RefreshCw,
  Send,
  Loader2,
  ArrowLeft,
  Share2,
} from "lucide-react";
import { GeneratedPromptResult } from "@/types/prompt";

interface ResultSectionProps {
  result: GeneratedPromptResult | null;
  onFeedback: (feedbackText: string) => void;
  isRefining: boolean;
  onRestart: () => void;
  onBackToEdit: () => void;
  onSaveTemplate?: () => void;
}

export function ResultSection({
  result,
  onFeedback,
  isRefining,
  onRestart,
  onBackToEdit,
  onSaveTemplate,
}: ResultSectionProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState("");

  if (!result) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center max-w-xl mx-auto shadow-2xs space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 mx-auto">
          <Sparkles size={24} />
        </div>
        <h3 className="text-base font-black text-neutral-800">
          아직 생성된 프롬프트가 없습니다
        </h3>
        <p className="text-xs text-neutral-500">
          2단계 정밀 엔지니어링에서 목적을 입력하고 &apos;메타 프롬프트 생성하기&apos;를 눌러주세요.
        </p>
        <button
          type="button"
          onClick={onBackToEdit}
          className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 transition-all shadow-xs"
        >
          엔지니어링 빌더로 이동
        </button>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result.generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result.generatedPrompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meta-prompt-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSendFeedback = () => {
    if (!feedbackInput.trim() || isRefining) return;
    onFeedback(feedbackInput);
    setFeedbackInput("");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 상단 액션 바 */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">
            STEP 3. 메타 프롬프트 완성
          </span>
          <h2 className="text-sm font-black text-neutral-900">
            생성된 완성형 실행 프롬프트
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToEdit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-100 transition-all"
          >
            <ArrowLeft size={13} />
            <span>설정 수정</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-100 transition-all"
          >
            <Download size={13} />
            <span>MD 저장</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black transition-all shadow-xs"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-300" strokeWidth={3} />
                <span>복사 완료!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>원클릭 복사</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 메타 프롬프트 본문 뷰 (화이트 베이스 에디터 스타일) */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-neutral-600">
            Prompt Output (Markdown)
          </span>
          <span className="text-[11px] text-neutral-400">
            ChatGPT · Claude · Gemini 등에 바로 붙여넣어 실행하세요
          </span>
        </div>

        <div className="p-5 font-mono text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed select-text bg-white max-h-[500px] overflow-y-auto">
          {result.generatedPrompt}
        </div>
      </div>

      {/* 설계 논리 및 실전 팁 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 프롬프트 설계 논리 */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-neutral-900">
            <Sparkles size={14} className="text-violet-600" />
            <span>프롬프트 설계 논리 (Engineering Logic)</span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            {result.explanation}
          </p>
        </div>

        {/* 실전 활용 팁 3가지 */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-neutral-900">
            <Lightbulb size={14} className="text-amber-500" />
            <span>실전 활용 팁 3선 (Actionable Tips)</span>
          </div>
          <ul className="space-y-1.5">
            {result.tips?.map((tip, idx) => (
              <li key={idx} className="text-xs text-neutral-600 flex items-start gap-1.5">
                <span className="font-bold text-amber-600 shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 피드백 루프 (Iterative Refinement) */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw size={15} className="text-violet-600" />
          <h3 className="text-xs font-black text-neutral-900">
            피드백 수정 & 재작성 (Iterative Refinement)
          </h3>
        </div>
        <p className="text-[11px] text-neutral-600">
          결과물에서 보완하고 싶은 점을 알려주시면, 기존 프레임워크와 규칙을 유지하면서 맞춤형으로 다시 다듬어 드립니다.
        </p>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={feedbackInput}
            onChange={(e) => setFeedbackInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendFeedback()}
            placeholder="예: 2030 세대의 공감을 이끌 수 있는 어조로 바꿔주고, 영문 번역본을 맨 밑에 추가해줘"
            disabled={isRefining}
            className="flex-1 rounded-xl border border-neutral-300 bg-white p-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 focus:outline-hidden shadow-2xs transition-all"
          />

          <button
            type="button"
            disabled={isRefining || !feedbackInput.trim()}
            onClick={handleSendFeedback}
            className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
          >
            {isRefining ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            <span>수정 요청</span>
          </button>
        </div>
      </div>

      {/* 📁 내 템플릿으로 저장 (2026-10-21 병합 C) — {{변수}}를 넣어 두면 보관함에서 값만 바꿔 다시 실행 */}
      {onSaveTemplate && (
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-center">
          <button
            type="button"
            onClick={onSaveTemplate}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-xs transition-all"
          >
            📁 내 템플릿으로 저장
          </button>
          <p className="text-[11px] text-violet-800">완성한 프롬프트를 보관함에 저장합니다. 바꿔 쓸 부분을 {"{{변수}}"}로 고쳐 두면 다음부터 값만 넣어 바로 실행할 수 있습니다.</p>
        </div>
      )}

      {/* 새 프롬프트 작성하기 */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onRestart}
          className="text-xs text-neutral-500 hover:text-violet-600 font-bold"
        >
          새로운 프롬프트 처음부터 만들기
        </button>
      </div>
    </div>
  );
}
