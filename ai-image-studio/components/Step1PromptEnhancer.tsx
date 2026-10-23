"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import STYLE_PRESET_PROMPTS from "@/lib/prompts/stylePresetPrompts.json";
import type { CustomStylePrompt } from "@/lib/prompts/customStylePrompts";
import { 
  Wand2, Sparkles, ArrowRight, RefreshCw, AlertCircle, Copy, Check, 
  Camera, Box, Palette, Layers, Zap, Tag, RotateCcw,
  Feather, Brush, Film, Smile, PenTool, Building2, Flame, LayoutGrid, FileText,
  Cloud, Tv
} from "lucide-react";

interface Step1PromptEnhancerProps {
  onApplyPrompt: (prompt: string, negativePrompt?: string) => void;
  initialCustomPrompt?: CustomStylePrompt | null;
}

const PRESET_STYLES = [
  { id: "photorealistic", name: "실사 포토리얼리즘", icon: Camera, desc: "8K 카메라인 렌즈 & 조명 디테일 극대화" },
  { id: "pixar_3d", name: "픽사 3D 애니메이션", icon: Sparkles, desc: "Disney/Pixar 3D 캐릭터 & 입체적 라이팅" },
  { id: "ghibli_anime", name: "지브리 감성 애니", icon: Cloud, desc: "Studio Ghibli풍 수채화 배경 & 몽환적 감성" },
  { id: "japanese_anime", name: "일본 2D 극장판 애니", icon: Tv, desc: "신카이 마코토/KyoAni풍 극장판 2D 애니" },
  { id: "3d_digital", name: "3D 디지털 아트", icon: Box, desc: "Cinema 4D / Octane 렌더 3D 미니어처" },
  { id: "artistic_editorial", name: "감성 패션 화보", icon: Palette, desc: "Vogue 룩북 스타일 패션/인물 화보" },
  { id: "vector_illustration", name: "벡터 일러스트", icon: Layers, desc: "SVG 그래픽 & 깔끔한 그래픽 디자인" },
  { id: "cyberpunk_neon", name: "사이버펑크 네온", icon: Zap, desc: "네온 라이팅 & 미래도시 신비로운 야경" },
  { id: "oriental_ink", name: "동양 수묵화", icon: Feather, desc: "한지 질감 & 먹선 수묵 채색 미학" },
  { id: "watercolor_pastel", name: "수채화 파스텔", icon: Brush, desc: "투명한 파스텔 톤 동화 감성 수채화" },
  { id: "cinematic_film", name: "35mm 필름", icon: Film, desc: "Kodak Portra 아날로그 필름 빈티지 감성" },
  { id: "claymation", name: "클레이 스톱모션", icon: Smile, desc: "지점토 핸드메이드 스톱모션 미니어처" },
  { id: "webtoon_lineart", name: "웹툰 라인아트", icon: PenTool, desc: "명확한 먹선 아웃라인 & 웹툰 스타일" },
  { id: "architectural", name: "건축 & 인테리어", icon: Building2, desc: "ArchDaily 스타일 공간 렌더링 & 빛 조화" },
  { id: "dark_fantasy", name: "다크 판타지", icon: Flame, desc: "웅장한 마법 광원 & 고딕 콘셉트 아트" },
  { id: "minimal_flat", name: "미니멀 플랫 아트", icon: LayoutGrid, desc: "세련된 칼라 블록 & 모던 포스터 디자인" },
];

// Same editorial examples as the admin seed API; live DB edits still take priority.
const STYLE_QUICK_TAGS_MAP = STYLE_PRESET_PROMPTS.reduce<
  Record<string, Array<{ label: string; prompt: string }>>
>((styles, { style_id, label, prompt }) => {
  (styles[style_id] ??= []).push({ label, prompt });
  return styles;
}, {});

export function Step1PromptEnhancer({ onApplyPrompt, initialCustomPrompt }: Step1PromptEnhancerProps) {
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
  const [dbPrompts, setDbPrompts] = useState<Array<{ label: string; prompt: string }>>([]);
  const [personalPrompts, setPersonalPrompts] = useState<CustomStylePrompt[]>([]);
  const [personalError, setPersonalError] = useState("");

  useEffect(() => {
    if (!initialCustomPrompt) return;
    setSelectedPreset(initialCustomPrompt.style_id);
    setIdea(initialCustomPrompt.prompt);
    setResult(null);
    setError(null);
  }, [initialCustomPrompt]);

  useEffect(() => {
    const controller = new AbortController();
    setDbPrompts([]); setPersonalPrompts([]); setPersonalError("");
    fetch(`/api/prompts?style_id=${selectedPreset}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => response.ok ? response.json() : null)
      .then(data => { if (!controller.signal.aborted) setDbPrompts(data?.prompts ?? []); })
      .catch(() => { /* The public editorial defaults remain available on a read failure. */ });
    fetch(`/api/prompts/custom?style_id=${selectedPreset}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "개인 프롬프트를 불러오지 못했습니다."); return data; })
      .then(data => { if (!controller.signal.aborted) setPersonalPrompts(data.prompts ?? []); })
      .catch(error => { if (!controller.signal.aborted) setPersonalError(error.message || "개인 프롬프트를 불러오지 못했습니다."); });
    return () => controller.abort();
  }, [selectedPreset]);

  const activeStyleInfo = PRESET_STYLES.find((s) => s.id === selectedPreset) || PRESET_STYLES[0];
  const fallbackTags = STYLE_QUICK_TAGS_MAP[selectedPreset] || STYLE_QUICK_TAGS_MAP.photorealistic;
  const activeTags = dbPrompts.length > 0 ? dbPrompts : fallbackTags;

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

  const handleSelectQuickTag = (tagPrompt: string) => {
    setIdea(tagPrompt);
    setResult(null);
  };

  return (
    <div id="step1-container" className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-7 backdrop-blur-xl space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 px-3.5 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0 whitespace-nowrap">
            <span className="text-sm font-bold">Step 1</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-amber-400" />
              AI 프롬프트 최적화 생성기 (크리에이티브 아틀리에)
            </h2>
            <p className="text-sm text-zinc-300 mt-0.5">
              원하는 아이디어를 자유롭게 입력하거나 추천 태그를 클릭해보세요. AI가 최적의 영문 마스터 프롬프트를 만듭니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>IMAGE_PROMPT_RULES 공식 표준 준수</span>
          </div>
          <Link
            href="/prompts"
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 transition-colors shrink-0 shadow-sm shadow-amber-500/10"
          >
            <FileText className="h-4 w-4 text-amber-400" />
            <span>📝 프롬프트 게시판 관리 (추가·수정·삭제)</span>
          </Link>
        </div>
      </div>

      {/* Golden Prompt Engineering Reference Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-zinc-950 to-amber-500/5 p-3.5 text-xs text-zinc-300 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-amber-300">
          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
          <span>🎨 AI 마스터 프롬프트 생성 5대 핵심 레퍼런스 원칙</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
          <div className="bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/80 text-zinc-300">
            <strong className="text-amber-400">1. 카메라/광학:</strong> Sony A7R IV 50mm, f/2.0
          </div>
          <div className="bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/80 text-zinc-300">
            <strong className="text-amber-400">2. 라이팅:</strong> 45° 골든아워 자연광, 부드러운 음영
          </div>
          <div className="bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/80 text-zinc-300">
            <strong className="text-amber-400">3. 인물/배경:</strong> 사실적 한국인 디테일 & 3단 심도
          </div>
          <div className="bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/80 text-zinc-300">
            <strong className="text-amber-400">4. 네거티브:</strong> 일러스트, 3D CGI, 플라스틱 피부 배제
          </div>
        </div>
      </div>

      {/* Preset Style Selector */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-200">화풍 / 화법 프리셋 선택</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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

      {/* Dynamic Quick Idea Recommendation Tags based on selected style */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
          <Tag className="h-3.5 w-3.5 text-amber-400" />
          <span><strong className="text-amber-400 font-extrabold">[{activeStyleInfo.name}]</strong> 전용 추천 아이디어 (클릭 시 자동 입력):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTags.map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectQuickTag(tag.prompt)}
              className="rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors"
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
        <p className="text-xs font-bold text-emerald-300">나만의 {activeStyleInfo.name} 프롬프트</p>
        {personalError ? <p role="status" className="text-xs text-zinc-400">{personalError}</p> : personalPrompts.length === 0 ?
          <p className="text-xs text-zinc-400">저장한 개인 프롬프트가 없습니다. <Link href="/prompts" className="text-emerald-300 underline">게시판에서 만들기</Link></p> :
          <div className="flex flex-wrap gap-2">{personalPrompts.map(item => <button key={item.id} type="button"
            onClick={() => handleSelectQuickTag(item.prompt)} className="rounded-lg border border-emerald-500/30 bg-zinc-950 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10">{item.label}</button>)}</div>}
        <p className="text-[11px] text-zinc-500">본인에게만 보이며 처음 저장한 날부터 30일간 사용할 수 있습니다.</p>
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
          <button type="button" disabled={!idea.trim() || loading} onClick={() => onApplyPrompt(idea.trim(), "")}
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40">
            AI 보강 없이 그대로 Step 2에 사용
          </button>
          {(() => {
            const hasContent = Boolean(idea.trim() || result);
            return (
              <button
                type="button"
                disabled={!hasContent}
                onClick={() => {
                  setIdea("");
                  setResult(null);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 px-8 py-3.5 text-sm font-bold border border-amber-400/50 shadow-lg shadow-amber-500/20 transition-all active:scale-95 min-w-[180px] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-700 disabled:shadow-none disabled:active:scale-100"
                title={hasContent ? "입력된 아이디어를 초기화합니다" : "초기화할 내용이 없습니다"}
              >
                <RotateCcw className="h-4 w-4" />
                <span>프롬프트 초기화 (Reset)</span>
              </button>
            );
          })()}

          <button
            onClick={handleEnhance}
            disabled={loading || !idea.trim()}
            className="flex items-center gap-2.5 rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
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
        <div className="space-y-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm shadow-inner">
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
                className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-6 py-3 text-sm font-black text-zinc-950 hover:from-amber-300 hover:to-yellow-300 transition-all shadow-xl shadow-amber-500/40 ring-4 ring-amber-400/50 hover:ring-amber-300 transform hover:scale-[1.03] active:scale-95 animate-pulse cursor-pointer"
              >
                <span>Step 2에 적용하기 (1-Click)</span>
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </button>
            </div>
          </div>

          <p className="font-mono text-base text-zinc-100 leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-800 select-all">
            {result.enhancedPrompt}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-zinc-300 pt-1">
            <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
              <span className="font-bold text-amber-400">💡 적용된 연출 노하우:</span> {result.styleNotes}
            </div>
            {result.negativePrompt && (
              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
                <span className="font-bold text-red-400">🚫 부정 프롬프트:</span> {result.negativePrompt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
