"use client";

import { useState } from "react";
import type { ScriptAnalysisResult } from "@/lib/ai/scriptAnalyzer";
import {
  X,
  Sparkles,
  Zap,
  TrendingUp,
  MessageSquare,
  Copy,
  Check,
  Flame,
  FileText,
  HelpCircle,
} from "lucide-react";

interface ScriptAnalysisModalProps {
  analysis: ScriptAnalysisResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ScriptAnalysisModal({
  analysis,
  isOpen,
  onClose,
}: ScriptAnalysisModalProps) {
  const [activeTab, setActiveTab] = useState<"structure" | "secret" | "template">("structure");
  const [copied, setCopied] = useState(false);

  if (!isOpen || !analysis) return null;

  const handleCopyTemplate = () => {
    const textToCopy = `[쇼츠 카피캣 대본 템플릿]
■ 도입부 (첫 3초 훅):
${analysis.copycatTemplate.hookPrompt}

■ 본문 (시청 지속 전개):
${analysis.copycatTemplate.bodyStructure}

■ 결말 (행동유도 CTA):
${analysis.copycatTemplate.ctaEnding}

■ 50초 쇼츠 완성 예시 대본:
${analysis.copycatTemplate.exampleDraft}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50/50 to-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 text-white shadow-xs">
              <Sparkles className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  AI 떡상 쇼츠 3단 구조 심층 분석
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {analysis.providerUsed}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate max-w-md mt-0.5" title={analysis.videoTitle}>
                {analysis.videoTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3단 스코어보드 */}
        <div className="p-5 bg-gray-50/70 border-b border-gray-100 grid grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-xl border border-gray-200 text-center shadow-xs">
            <div className="text-[11px] font-semibold text-gray-500 mb-0.5 flex items-center justify-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>첫 3초 훅킹</span>
            </div>
            <div className="text-xl font-black text-amber-600">
              {analysis.hookScore}점
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-gray-200 text-center shadow-xs">
            <div className="text-[11px] font-semibold text-gray-500 mb-0.5 flex items-center justify-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>시청 지속력</span>
            </div>
            <div className="text-xl font-black text-emerald-600">
              {analysis.retentionScore}점
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-gray-200 text-center shadow-xs">
            <div className="text-[11px] font-semibold text-gray-500 mb-0.5 flex items-center justify-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              <span>행동유도(CTA)</span>
            </div>
            <div className="text-xl font-black text-blue-600">
              {analysis.ctaScore}점
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="px-5 pt-3 border-b border-gray-100 flex gap-2">
          <button
            onClick={() => setActiveTab("structure")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "structure"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            🎯 3단 훅킹 구조 해체
          </button>
          <button
            onClick={() => setActiveTab("secret")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "secret"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            🔥 떡상 성공 비결
          </button>
          <button
            onClick={() => setActiveTab("template")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "template"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            📋 카피캣 대본 템플릿
          </button>
        </div>

        {/* 모달 본문 (스크롤) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs leading-relaxed text-gray-700">
          {/* 1. 3단 구조 탭 */}
          {activeTab === "structure" && (
            <div className="space-y-4">
              {/* 도입부 */}
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-bold text-[10px]">
                    1단계 도입부
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">
                    {analysis.hookTitle}
                  </h4>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {analysis.hookDetails}
                </p>
              </div>

              {/* 본문 시청지속 */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                    2단계 시청지속
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">
                    {analysis.retentionTitle}
                  </h4>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {analysis.retentionDetails}
                </p>
              </div>

              {/* 결말 행동유도 */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px]">
                    3단계 결말 & CTA
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">
                    {analysis.ctaTitle}
                  </h4>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {analysis.ctaDetails}
                </p>
              </div>
            </div>
          )}

          {/* 2. 떡상 성공 비결 탭 */}
          {activeTab === "secret" && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-red-600 fill-red-600" />
                <span>알고리즘을 뚫어낸 핵심 요인 요약</span>
              </h4>
              {analysis.viralSecret.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3"
                >
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-gray-800 font-medium leading-relaxed">
                    {sec}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 3. 카피캣 템플릿 탭 */}
          {activeTab === "template" && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    [첫 3초 훅 대사 템플릿]
                  </span>
                  <div className="p-2.5 bg-white rounded-lg border border-gray-200 font-mono text-gray-900">
                    {analysis.copycatTemplate.hookPrompt}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    [본문 전개 3단계 구조]
                  </span>
                  <div className="p-2.5 bg-white rounded-lg border border-gray-200 font-mono text-gray-900">
                    {analysis.copycatTemplate.bodyStructure}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    [결말 행동유도 대사 템플릿]
                  </span>
                  <div className="p-2.5 bg-white rounded-lg border border-gray-200 font-mono text-gray-900">
                    {analysis.copycatTemplate.ctaEnding}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-gray-800 block mb-1.5 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>50초 완성 예시 대본 (카피캣 실전용):</span>
                </span>
                <div className="p-4 bg-gray-900 text-gray-100 rounded-xl font-mono whitespace-pre-line text-xs leading-relaxed border border-gray-800">
                  {analysis.copycatTemplate.exampleDraft}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 모달 하단 액션 */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <button
            onClick={handleCopyTemplate}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>이 구조로 대본 템플릿 복사</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
