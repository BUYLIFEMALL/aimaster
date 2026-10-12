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
} from "lucide-react";
import { EbookProject, ThemeKey, FontKey, SkinKey } from "@/lib/types";
import { THEMES, FONTS } from "@/lib/themes";

interface StyleDesignPanelProps {
  project: EbookProject;
  onUpdateProject: (updates: Partial<EbookProject>) => void;
  onNextStep: () => void;
  apiKey: string;
}

export function StyleDesignPanel({
  project,
  onUpdateProject,
  onNextStep,
  apiKey,
}: StyleDesignPanelProps) {
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [coverGenre, setCoverGenre] = useState("business");
  const [coverError, setCoverError] = useState("");

  const currentStyle = project.style;

  const handleUpdateStyle = (updates: Partial<typeof currentStyle>) => {
    onUpdateProject({
      style: {
        ...currentStyle,
        ...updates,
      },
    });
  };

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

  const handleGenerateCover = async () => {
    if (!project.title) {
      setCoverError("책 제목이 먼저 설정되어 있어야 합니다.");
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
    } catch (err: any) {
      setCoverError(err.message || "표지 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingCover(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. 21종 테마 선택 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-black text-slate-800">
            21종 독서 테마 (배경 & 종이 색상 조합)
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {Object.entries(THEMES).map(([key, t]) => {
            const active = currentStyle.theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleUpdateStyle({ theme: key as ThemeKey })}
                style={{ backgroundColor: t.bg }}
                className={`p-2.5 rounded-xl border text-left transition relative overflow-hidden flex flex-col justify-between h-20 shadow-2xs ${
                  active
                    ? "ring-2 ring-indigo-600 border-indigo-600 scale-[1.02]"
                    : "border-slate-200/80 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    style={{ color: t.fg }}
                    className="text-[11px] font-black truncate max-w-[80px]"
                  >
                    {t.label}
                  </span>
                  {active && (
                    <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                {/* 테마 컬러 칩 */}
                <div className="flex items-center gap-1 mt-auto">
                  <div
                    style={{ backgroundColor: t.paper }}
                    className="w-3.5 h-3.5 rounded border border-black/10 shadow-2xs"
                    title="종이색"
                  />
                  <div
                    style={{ backgroundColor: t.fg }}
                    className="w-3.5 h-3.5 rounded border border-black/10 shadow-2xs"
                    title="글자색"
                  />
                  <div
                    style={{ backgroundColor: t.accent }}
                    className="w-3.5 h-3.5 rounded border border-black/10 shadow-2xs"
                    title="포인트색"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 5종 서체 & 서식 상세 조절 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 서체 선택 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-800">
              5종 본문 서체 선택
            </h3>
          </div>

          <div className="space-y-2">
            {Object.entries(FONTS).map(([key, f]) => {
              const active = currentStyle.font === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleUpdateStyle({ font: key as FontKey })}
                  className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    active
                      ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/20"
                      : "bg-slate-50/60 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {f.label}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      {f.note}
                    </span>
                  </div>
                  {active && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 지면 꾸밈 & 줄간격 & 글자 크기 슬라이더 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-800">
              지면 꾸밈 & 가독성 조절
            </h3>
          </div>

          {/* 지면 꾸밈 라디오 */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600">지면 꾸밈 스타일</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "classic" as SkinKey, label: "클래식 (선과 여백만 단정하게)" },
                { id: "studio" as SkinKey, label: "스튜디오 (배지와 강조 막대)" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleUpdateStyle({ skin: s.id })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition text-center ${
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

          {/* 줄 간격 슬라이더 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">줄 간격</span>
              <span className="font-mono text-indigo-600 font-bold">
                {currentStyle.leading}
              </span>
            </div>
            <input
              type="range"
              min="1.2"
              max="2.1"
              step="0.05"
              value={currentStyle.leading}
              onChange={(e) => handleUpdateStyle({ leading: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>촘촘하게 (1.2)</span>
              <span>표준 (1.7)</span>
              <span>넓게 (2.1)</span>
            </div>
          </div>

          {/* 글자 크기 슬라이더 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">본문 글자 크기</span>
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
        </div>
      </div>

      {/* 3. 표지(Cover) 설정 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-800">
              전자책 표지 (3:4 표준 비율)
            </h3>
          </div>

          {project.coverImage && (
            <button
              type="button"
              onClick={() => onUpdateProject({ coverImage: null })}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>표지 제거 (기본 타이포 표지 복원)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
          {/* 표지 미리보기 */}
          <div className="sm:col-span-4 flex justify-center">
            <div className="w-44 h-60 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center shadow-md relative">
              {project.coverImage ? (
                <img
                  src={project.coverImage}
                  alt="표지 미리보기"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-4 text-center space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                  <span className="text-[11px] font-bold text-slate-400 block">
                    기본 타이포 표지 사용 중
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 표지 생성 및 업로드 컨트롤 */}
          <div className="sm:col-span-8 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">
                AI 맞춤 표지 자동 생성 (Gemini)
              </span>

              <div className="flex items-center gap-2">
                <select
                  value={coverGenre}
                  onChange={(e) => setCoverGenre(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-600"
                >
                  <option value="business">비즈니스 / 경제경영 스타일</option>
                  <option value="minimal">미니멀 그래픽 스타일</option>
                  <option value="illustration">감성 일러스트 스타일</option>
                  <option value="tech">IT / 미래지향 스타일</option>
                </select>

                <button
                  type="button"
                  onClick={handleGenerateCover}
                  disabled={isGeneratingCover}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs shadow-indigo-100 disabled:opacity-50"
                >
                  {isGeneratingCover ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>생성 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>원클릭 AI 표지 생성</span>
                    </>
                  )}
                </button>
              </div>

              {coverError && (
                <p className="text-xs text-rose-600 font-medium">{coverError}</p>
              )}
            </div>

            {/* 직접 업로드 */}
            <div className="flex items-center gap-3">
              <label className="cursor-pointer flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition">
                <Upload className="w-3.5 h-3.5" />
                <span>직접 이미지 업로드 (JPG, PNG)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-400">
                * 권장 규격: 3:4 비율 (예: 1200 x 1600px)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 다음 단계 버튼 */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onNextStep}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-100 transition"
        >
          <span>배포 & 내보내기 단계로 이동</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
