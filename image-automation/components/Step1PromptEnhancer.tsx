"use client";

import { useState } from "react";
import { Wand2, Sparkles, ArrowRight, RefreshCw, AlertCircle, Copy, Check } from "lucide-react";

interface Step1PromptEnhancerProps {
  onApplyPrompt: (prompt: string, negativePrompt?: string) => void;
}

export function Step1PromptEnhancer({ onApplyPrompt }: Step1PromptEnhancerProps) {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    enhancedPrompt: string;
    styleNotes: string;
    negativePrompt: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const handleEnhance = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "프롬프트 최적화 생성에 실패했습니다.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.enhancedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="text-xs font-bold">Step 1</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-amber-400" />
              AI 프롬프트 최적화 생성기
            </h2>
            <p className="text-xs text-zinc-400">
              만들고 싶은 이미지의 한국어 아이디어를 간단히 입력해보세요. AI가 디테일한 조명/구도/스타일이 적용된 고품질 프롬프트로 변환해 드립니다.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="예: 서울 경복궁 한옥 카페에서 노트북으로 작업 중인 한복을 입은 한국 여성, 따뜻한 오후 햇살"
          rows={3}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>추천 스타일:</span>
            <button
              type="button"
              onClick={() => setIdea("사이버펑크 미래 도시 야경 속에서 레트로 자동차 앞에 선 20대 여성")}
              className="text-zinc-400 hover:text-amber-400 underline decoration-zinc-700 hover:decoration-amber-400"
            >
              #사이버펑크
            </button>
            <button
              type="button"
              onClick={() => setIdea("제주도 해변 언덕 위 감성 오션뷰 수목원과 노을 화장풍 분위기")}
              className="text-zinc-400 hover:text-amber-400 underline decoration-zinc-700 hover:decoration-amber-400"
            >
              #감성풍경
            </button>
          </div>

          <button
            onClick={handleEnhance}
            disabled={loading || !idea.trim()}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-all shadow-md shadow-amber-500/10"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                AI 최적화 분석 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 fill-zinc-950" />
                프롬프트 최적화 생성
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              최적화 생성된 영문 프롬프트
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800 transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? "복사됨" : "복사"}
              </button>
              <button
                onClick={() => onApplyPrompt(result.enhancedPrompt, result.negativePrompt)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1 font-bold text-zinc-950 hover:bg-amber-400 transition-colors shadow-sm"
              >
                <span>Step 2에 적용하기</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p className="font-mono text-zinc-200 leading-relaxed bg-zinc-950/80 p-3 rounded-lg border border-zinc-800 select-all">
            {result.enhancedPrompt}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-zinc-400 pt-1">
            <div>
              <span className="font-medium text-zinc-300">💡 적용된 연출 노하우:</span> {result.styleNotes}
            </div>
            {result.negativePrompt && (
              <div>
                <span className="font-medium text-zinc-300">🚫 부정 프롬프트:</span> {result.negativePrompt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
