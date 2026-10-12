"use client";

import React, { useState } from "react";
import {
  Palette,
  Type,
  Sliders,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Trash2,
  Check,
  RefreshCw,
  ArrowRight,
  BookOpen,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  EbookProject,
  ThemeKey,
  FontKey,
  SkinKey,
  WritingMode,
  BookStyleSettings,
} from "@/lib/types";
import { THEMES, FONTS, DESIGN_PRESETS, COVER_TEMPLATES } from "@/lib/themes";

interface StyleDesignPanelProps {
  project: EbookProject;
  onUpdateProject: (updates: Partial<EbookProject>) => void;
  onStartGeneration: () => void;
  isGeneratingChapters: boolean;
  apiKey: string;
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export function StyleDesignPanel({
  project,
  onUpdateProject,
  onStartGeneration,
  isGeneratingChapters,
  apiKey,
  selectedModel,
  onSelectModel,
}: StyleDesignPanelProps) {
  const currentStyle = project.style;
  const writingMode = project.writingMode || "detailed";

  // 표지 프롬프트 모달/토스트
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [showCoverPromptModal, setShowCoverPromptModal] = useState(false);
  const [selectedCoverPrompt, setSelectedCoverPrompt] = useState(COVER_TEMPLATES[0]);

  // AI 표지 생성 상태
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [coverGenre, setCoverGenre] = useState("business");
  const [coverError, setCoverError] = useState("");

  const handleUpdateStyle = (updates: Partial<BookStyleSettings>) => {
    onUpdateProject({
      style: {
        ...currentStyle,
        ...updates,
      },
    });
  };

  // 프리셋 일괄 적용
  const handleApplyPreset = (preset: (typeof DESIGN_PRESETS)[0]) => {
    handleUpdateStyle(preset.style);
  };

  // 표지 프롬프트 복사
  const handleCopyCoverPrompt = (template: (typeof COVER_TEMPLATES)[0]) => {
    const promptText = `[짜임]\n${template.body}\n\n[색과 글자]\n제목: "${project.title || "전자책 제목"}"\n부제: "${project.subtitle || ""}"\n저자: "${project.author || ""}"\n비율: 3:4 세로 규격 표지 (Book Cover), 깔끔한 타이포그래피와 절제된 일러스트, 8k 고해상도.`;
    navigator.clipboard.writeText(promptText);
    setCopiedPromptId(template.id);
    setTimeout(() => setCopiedPromptId(null), 3000);
  };

  // 직접 이미지 업로드
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onUpdateProject({ coverImage: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  // AI 표지 생성 (Gemini API)
  const handleGenerateCover = async () => {
    if (!project.title) {
      setCoverError("책 제목을 먼저 입력해 주세요.");
      return;
    }
    if (!apiKey) {
      setCoverError("상단 [AI 연결 설정]에서 본인 Gemini API 키를 먼저 입력해 주세요.");
      return;
    }

    setIsGeneratingCover(true);
    setCoverError("");

    try {
      const res = await fetch("/api/ai/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: project.title,
          subtitle: project.subtitle,
          author: project.author,
          genre: coverGenre,
          apiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "표지 생성에 실패했습니다.");
      }

      if (data.imageUrl) {
        onUpdateProject({ coverImage: data.imageUrl });
      }
    } catch (err: unknown) {
      setCoverError(err instanceof Error ? err.message : "표지 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingCover(false);
    }
  };

  // 견적 계산
  const chapterCount = project.outline?.length || project.chapters.length || 0;
  const estimatedSeconds = Math.max(10, chapterCount * 4);

  return (
    <div className="space-y-6">
      {/* 상단 섹션 타이틀 */}
      <div>
        <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
            02
          </span>
          전자책 구성 및 디자인 정하기
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          책 정보, 정리 수준, 표지와 독서 스타일을 선택하세요. 오른쪽 미리보기에 실시간으로 반영됩니다.
        </p>
      </div>

      {/* 1. 도서 메타데이터 (제목, 부제, 저자) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          <span>도서 기본 정보</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">책 제목</label>
            <input
              type="text"
              value={project.title}
              onChange={(e) => onUpdateProject({ title: e.target.value })}
              placeholder="예: AI 시대의 리더십"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 transition"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">부제 (선택)</label>
            <input
              type="text"
              value={project.subtitle}
              onChange={(e) => onUpdateProject({ subtitle: e.target.value })}
              placeholder="예: 질문하는 리더의 생존 전략"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 transition"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">저자 (선택)</label>
            <input
              type="text"
              value={project.author}
              onChange={(e) => onUpdateProject({ author: e.target.value })}
              placeholder="예: 홍길동"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 transition"
            />
          </div>
        </div>
      </div>

      {/* 2. 3대 정리 수준 선택 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">
            정리 수준 (AI 재구성 방식)
          </h3>
          <span className="text-[11px] text-slate-400">결과물의 성격이 완전히 달라집니다</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            {
              id: "detailed" as WritingMode,
              title: "상세 정리",
              badge: "강의안, 가이드북",
              desc: "맥락과 사례까지 충실하게 풀어 씁니다. 한 구간이 2~4개 장이 됩니다.",
            },
            {
              id: "concise" as WritingMode,
              title: "핵심 요약",
              badge: "브리핑, 정리 노트",
              desc: "중요한 내용만 남기고 줄입니다. 한 구간이 1~2개 장이 됩니다.",
            },
            {
              id: "verbatim" as WritingMode,
              title: "원문 그대로",
              badge: "내 글, 인터뷰, 회의록",
              desc: "낱말은 그대로 두고 소제목·목록·표·인용 등 서식만 다시 세웁니다.",
            },
          ].map((m) => {
            const active = writingMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onUpdateProject({ writingMode: m.id })}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  active
                    ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/20"
                    : "bg-slate-50/50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{m.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-indigo-700 font-semibold border border-indigo-100">
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    {m.desc}
                  </p>
                </div>
                {active && (
                  <div className="mt-2 text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>선택됨</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 표지 만들기 프롬프트 4대 템플릿 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800">
              표지 만들기 프롬프트 생성기 (3:4 규격)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">클릭 시 프롬프트 자동 복사</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COVER_TEMPLATES.map((tmpl) => {
            const isCopied = copiedPromptId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleCopyCoverPrompt(tmpl)}
                className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                  isCopied
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : "bg-slate-50/70 border-slate-200 hover:bg-indigo-50/40 hover:border-indigo-300"
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">{tmpl.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                    {tmpl.note}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-bold">
                  {isCopied ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Check className="w-3 h-3" /> 복사 완료!
                    </span>
                  ) : (
                    <span className="text-indigo-600 flex items-center gap-1">
                      <Copy className="w-3 h-3" /> 프롬프트 복사
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 표지 직접 업로드 & AI 표지 생성 */}
        <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 transition">
              <Upload className="w-3.5 h-3.5" />
              <span>직접 표지 이미지 등록</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </label>
            {project.coverImage && (
              <button
                type="button"
                onClick={() => onUpdateProject({ coverImage: null })}
                className="text-[11px] text-rose-600 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> 표지 제거
              </button>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            * 표지가 없으면 선택한 테마의 깔끔한 타이포 표지가 자동 적용됩니다.
          </span>
        </div>
      </div>

      {/* 4. 디자인 조합 10대 프리셋 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">
            디자인 조합 10대 프리셋
          </h3>
          <span className="text-[11px] text-slate-400">원클릭 일괄 스타일 적용</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {DESIGN_PRESETS.map((preset, idx) => {
            const isMatch =
              currentStyle.theme === preset.style.theme &&
              currentStyle.font === preset.style.font &&
              currentStyle.skin === preset.style.skin;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between min-h-[58px] ${
                  isMatch
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="text-xs font-bold block break-keep">{preset.label}</span>
                <span
                  className={`text-[10px] mt-1 block leading-tight break-keep ${
                    isMatch ? "text-indigo-100" : "text-slate-500"
                  }`}
                >
                  {preset.note}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. 스타일 세부 조정: 21종 테마 피커 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-indigo-600" />
            <span>21종 테마 선택 (밝은 12 · 어두운 8 · 고대비 1)</span>
          </h3>
          <span className="text-[11px] font-bold text-indigo-600">
            현재: {THEMES[currentStyle.theme]?.label}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {Object.entries(THEMES).map(([key, t]) => {
            const active = currentStyle.theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleUpdateStyle({ theme: key as ThemeKey })}
                style={{ backgroundColor: t.bg }}
                className={`p-2 rounded-xl border text-left transition relative flex flex-col justify-between min-h-[68px] shadow-2xs ${
                  active
                    ? "ring-2 ring-indigo-600 border-indigo-600 scale-[1.02]"
                    : "border-slate-200/80 hover:border-slate-400"
                }`}
              >
                {/* 우상단 선택 체크 뱃지 */}
                {active && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}

                <div className="w-full pr-4">
                  <span
                    style={{ color: t.fg }}
                    className="text-[11px] font-bold leading-tight block break-keep"
                  >
                    {t.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <div
                    style={{ backgroundColor: t.paper }}
                    className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                    title="종이색"
                  />
                  <div
                    style={{ backgroundColor: t.accent }}
                    className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                    title="포인트색"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. 서체, 지면 꾸밈, 줄간격, 글자크기 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 서체 및 지면 꾸밈 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
              <Type className="w-3.5 h-3.5 text-indigo-600" />
              <span>5종 본문 서체</span>
            </label>
            <div className="space-y-1.5">
              {Object.entries(FONTS).map(([key, f]) => {
                const active = currentStyle.font === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleUpdateStyle({ font: key as FontKey })}
                    className={`w-full px-3 py-2 rounded-xl border text-left transition flex items-center justify-between ${
                      active
                        ? "bg-indigo-50/70 border-indigo-300 text-indigo-900"
                        : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{f.label}</span>
                      <span className="text-[10px] text-slate-400 block">{f.note}</span>
                    </div>
                    {active && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">
              지면 꾸밈 스타일
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "classic" as SkinKey, label: "클래식 (선과 여백만)" },
                { id: "studio" as SkinKey, label: "스튜디오 (배지와 강조 막대)" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleUpdateStyle({ skin: s.id })}
                  className={`p-2 rounded-xl border text-xs font-bold transition text-center ${
                    currentStyle.skin === s.id
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 줄 간격 & 글자 크기 슬라이더 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-5">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800">줄 간격 & 글자 크기</h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">줄 간격 (1.15 ~ 2.10)</span>
              <span className="font-mono text-indigo-600 font-bold">
                {currentStyle.leading}
              </span>
            </div>
            <input
              type="range"
              min="1.15"
              max="2.10"
              step="0.05"
              value={currentStyle.leading}
              onChange={(e) => handleUpdateStyle({ leading: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>촘촘하게 (1.15)</span>
              <span>표준 (1.55 ~ 1.8)</span>
              <span>여유있게 (2.10)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">본문 글자 크기 (14 ~ 22px)</span>
              <span className="font-mono text-indigo-600 font-bold">
                {currentStyle.size}px
              </span>
            </div>
            <input
              type="range"
              min="14"
              max="22"
              step="1"
              value={currentStyle.size}
              onChange={(e) => handleUpdateStyle({ size: parseInt(e.target.value) })}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>작게 (14px)</span>
              <span>표준 (17px)</span>
              <span>크게 (22px)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
            * 여기서 정하는 값은 독자가 책을 처음 열었을 때의 기본 모습이며, 독자도 책 안에서 자유롭게 바꿀 수 있습니다.
          </div>
        </div>
      </div>

      {/* 7. AI 모델 선택 및 전자책 생성 바 */}
      <div className="bg-indigo-900 text-white rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>전자책 집필 & 생성 시작</span>
            </h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              회원 본인의 Google Gemini API 키로 구간별 챕터를 순서대로 정교하게 생성합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-200">AI 모델:</span>
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-indigo-800/80 border border-indigo-700 text-xs font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-300"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (추천)</option>
              <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (초고속)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (심층 분석)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-indigo-800/80 flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs text-indigo-200 font-medium">
            <span>총 {chapterCount}개 장 구성</span>
            <span>•</span>
            <span>예상 시간: 약 {estimatedSeconds}초</span>
            <span>•</span>
            <span>중간 취소 및 이어서 생성 지원</span>
          </div>

          <button
            type="button"
            onClick={onStartGeneration}
            disabled={isGeneratingChapters || chapterCount === 0}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black transition shadow-md shadow-amber-900/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingChapters ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>전자책 생성 진행 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>전자책 생성하기 ({chapterCount}개 장)</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
