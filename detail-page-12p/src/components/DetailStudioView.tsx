"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  Download,
  Smartphone,
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FolderDown,
  RefreshCw,
  Eye,
} from "lucide-react";
import { DetailPageProject, DetailScene } from "@/types/detail";
import { SceneCard } from "./SceneCard";

interface DetailStudioViewProps {
  project: DetailPageProject;
  onUpdateProject: (updated: DetailPageProject) => void;
  onBackToInput: () => void;
  onOpenApiKey: () => void;
  hasKey: boolean;
}

export function DetailStudioView({
  project,
  onUpdateProject,
  onBackToInput,
  onOpenApiKey,
  hasKey,
}: DetailStudioViewProps) {
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // 개별 씬 업데이트
  const handleUpdateScene = (updatedScene: DetailScene) => {
    const updatedScenes = project.scenes.map((s) => (s.id === updatedScene.id ? updatedScene : s));
    onUpdateProject({
      ...project,
      scenes: updatedScenes,
      updatedAt: new Date().toISOString(),
    });
  };

  // 단일 씬 이미지 생성
  const handleGenerateSingleImage = async (sceneId: string) => {
    if (!hasKey) {
      onOpenApiKey();
      return;
    }

    const targetScene = project.scenes.find((s) => s.id === sceneId);
    if (!targetScene) return;

    setGeneratingSceneId(sceneId);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: targetScene.imagePrompt,
          modelType: project.model,
          referenceImages: project.productData.productImages,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.needApiKey) onOpenApiKey();
        throw new Error(data.error || "이미지 생성 실패");
      }

      handleUpdateScene({
        ...targetScene,
        imageUrl: data.imageUrl,
        status: "completed",
      });
    } catch (err: any) {
      alert(`이미지 생성 중 오류: ${err.message}`);
    } finally {
      setGeneratingSceneId(null);
    }
  };

  // 전체 씬 일괄 렌더링
  const handleBatchGenerate = async () => {
    if (!hasKey) {
      onOpenApiKey();
      return;
    }

    const ungenerated = project.scenes.filter((s) => !s.imageUrl);
    if (ungenerated.length === 0) {
      if (!confirm("모든 씬의 이미지가 이미 생성되어 있습니다. 전체를 다시 재렌더링하시겠습니까?")) {
        return;
      }
    }

    const scenesToProcess = ungenerated.length > 0 ? ungenerated : project.scenes;
    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: scenesToProcess.length });

    let currentScenes = [...project.scenes];

    for (let i = 0; i < scenesToProcess.length; i++) {
      const sc = scenesToProcess[i];
      setBatchProgress({ current: i + 1, total: scenesToProcess.length });
      setGeneratingSceneId(sc.id);

      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: sc.imagePrompt,
            modelType: project.model,
            referenceImages: project.productData.productImages,
          }),
        });

        const data = await res.json();
        if (data.success && data.imageUrl) {
          currentScenes = currentScenes.map((s) =>
            s.id === sc.id ? { ...s, imageUrl: data.imageUrl, status: "completed" as const } : s
          );
          onUpdateProject({
            ...project,
            scenes: currentScenes,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`Error generating scene ${sc.index}:`, err);
      }
    }

    setIsBatchGenerating(false);
    setGeneratingSceneId(null);
  };

  // 통이미지 자동 합성 (HTML5 Canvas 860px 쿠팡 표준 세로 통상세페이지)
  const handleDownloadFullImage = async () => {
    setIsSynthesizing(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context를 생성할 수 없습니다.");

      const canvasWidth = 860; // 쿠팡 표준 가로 해상도
      const sceneHeight = 1147; // 3:4 비율 (860 * 4/3 = ~1147)
      const totalHeight = sceneHeight * project.scenes.length;

      canvas.width = canvasWidth;
      canvas.height = totalHeight;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, totalHeight);

      // 각 씬 순회하며 그리기
      for (let i = 0; i < project.scenes.length; i++) {
        const scene = project.scenes[i];
        const yOffset = i * sceneHeight;

        // 배경
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, yOffset, canvasWidth, sceneHeight);

        // 이미지 로딩 & 그리기
        if (scene.imageUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve) => {
            img.onload = () => {
              ctx.drawImage(img, 0, yOffset, canvasWidth, sceneHeight);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = scene.imageUrl!;
          });
        } else {
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(40, yOffset + 40, canvasWidth - 80, sceneHeight - 80);
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 32px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`SCENE #${scene.index} [${scene.badge}]`, canvasWidth / 2, yOffset + 200);
          ctx.font = "bold 44px sans-serif";
          ctx.fillText(scene.title, canvasWidth / 2, yOffset + 300);
        }

        // 상업용 오버레이 카피 배너
        ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
        ctx.fillRect(0, yOffset + sceneHeight - 200, canvasWidth, 200);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(scene.title, canvasWidth / 2, yOffset + sceneHeight - 120);

        ctx.fillStyle = "#93c5fd";
        ctx.font = "24px sans-serif";
        ctx.fillText(scene.subtitle || scene.badge, canvasWidth / 2, yOffset + sceneHeight - 65);
      }

      // 이미지 다운로드
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${project.title.replace(/\s+/g, "_")}_쿠팡12단_통상세페이지_860px.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`통이미지 합성 중 오류: ${err.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const completedCount = project.scenes.filter((s) => !!s.imageUrl).length;
  const totalCount = project.scenes.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. 상단 컨트롤 헤더 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToInput}
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
              title="제품 정보 수정으로 돌아가기"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  {project.platform === "coupang" ? "쿠팡 12단 규격" : "스마트스토어 9단"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  {project.model === "nano-banana" ? "⚡ Nano Banana" : "✨ Nano Banana2"}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 mt-1">
                {project.title}
              </h2>
            </div>
          </div>

          {/* 진행 상태 및 액션 버튼들 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                렌더링 현황: <strong>{completedCount}</strong> / {totalCount}
              </span>
            </div>

            <button
              type="button"
              onClick={handleBatchGenerate}
              disabled={isBatchGenerating}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {isBatchGenerating
                ? `일괄 렌더링 중 (${batchProgress.current}/${batchProgress.total})...`
                : "⚡ 전체 이미지 일괄 렌더링"}
            </button>

            <button
              type="button"
              onClick={handleDownloadFullImage}
              disabled={isSynthesizing}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {isSynthesizing ? "통이미지 합성 중..." : "📥 860px 통이미지 다운로드"}
            </button>
          </div>
        </div>

        {/* 일괄 진행률 바 */}
        {isBatchGenerating && (
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 transition-all duration-300 rounded-full"
              style={{
                width: `${(batchProgress.current / batchProgress.total) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* 2. 2단 레이아웃 (좌측: 씬 카드 리스트 / 우측: 실시간 스마트폰 프리뷰) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 좌측: 씬 카드 리스트 (7칸) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              12단 시퀀스 씬 리스트 ({project.scenes.length}개)
            </h3>
            <span className="text-xs text-slate-500">
              클릭하여 카피 및 비주얼 프롬프트를 자유롭게 수정하세요
            </span>
          </div>

          <div className="space-y-4">
            {project.scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                model={project.model}
                onUpdateScene={handleUpdateScene}
                onGenerateImage={handleGenerateSingleImage}
                isGeneratingImage={generatingSceneId === scene.id}
              />
            ))}
          </div>
        </div>

        {/* 우측: 스마트폰 라이브 시뮬레이터 (5칸, sticky) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>모바일 앱 실시간 라이브 뷰어</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">가로 860px 규격</span>
            </div>

            {/* 스마트폰 목업 프레임 */}
            <div className="mx-auto w-[320px] sm:w-[340px] h-[640px] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-800 relative flex flex-col">
              {/* 스피커 & 노치 */}
              <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-2 shrink-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-900/60 mr-2" />
                <div className="w-8 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* 스크롤 가능한 앱 화면 */}
              <div className="flex-1 bg-white rounded-[26px] overflow-y-auto no-scrollbar space-y-0 text-slate-900">
                {/* 상단 가상 앱 바 */}
                <div className="sticky top-0 bg-white/90 backdrop-blur-xs px-3 py-2 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold z-10">
                  <span className="text-blue-600 truncate max-w-[180px]">
                    {project.productData.productName}
                  </span>
                  <span className="text-rose-600 font-black">
                    {project.productData.discountRate ? `${project.productData.discountRate}% OFF` : ""}
                  </span>
                </div>

                {/* 12단 씬 연속 세로 스크롤 */}
                <div className="space-y-0">
                  {project.scenes.map((scene, idx) => (
                    <div key={scene.id} className="relative border-b border-slate-100">
                      {scene.imageUrl ? (
                        <div className="relative">
                          <img
                            src={scene.imageUrl}
                            alt={scene.title}
                            className="w-full h-auto object-cover"
                          />
                          <div className="p-3 bg-white">
                            <span
                              className="text-[9px] font-black px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: `${scene.accentColor || "#2563EB"}15`,
                                color: scene.accentColor || "#2563EB",
                              }}
                            >
                              {scene.badge}
                            </span>
                            <h5 className="text-xs font-black text-slate-900 mt-1 leading-snug">
                              {scene.title}
                            </h5>
                            {scene.subtitle && (
                              <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
                                {scene.subtitle}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-600 mt-1 leading-relaxed whitespace-pre-line line-clamp-3">
                              {scene.bodyText}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 text-center min-h-[160px] flex flex-col justify-center">
                          <span className="text-[9px] font-bold text-slate-400 block">
                            SCENE #{scene.index} · {scene.badge}
                          </span>
                          <p className="text-[11px] font-bold text-slate-800 mt-1">
                            {scene.title}
                          </p>
                          <p className="text-[9px] text-slate-500 mt-1 line-clamp-2 px-2">
                            {scene.bodyText}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 하단 구매 버튼 바 */}
                <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs p-2.5 border-t border-slate-200 flex items-center justify-between gap-2 z-10">
                  <div className="leading-tight">
                    <span className="text-[9px] text-slate-400 line-through block">
                      {project.productData.originalPrice ? `${project.productData.originalPrice.toLocaleString()}원` : ""}
                    </span>
                    <span className="text-xs font-black text-rose-600">
                      {project.productData.salePrice ? `${project.productData.salePrice.toLocaleString()}원` : "구매하기"}
                    </span>
                  </div>
                  <button className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">
                    바로구매
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
