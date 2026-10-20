"use client";

import React, { useState } from "react";
import {
  Film,
  Sparkles,
  Download,
  FileArchive,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ScrollText,
  Grid3X3,
} from "lucide-react";
import { CutScene, WebtoonProject } from "@/lib/types";
import { generateCoverImage, generateCutImage } from "@/lib/imageGen";
import { mergeAndDownloadLongScrollJpg, downloadAllImagesAsZip } from "@/lib/canvasMerge";
import { InstagramPublishPanel } from "./InstagramPublishPanel";

interface WebtoonCanvasSectionProps {
  project: WebtoonProject;
  onChangeProject: (updated: Partial<WebtoonProject>) => void;
  apiKey: string;
  onOpenSettings: () => void;
  onPrevStep: () => void;
}

export function WebtoonCanvasSection({
  project,
  onChangeProject,
  apiKey,
  onOpenSettings,
  onPrevStep,
}: WebtoonCanvasSectionProps) {
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isCoverGenerating, setIsCoverGenerating] = useState(false);
  const [generatingCutIndices, setGeneratingCutIndices] = useState<number[]>([]);
  const [previewMode, setPreviewMode] = useState<"scroll" | "grid">("scroll");

  // 1. 메인 표지 단독 생성
  const handleGenerateCover = async () => {
    setIsCoverGenerating(true);
    try {
      let fallbackReason = "";
      const coverUrl = await generateCoverImage(apiKey, project, (reason) => { fallbackReason = reason; });
      onChangeProject({ coverImageUrl: coverUrl });
      if (fallbackReason) alert(`AI(Gemini) 그림 생성에 실패해 무료 대체 그림을 넣었습니다. 원인: ${fallbackReason}`);
    } catch (e: any) {
      alert(e.message || "메인 표지 생성에 실패했습니다.");
    } finally {
      setIsCoverGenerating(false);
    }
  };

  // 2. 단일 컷 개별 생성
  const handleGenerateSingleCut = async (cut: CutScene, index: number) => {
    setGeneratingCutIndices((prev) => [...prev, cut.cutIndex]);
    try {
      let fallbackReason = "";
      const imgUrl = await generateCutImage(apiKey, cut, project, (reason) => { fallbackReason = reason; });
      const updatedCuts = [...(project.cuts || [])];
      updatedCuts[index] = { ...cut, imageUrl: imgUrl, isGenerating: false };
      onChangeProject({ cuts: updatedCuts });
      if (fallbackReason) alert(`AI(Gemini) 그림 생성에 실패해 무료 대체 그림을 넣었습니다. 원인: ${fallbackReason}`);
    } catch (e: any) {
      alert(e.message || `CUT #${cut.cutIndex} 생성 실패`);
    } finally {
      setGeneratingCutIndices((prev) => prev.filter((i) => i !== cut.cutIndex));
    }
  };

  // 3. 원고 일괄 제작 시작 (표지 + 모든 컷 순차 생성)
  const handleBatchGenerate = async () => {
    if (!project.cuts || project.cuts.length === 0) {
      alert("먼저 STEP 3에서 [스토리 생성]을 통해 컷별 콘티를 만들어주세요.");
      return;
    }

    setIsBatchGenerating(true);
    let fallbackCount = 0;
    let firstFallbackReason = "";
    const onFallback = (reason: string) => { fallbackCount++; firstFallbackReason ||= reason; };

    // 표지 포함 설정 시 표지 먼저 생성
    if (project.includeCover && !project.coverImageUrl) {
      try {
        setIsCoverGenerating(true);
        const cover = await generateCoverImage(apiKey, project, onFallback);
        onChangeProject({ coverImageUrl: cover });
      } catch (err) {
        console.warn("Cover generation error in batch:", err);
      } finally {
        setIsCoverGenerating(false);
      }
    }

    // 각 컷 순차 생성
    const currentCuts = [...project.cuts];
    for (let i = 0; i < currentCuts.length; i++) {
      const cut = currentCuts[i];
      setGeneratingCutIndices((prev) => [...prev, cut.cutIndex]);

      try {
        const imgUrl = await generateCutImage(apiKey, cut, project, onFallback);
        currentCuts[i] = { ...cut, imageUrl: imgUrl };
        onChangeProject({ cuts: [...currentCuts] });
      } catch (err) {
        console.warn(`Cut ${cut.cutIndex} generation error:`, err);
      } finally {
        setGeneratingCutIndices((prev) => prev.filter((idx) => idx !== cut.cutIndex));
      }
    }

    setIsBatchGenerating(false);
    if (fallbackCount > 0) {
      alert(`${fallbackCount}장은 AI(Gemini) 그림 생성에 실패해 무료 대체 그림을 넣었습니다. 원인: ${firstFallbackReason}`);
    }
  };

  // 4. 전체 이어붙여 저장 (JPG)
  const handleDownloadMergedJpg = () => {
    mergeAndDownloadLongScrollJpg(
      project.cuts || [],
      project.includeCover ? project.coverImageUrl : undefined,
      project.title
    );
  };

  // 5. 이미지 일괄 저장 (.zip)
  const handleDownloadZip = () => {
    downloadAllImagesAsZip(
      project.cuts || [],
      project.includeCover ? project.coverImageUrl : undefined,
      project.title,
      project.scriptText
    );
  };

  const totalCutsCount = project.cuts?.length || 0;
  const completedCutsCount = project.cuts?.filter((c) => Boolean(c.imageUrl)).length || 0;

  return (
    <div className="space-y-6">
      {/* Section Header Card */}
      <div className="bg-[#121620] rounded-2xl border border-[#232b3e] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
              4
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                웹툰 제작 & 세로 스크롤 뷰어 (STEP 4)
              </h2>
              <p className="text-xs text-slate-400">
                콘티에 맞추어 고화질 일러스트를 일괄 렌더링하고, 세로 스크롤 웹툰으로 합성하여 다운로드합니다.
              </p>
            </div>
          </div>

          {/* Quick Download Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadZip}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-400 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            >
              <FileArchive className="w-4 h-4" />
              <span>이미지 일괄 저장 (.zip)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadMergedJpg}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-indigo-400 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              <Download className="w-4 h-4" />
              <span>전체 이어붙여 저장 (JPG)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="bg-[#121620] rounded-2xl border border-[#232b3e] p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white">제작 진행 상황:</span>
            <span className="px-2.5 py-0.5 text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg">
              {completedCutsCount} / {totalCutsCount} 컷 완료
            </span>
          </div>
          {project.includeCover && (
            <span className="text-[11px] font-bold text-slate-400">
              (표지: {project.coverImageUrl ? "완료" : "대기 중"})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-xl border border-[#232b3e] text-xs font-bold">
            <button
              type="button"
              onClick={() => setPreviewMode("scroll")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                previewMode === "scroll"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>세로 스크롤 뷰</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("grid")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                previewMode === "grid"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>그리드 카드 뷰</span>
            </button>
          </div>

          {/* 원고 일괄 제작 시작 버튼 */}
          <button
            type="button"
            onClick={handleBatchGenerate}
            disabled={isBatchGenerating || totalCutsCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-black transition shadow-lg shadow-indigo-950/40 cursor-pointer"
          >
            {isBatchGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span>
              {isBatchGenerating
                ? "원고 일괄 제작 진행 중..."
                : `원고 ${totalCutsCount}장 일괄 제작 시작`}
            </span>
          </button>
        </div>
      </div>

      {/* Content Canvas / View Area */}
      {previewMode === "scroll" ? (
        /* 1. 세로 스크롤 뷰어 (실제 네이버 웹툰 스크롤 뷰) */
        <div className="bg-[#0a0d14] rounded-2xl border border-[#232b3e] p-6 flex justify-center">
          <div className="w-full max-w-[690px] bg-black rounded-2xl shadow-2xl border border-[#232b3e] overflow-hidden">
            {/* Webtoon Header Info */}
            <div className="p-6 text-center border-b border-[#232b3e] bg-[#121620] space-y-1">
              <h3 className="text-lg font-black text-white tracking-tight">
                {project.title || "제목 없음"}
              </h3>
              <p className="text-xs text-slate-400">
                글/그림: {project.author || "웹툰작가"} · 제 {project.chapterCount || 1}화
              </p>
            </div>

            {/* Main Cover Section */}
            {project.includeCover && (
              <div className="p-4 border-b border-[#232b3e] bg-[#121620]/60">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
                    // 메인 표지
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateCover}
                    disabled={isCoverGenerating}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer disabled:opacity-50"
                  >
                    {isCoverGenerating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    <span>{project.coverImageUrl ? "표지 재생성" : "메인 표지만 생성"}</span>
                  </button>
                </div>

                <div className="w-full rounded-xl overflow-hidden bg-[#0a0d14] border border-[#232b3e] aspect-[3/4] flex items-center justify-center relative">
                  {project.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.coverImageUrl}
                      alt="메인 표지"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2 text-slate-500">
                      <Sparkles className="w-8 h-8 mx-auto text-slate-400" />
                      <p className="text-xs font-bold text-slate-300">표지 생성 대기 중</p>
                      <button
                        type="button"
                        onClick={handleGenerateCover}
                        disabled={isCoverGenerating}
                        className="px-3 py-1.5 rounded-lg bg-[#181d2a] border border-[#232b3e] hover:bg-[#232b3e] text-slate-200 text-xs font-bold transition cursor-pointer"
                      >
                        {isCoverGenerating ? "표지 생성 중..." : "메인 표지만 생성"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scroll Cuts Stream */}
            <div className="divide-y divide-[#232b3e]">
              {project.cuts && project.cuts.length > 0 ? (
                project.cuts.map((cut, idx) => {
                  const isGenerating = generatingCutIndices.includes(cut.cutIndex);

                  return (
                    <div key={cut.cutIndex || idx} className="p-4 sm:p-6 space-y-4 bg-black">
                      {/* Cut Image */}
                      <div className="w-full rounded-xl overflow-hidden bg-[#0a0d14] border border-[#232b3e] aspect-[3/4] flex items-center justify-center relative">
                        {cut.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cut.imageUrl}
                            alt={`CUT #${cut.cutIndex}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-6 space-y-2 text-slate-500">
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-8 h-8 mx-auto text-indigo-400 animate-spin" />
                                <p className="text-xs font-bold text-indigo-300">
                                  CUT #{cut.cutIndex} 렌더링 중...
                                </p>
                              </>
                            ) : (
                              <>
                                <Film className="w-8 h-8 mx-auto text-slate-400" />
                                <p className="text-xs font-bold text-slate-300">
                                  CUT #{cut.cutIndex} 대기 중
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateSingleCut(cut, idx)}
                                  className="px-3 py-1.5 rounded-lg bg-[#181d2a] border border-[#232b3e] hover:bg-[#232b3e] text-slate-200 text-xs font-bold transition cursor-pointer"
                                >
                                  이 컷만 생성
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Cut Number Tag */}
                        <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white text-[10px] font-black border border-[#232b3e]">
                          CUT #{cut.cutIndex}
                        </div>
                      </div>

                      {/* Dialogue Bubble */}
                      {cut.dialogue && (
                        <div className="flex justify-center px-4">
                          <div className="max-w-md px-5 py-3 rounded-2xl bg-[#121620] border border-indigo-500/30 shadow-md text-center">
                            <p className="text-xs sm:text-sm font-bold text-slate-100 leading-snug">
                              {cut.dialogue}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-16 text-center text-slate-500 space-y-2">
                  <Film className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-300">생성할 컷이 없습니다.</p>
                  <p className="text-[11px] text-slate-400">먼저 STEP 3에서 스토리를 생성해주세요.</p>
                </div>
              )}
            </div>

            {/* Webtoon Footer */}
            <div className="p-8 text-center bg-[#121620] border-t border-[#232b3e] text-xs text-slate-400 font-medium">
              - 제 {project.chapterCount || 1}화 끝 -
            </div>
          </div>
        </div>
      ) : (
        /* 2. 그리드 카드 뷰 */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {project.cuts?.map((cut, idx) => {
            const isGenerating = generatingCutIndices.includes(cut.cutIndex);

            return (
              <div
                key={cut.cutIndex || idx}
                className="bg-[#121620] rounded-2xl border border-[#232b3e] overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div className="aspect-[3/4] bg-[#0a0d14] relative flex items-center justify-center">
                  {cut.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cut.imageUrl}
                      alt={`CUT #${cut.cutIndex}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-500 space-y-1">
                      {isGenerating ? (
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                      ) : (
                        <Film className="w-6 h-6 mx-auto text-slate-400" />
                      )}
                      <p className="text-xs font-bold text-slate-300">
                        {isGenerating ? "렌더링 중..." : `CUT #${cut.cutIndex}`}
                      </p>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-black border border-[#232b3e]">
                    #{cut.cutIndex} {cut.cameraAngle}
                  </span>
                </div>

                <div className="p-4 space-y-2 border-t border-[#232b3e]">
                  <p className="text-xs text-slate-300 line-clamp-2">{cut.description}</p>
                  {cut.dialogue && (
                    <p className="text-xs font-bold text-indigo-300 bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
                      &quot;{cut.dialogue}&quot;
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleGenerateSingleCut(cut, idx)}
                    disabled={isGenerating}
                    className="w-full py-1.5 text-xs font-bold rounded-lg border border-[#232b3e] hover:bg-[#181d2a] text-slate-200 transition cursor-pointer"
                  >
                    {cut.imageUrl ? "이 컷 재생성" : "생성하기"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* v1.15 인스타그램에 바로 게시(자동 포스팅 1차) — 컷 하나 = 캐러셀 한 장 */}
      <InstagramPublishPanel project={project} />

      {/* Prev Step Button */}
      <div className="flex items-center justify-start pt-4">
        <button
          type="button"
          onClick={onPrevStep}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#232b3e] hover:bg-[#181d2a] text-slate-300 text-xs font-bold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>이전: 시나리오 콘티 생성</span>
        </button>
      </div>
    </div>
  );
}
