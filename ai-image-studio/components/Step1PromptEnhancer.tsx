"use client";

import { useState } from "react";
import { Wand2, Sparkles, ArrowRight, RefreshCw, AlertCircle, Copy, Check, Camera, Box, Palette, Layers, Zap } from "lucide-react";

interface Step1PromptEnhancerProps {
  onApplyPrompt: (prompt: string, negativePrompt?: string) => void;
}

const PRESET_STYLES = [
  { id: "photorealistic", name: "실사 포토리얼리즘", icon: Camera, desc: "8K 카메라인 렌즈 & 조명 디테일 극대화" },
  { id: "3d_digital", name: "3D 디지털 아트", icon: Box, desc: "Cinema 4D / Octane 렌더 픽사 3D 스타일" },
  { id: "artistic_editorial", name: "감성 패션 화보", icon: Palette, desc: "Vogue 룩북 스타일 패션/인물 화보" },
  { id: "vector_illustration", name: "벡터 일러스트", icon: Layers, desc: "SVG 그래픽 & 깔끔한 그래픽 디자인" },
  { id: "cyberpunk_neon", name: "사이버펑크 네온", icon: Zap, desc: "네온 라이팅 & 미래도시 신비로운 야경" },
];

export function Step1PromptEnhancer({ onApplyPrompt }: Step1PromptEnhancerProps) {
  const [idea, setIdea] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("photorealistic");
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
        body: JSON.stringify({ idea, presetStyle: selectedPreset })
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-7 backdrop-blur-xl space-y-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="text-sm font-bold">Step 1</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-amber-400" />
              AI 프롬프트 최적화 생성기 (Master Visual Rules)
            </h2>
            <p className="text-sm text-zinc-300 mt-0.5">
              기존 자동화 프로그램의 화풍 지침이 이식되었습니다. 한글 아이디어를 입력하고 화풍 프리셋을 선택해보세요.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Style Selector */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-200">화풍 / 화법 프리셋 선택</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {PRESET_STYLES.map((st) => {
            const IconComponent = st.icon;
            const isSelected = selectedPreset === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedPreset(st.id)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <IconComponent className={`h-4 w-4 ${isSelected ? "text-amber-400" : "text-zinc-400"}`} />
                  <span className="text-sm font-bold text-white">{st.name}</span>
                </div>
                <span className="text-xs text-zinc-400 line-clamp-1">{st.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="예: 서울 경복궁 한옥 카페에서 노트북으로 작업 중인 한복을 입은 한국 여성, 따뜻한 오후 햇살"
          rows={3}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-base text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none leading-relaxed"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <span className="font-semibold text-zinc-400">추천 예시:</span>
            <button
              type="button"
              onClick={() => setIdea("사이버펑크 네온 야경 속 20대 한국 여성의 감성 포토리얼 샷")}
              className="text-amber-400 hover:underline font-medium"
            >
              #사이버펑크
            </button>
            <button
              type="button"
              onClick={() => setIdea("제주도 언덕 위 해질녘 노을 오션뷰 한옥 분위기")}
              className="text-amber-400 hover:underline font-medium"
            >
              #감성풍경
            </button>
          </div>

          <button
            onClick={handleEnhance}
            disabled={loading || !idea.trim()}
            className="flex items-center gap-2.5 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
          >
            {loading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>AI 마스터 분석 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 fill-zinc-950" />
                <span>마스터 프롬프트 생성</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3.5 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
            <span className="font-bold text-amber-300 text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              최적화 생성된 영문 프롬프트
            </span>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-sm text-zinc-200 hover:text-white bg-zinc-900 px-3.5 py-1.5 rounded-lg border border-zinc-700 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "복사됨" : "복사하기"}
              </button>
              <button
                onClick={() => onApplyPrompt(result.enhancedPrompt, result.negativePrompt)}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition-colors shadow-md"
              >
                <span>Step 2에 적용하기</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="font-mono text-base text-zinc-100 leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-800 select-all">
            {result.enhancedPrompt}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-zinc-300 pt-1">
            <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
              <span className="font-bold text-amber-400">💡 적용된 연출 노하우:</span> {result.styleNotes}
            </div>
            {result.negativePrompt && (
              <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                <span className="font-bold text-red-400">🚫 부정 프롬프트:</span> {result.negativePrompt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
