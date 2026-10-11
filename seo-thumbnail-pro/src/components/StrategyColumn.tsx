"use client";

import React, { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Search,
  Loader2,
  CheckCircle2,
  Share2,
} from "lucide-react";
import {
  SeoStrategy,
  ComprehensiveMetadata,
  StrategyResponse,
} from "@/types/thumbnail";

interface StrategyColumnProps {
  script: string;
  onScriptChange: (val: string) => void;
  isGeneratingStrategies: boolean;
  onGenerateStrategies: () => void;
  strategies: SeoStrategy[];
  comprehensive: ComprehensiveMetadata | null;
  onApplyStrategy: (strat: SeoStrategy) => void;
  // 직접 SEO 분석
  seoRawText: string;
  onSeoRawTextChange: (val: string) => void;
  isAnalyzingSeo: boolean;
  onAnalyzeSeo: () => void;
}

export default function StrategyColumn({
  script,
  onScriptChange,
  isGeneratingStrategies,
  onGenerateStrategies,
  strategies,
  comprehensive,
  onApplyStrategy,
  seoRawText,
  onSeoRawTextChange,
  isAnalyzingSeo,
  onAnalyzeSeo,
}: StrategyColumnProps) {
  const [openStrategyIdx, setOpenStrategyIdx] = useState<number | null>(0);
  const [isDirectSeoOpen, setIsDirectSeoOpen] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [appliedIdx, setAppliedIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) onScriptChange(content);
      };
      reader.readAsText(file);
    }
  };

  const handleCopyAll = () => {
    if (strategies.length === 0) return;

    let fullText = strategies
      .map(
        (s, idx) => `[전략 ${idx + 1}: ${s.strategy}]
최적화된 제목: ${s.title}
SEO 설명: ${s.description}
해시태그: ${s.tags}
유튜브 스튜디오 전용 태그(500자): ${s.studioTags}
고정 댓글 전략: ${s.pinnedComment}
시각적 구성안: ${s.visualStrategy}`
      )
      .join("\n\n" + "=".repeat(40) + "\n\n");

    if (comprehensive) {
      fullText += `\n\n${"=".repeat(40)}\n\n[공통/포괄적 메타데이터]
포괄적인 영상 설명:
${comprehensive.description}

핵심 해시태그:
${comprehensive.tags}

핵심 키워드:
${comprehensive.keywords}

고정 댓글 활용 전략:
${comprehensive.pinnedComment}`;
    }

    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleApply = (strat: SeoStrategy, idx: number) => {
    onApplyStrategy(strat);
    setAppliedIdx(idx);
    setTimeout(() => setAppliedIdx(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 flex flex-col gap-5">
      {/* Step Header */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
          1
        </div>
        <div className="flex items-center gap-1.5 text-slate-900 font-bold text-base">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h2>기획 및 전략</h2>
        </div>
      </div>

      {/* Script Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            대본 또는 기획안 입력
          </label>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            파일 업로드 (.txt, .md)
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.md"
            className="hidden"
          />
        </div>

        <textarea
          rows={5}
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          placeholder="유튜브 대본이나 영상 아이디어, 요약본을 입력하세요. AI가 성공 공식을 반영한 3가지 A/B 테스트 전략과 태그를 제안합니다."
          className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none resize-none transition-all placeholder:text-slate-400"
        />

        {/* Generate Button */}
        <button
          onClick={onGenerateStrategies}
          disabled={isGeneratingStrategies || !script.trim()}
          className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
        >
          {isGeneratingStrategies ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>3대 A/B 전략 생성 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>A/B 테스트 전략 생성</span>
            </>
          )}
        </button>
      </div>

      {/* Generated Strategies List */}
      {strategies.length > 0 && (
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              제안된 전략 (A/B/C)
            </span>
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAll ? "복사됨" : "전체 복사"}
            </button>
          </div>

          <div className="space-y-2.5">
            {strategies.map((strat, idx) => {
              const isOpen = openStrategyIdx === idx;
              const isApplied = appliedIdx === idx;

              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 transition-all hover:border-slate-300"
                >
                  <button
                    onClick={() => setOpenStrategyIdx(isOpen ? null : idx)}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-600 text-white text-[11px] font-extrabold flex items-center justify-center">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {strat.strategy}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="p-3.5 pt-0 space-y-3 text-xs border-t border-slate-100 bg-white">
                      <div>
                        <span className="font-bold text-indigo-700 block mb-0.5">최적화된 제목</span>
                        <p className="font-semibold text-slate-800 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/60">
                          {strat.title}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">SEO 설명</span>
                        <p className="text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {strat.description}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">해시태그</span>
                        <p className="text-indigo-600 font-medium break-all">{strat.tags}</p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">
                          유튜브 스튜디오 전용 태그 (500자)
                        </span>
                        <p className="text-slate-500 font-mono text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100 break-all">
                          {strat.studioTags}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">고정 댓글 전략</span>
                        <p className="text-slate-700 bg-amber-50/60 border border-amber-100 p-2 rounded-lg">
                          💬 {strat.pinnedComment}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">시각적 구성안</span>
                        <p className="text-slate-600 text-[11px]">
                          🎨 {strat.visualStrategy}
                        </p>
                      </div>

                      {/* Apply button */}
                      <button
                        onClick={() => handleApply(strat, idx)}
                        className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          isApplied
                            ? "bg-emerald-600 text-white"
                            : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            상세 설정에 적용 완료!
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            이 전략으로 상세 설정 채우기
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Accordion: 직접 SEO 분석으로 채우기 */}
      <div className="pt-2 border-t border-slate-100">
        <button
          onClick={() => setIsDirectSeoOpen(!isDirectSeoOpen)}
          className="w-full flex items-center justify-between text-left py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Search className="w-4 h-4 text-indigo-600" />
            <span>직접 SEO 분석으로 채우기</span>
          </div>
          {isDirectSeoOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isDirectSeoOpen && (
          <div className="mt-2.5 space-y-2.5 animate-in fade-in duration-150">
            <textarea
              rows={4}
              value={seoRawText}
              onChange={(e) => onSeoRawTextChange(e.target.value)}
              placeholder="기존 유튜브 제목, 설명, 태그 등을 자유롭게 붙여넣으세요..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none resize-none transition-all placeholder:text-slate-400"
            />
            <button
              onClick={onAnalyzeSeo}
              disabled={isAnalyzingSeo || !seoRawText.trim()}
              className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              {isAnalyzingSeo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI 분석 및 적용 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI 분석 및 적용하기</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
