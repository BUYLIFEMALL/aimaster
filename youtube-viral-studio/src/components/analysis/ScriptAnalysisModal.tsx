"use client";

import { useState } from "react";
import type { ScriptAnalysisResult } from "@/lib/ai/scriptAnalyzer";
import { refHandoffHash } from "@/lib/reference";

// v1.22 대사를 넘길 AI 쇼츠 원스톱 주제 화면(원스톱 v1.32~가 주소 # 뒤 대사를 레퍼런스로 받음)
const ONESTOP_TOPIC_URL = "https://shorts-onestop-studio.buylife.xyz/topic";
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
      <div className="bg-yt-surface rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-yt-border overflow-hidden">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-yt-border flex items-center justify-between bg-gradient-to-r from-yt-red/10 to-yt-warn/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 text-white shadow-xs">
              <Sparkles className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-yt-text">
                  AI 떡상 쇼츠 3단 구조 심층 분석
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yt-red/10 text-yt-danger">
                  {analysis.providerUsed}
                </span>
              </div>
              <p className="text-xs text-yt-muted truncate max-w-md mt-0.5" title={analysis.videoTitle}>
                {analysis.videoTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-yt-muted hover:text-yt-text hover:bg-yt-hover rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3단 스코어보드 */}
        <div className="p-5 bg-yt-raised border-b border-yt-border grid grid-cols-3 gap-3">
          <div className="p-3 bg-yt-surface rounded-xl border border-yt-border text-center shadow-xs">
            <div className="text-[11px] font-semibold text-yt-muted mb-0.5 flex items-center justify-center gap-1">
              <Zap className="w-3.5 h-3.5 text-yt-warn" />
              <span>첫 3초 훅킹</span>
            </div>
            <div className="text-xl font-black text-yt-warn">
              {analysis.hookScore}점
            </div>
          </div>

          <div className="p-3 bg-yt-surface rounded-xl border border-yt-border text-center shadow-xs">
            <div className="text-[11px] font-semibold text-yt-muted mb-0.5 flex items-center justify-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-yt-success" />
              <span>시청 지속력</span>
            </div>
            <div className="text-xl font-black text-yt-success">
              {analysis.retentionScore}점
            </div>
          </div>

          <div className="p-3 bg-yt-surface rounded-xl border border-yt-border text-center shadow-xs">
            <div className="text-[11px] font-semibold text-yt-muted mb-0.5 flex items-center justify-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-yt-link" />
              <span>행동유도(CTA)</span>
            </div>
            <div className="text-xl font-black text-yt-link">
              {analysis.ctaScore}점
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="px-5 pt-3 border-b border-yt-border flex gap-2">
          <button
            onClick={() => setActiveTab("structure")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "structure"
                ? "border-yt-red/40 text-yt-danger"
                : "border-transparent text-yt-muted hover:text-yt-text"
            }`}
          >
            🎯 3단 훅킹 구조 해체
          </button>
          <button
            onClick={() => setActiveTab("secret")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "secret"
                ? "border-yt-red/40 text-yt-danger"
                : "border-transparent text-yt-muted hover:text-yt-text"
            }`}
          >
            🔥 떡상 성공 비결
          </button>
          <button
            onClick={() => setActiveTab("template")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "template"
                ? "border-yt-red/40 text-yt-danger"
                : "border-transparent text-yt-muted hover:text-yt-text"
            }`}
          >
            📋 카피캣 대본 템플릿
          </button>
        </div>

        {/* 모달 본문 (스크롤) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs leading-relaxed text-yt-text">
          {/* 1. 3단 구조 탭 */}
          {activeTab === "structure" && (
            <div className="space-y-4">
              {/* 도입부 */}
              <div className="p-4 bg-yt-warn/10 rounded-xl border border-yt-warn/40">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-bold text-[10px]">
                    1단계 도입부
                  </span>
                  <h4 className="text-sm font-bold text-yt-text">
                    {analysis.hookTitle}
                  </h4>
                </div>
                <p className="text-yt-text leading-relaxed whitespace-pre-line">
                  {analysis.hookDetails}
                </p>
              </div>

              {/* 본문 시청지속 */}
              <div className="p-4 bg-yt-success/10 rounded-xl border border-yt-success/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                    2단계 시청지속
                  </span>
                  <h4 className="text-sm font-bold text-yt-text">
                    {analysis.retentionTitle}
                  </h4>
                </div>
                <p className="text-yt-text leading-relaxed whitespace-pre-line">
                  {analysis.retentionDetails}
                </p>
              </div>

              {/* 결말 행동유도 */}
              <div className="p-4 bg-yt-link/10 rounded-xl border border-yt-link/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px]">
                    3단계 결말 & CTA
                  </span>
                  <h4 className="text-sm font-bold text-yt-text">
                    {analysis.ctaTitle}
                  </h4>
                </div>
                <p className="text-yt-text leading-relaxed whitespace-pre-line">
                  {analysis.ctaDetails}
                </p>
              </div>
            </div>
          )}

          {/* 2. 떡상 성공 비결 탭 */}
          {activeTab === "secret" && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-yt-text mb-2 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-yt-danger fill-red-600" />
                <span>알고리즘을 뚫어낸 핵심 요인 요약</span>
              </h4>
              {analysis.viralSecret.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-yt-raised rounded-xl border border-yt-border flex items-start gap-3"
                >
                  <span className="w-5 h-5 rounded-full bg-yt-red/10 text-yt-danger flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-yt-text font-medium leading-relaxed">
                    {sec}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 3. 카피캣 템플릿 탭 */}
          {activeTab === "template" && (
            <div className="space-y-4">
              <div className="p-4 bg-yt-raised rounded-xl border border-yt-border space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-yt-muted uppercase tracking-wider block mb-1">
                    [첫 3초 훅 대사 템플릿]
                  </span>
                  <div className="p-2.5 bg-yt-surface rounded-lg border border-yt-border font-mono text-yt-text">
                    {analysis.copycatTemplate.hookPrompt}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-yt-muted uppercase tracking-wider block mb-1">
                    [본문 전개 3단계 구조]
                  </span>
                  <div className="p-2.5 bg-yt-surface rounded-lg border border-yt-border font-mono text-yt-text">
                    {analysis.copycatTemplate.bodyStructure}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-yt-muted uppercase tracking-wider block mb-1">
                    [결말 행동유도 대사 템플릿]
                  </span>
                  <div className="p-2.5 bg-yt-surface rounded-lg border border-yt-border font-mono text-yt-text">
                    {analysis.copycatTemplate.ctaEnding}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-yt-text block mb-1.5 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-yt-danger" />
                  <span>50초 완성 예시 대본 (카피캣 실전용):</span>
                </span>
                <div className="p-4 bg-yt-raised text-gray-100 rounded-xl font-mono whitespace-pre-line text-xs leading-relaxed border border-yt-border">
                  {analysis.copycatTemplate.exampleDraft}
                </div>
              </div>
            </div>
          )}

          {/* v1.22 실제 대사 → AI 쇼츠 원스톱 레퍼런스(대사는 주소 # 뒤라 서버로 가지 않음) */}
          {analysis?.transcript && (
            <div className="mt-6 rounded-xl border border-yt-border bg-yt-raised p-4">
              <details>
                <summary className="cursor-pointer text-xs font-bold text-yt-text">🎙 영상 대사(받아쓰기)</summary>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-gray-200">{analysis.transcript}</p>
              </details>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-yt-muted">
                <a
                  href={`${ONESTOP_TOPIC_URL}${refHandoffHash(analysis.transcript)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap rounded-lg border border-yt-border bg-yt-surface px-3 py-1.5 font-bold text-yt-text hover:bg-yt-hover"
                >
                  🎬 이 대사로 쇼츠 만들기
                </a>
                <span>AI 쇼츠 원스톱이 새 탭으로 열리고, 대사가 레퍼런스로 들어갑니다(흐름만 참고하고 문장은 새로 씁니다).</span>
              </div>
            </div>
          )}
        </div>

        {/* 모달 하단 액션 */}
        <div className="p-4 border-t border-yt-border bg-yt-raised flex items-center justify-between">
          <button
            onClick={handleCopyTemplate}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-yt-red hover:bg-yt-red-hover text-white text-xs font-bold rounded-xl transition-all shadow-xs"
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
            className="px-4 py-2.5 bg-yt-surface hover:bg-yt-hover text-yt-text text-xs font-semibold rounded-xl border border-yt-border transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
