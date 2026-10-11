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
      const coverUrl = await generateCoverImage(apiKey, project);
      onChangeProject({ coverImageUrl: coverUrl });
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
      const imgUrl = await generateCutImage(apiKey, cut, project);
      const updatedCuts = [...(project.cuts || [])];
      updatedCuts[index] = { ...cut, imageUrl: imgUrl, isGenerating: false };
      onChangeProject({ cuts: updatedCuts });
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

    // 표지 포함 설정 시 표지 먼저 생성
    if (project.includeCover && !project.coverImageUrl) {
      try {
        setIsCoverGenerating(true);
        const cover = await generateCoverImage(apiKey, project);
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
        const imgUrl = await generateCutImage(apiKey, cut, project);
        currentCuts[i] = { ...cut, imageUrl: imgUrl };
        onChangeProject({ cuts: [...currentCuts] });
      } catch (err) {
        console.warn(`Cut ${cut.cutIndex} generation error:`, err);
      } finally {
        setGeneratingCutIndices((prev) => prev.filter((idx) => idx !== cut.cutIndex));
      }
    }

    setIsBatchGenerating(false);
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
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              4
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                웹툰 제작 & 세로 스크롤 뷰어 (STEP 4)
              </h2>
              <p className="text-xs text-slate-500">
                콘티에 맞추어 고화질 일러스트를 일괄 렌더링하고, 세로 스크롤 웹툰으로 합성하여 다운로드합니다.
              </p>
            </div>
          </div>

          {/* Quick Download Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadZip}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <FileArchive className="w-4 h-4 text-indigo-600" />
              <span>이미지 일괄 저장 (.zip)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadMergedJpg}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>전체 이어붙여 저장 (JPG)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900">제작 진행 상황:</span>
            <span className="px-2.5 py-0.5 text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
              {completedCutsCount} / {totalCutsCount} 컷 완료
            </span>
          </div>
          {project.includeCover && (
            <span className="text-[11px] font-bold text-slate-500">
              (표지: {project.coverImageUrl ? "완료" : "대기 중"})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setPreviewMode("scroll")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                previewMode === "scroll"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ScrollText className="w-3.5 h-3.5 text-emerald-600" />
              <span>세로 스크롤 뷰</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("grid")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                previewMode === "grid"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>그리드 카드 뷰</span>
            </button>
          </div>

          {/* 원고 일괄 제작 시작 버튼 */}
          <button
            type="button"
            onClick={handleBatchGenerate}
            disabled={isBatchGenerating || totalCutsCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
          >
            {isBatchGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-400" />
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
        <div className="bg-slate-100/80 rounded-2xl border border-slate-200/90 p-6 flex justify-center">
          <div className="w-full max-w-[690px] bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            {/* Webtoon Header Info */}
            <div className="p-6 text-center border-b border-slate-100 bg-slate-50/50 space-y-1">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {project.title || "제목 없음"}
              </h3>
              <p className="text-xs text-slate-500">
                글/그림: {project.author || "웹툰작가"} · 제 {project.chapterCount || 1}화
              </p>
            </div>

            {/* Main Cover Section */}
            {project.includeCover && (
              <div className="p-4 border-b border-slate-200/80 bg-slate-50/30">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                    // 메인 표지
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateCover}
                    disabled={isCoverGenerating}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-50"
                  >
                    {isCoverGenerating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    <span>{project.coverImageUrl ? "표지 재생성" : "메인 표지만 생성"}</span>
                  </button>
                </div>

                <div className="w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-[3/4] flex items-center justify-center relative">
                  {project.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.coverImageUrl}
                      alt="메인 표지"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2 text-slate-400">
                      <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">표지 생성 대기 중</p>
                      <button
                        type="button"
                        onClick={handleGenerateCover}
                        disabled={isCoverGenerating}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        {isCoverGenerating ? "표지 생성 중..." : "메인 표지만 생성"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scroll Cuts Stream */}
            <div className="divide-y divide-slate-100">
              {project.cuts && project.cuts.length > 0 ? (
                project.cuts.map((cut, idx) => {
                  const isGenerating = generatingCutIndices.includes(cut.cutIndex);

                  return (
                    <div key={cut.cutIndex || idx} className="p-4 sm:p-6 space-y-4">
                      {/* Cut Image */}
                      <div className="w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-[3/4] flex items-center justify-center relative">
                        {cut.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cut.imageUrl}
                            alt={`CUT #${cut.cutIndex}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-6 space-y-2 text-slate-400">
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                                <p className="text-xs font-bold text-indigo-600">
                                  CUT #{cut.cutIndex} 렌더링 중...
                                </p>
                              </>
                            ) : (
                              <>
                                <Film className="w-8 h-8 mx-auto text-slate-300" />
                                <p className="text-xs font-bold text-slate-600">
                                  CUT #{cut.cutIndex} 대기 중
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateSingleCut(cut, idx)}
                                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                                >
                                  이 컷만 생성
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Cut Number Tag */}
                        <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-2xs text-white text-[10px] font-black">
                          CUT #{cut.cutIndex}
                        </div>
                      </div>

                      {/* Dialogue Bubble */}
                      {cut.dialogue && (
                        <div className="flex justify-center px-4">
                          <div className="max-w-md px-5 py-3 rounded-2xl bg-white border border-slate-300 shadow-2xs text-center">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              {cut.dialogue}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-16 text-center text-slate-400 space-y-2">
                  <Film className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">생성할 컷이 없습니다.</p>
                  <p className="text-[11px]">먼저 STEP 3에서 스토리를 생성해주세요.</p>
                </div>
              )}
            </div>

            {/* Webtoon Footer */}
            <div className="p-8 text-center bg-slate-50 border-t border-slate-100 text-xs text-slate-500 font-medium">
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
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between"
              >
                <div className="aspect-[3/4] bg-slate-100 relative flex items-center justify-center">
                  {cut.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cut.imageUrl}
                      alt={`CUT #${cut.cutIndex}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-400 space-y-1">
                      {isGenerating ? (
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                      ) : (
                        <Film className="w-6 h-6 mx-auto text-slate-300" />
                      )}
                      <p className="text-xs font-bold text-slate-600">
                        {isGenerating ? "렌더링 중..." : `CUT #${cut.cutIndex}`}
                      </p>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-black">
                    #{cut.cutIndex} {cut.cameraAngle}
                  </span>
                </div>

                <div className="p-4 space-y-2 border-t border-slate-100">
                  <p className="text-xs text-slate-700 line-clamp-2">{cut.description}</p>
                  {cut.dialogue && (
                    <p className="text-xs font-bold text-indigo-900 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                      &quot;{cut.dialogue}&quot;
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleGenerateSingleCut(cut, idx)}
                    disabled={isGenerating}
                    className="w-full py-1.5 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-50 transition cursor-pointer"
                  >
                    {cut.imageUrl ? "이 컷 재생성" : "생성하기"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Prev Step Button */}
      <div className="flex items-center justify-start pt-4">
        <button
          type="button"
          onClick={onPrevStep}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>이전: 시나리오 콘티 생성</span>
        </button>
      </div>
    </div>
  );
}
