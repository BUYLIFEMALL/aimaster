"use client";

import { useState } from "react";
import {
  Sparkles,
  Download,
  RefreshCw,
  Edit3,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Tag,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { DetailScene, ModelType } from "@/types/detail";

interface SceneCardProps {
  scene: DetailScene;
  model: ModelType;
  onUpdateScene: (updated: DetailScene) => void;
  onGenerateImage: (sceneId: string) => Promise<void>;
  isGeneratingImage: boolean;
}

export function SceneCard({
  scene,
  model,
  onUpdateScene,
  onGenerateImage,
  isGeneratingImage,
}: SceneCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(scene.title);
  const [editSubtitle, setEditSubtitle] = useState(scene.subtitle);
  const [editBody, setEditBody] = useState(scene.bodyText);
  const [editPrompt, setEditPrompt] = useState(scene.imagePrompt);
  const [copied, setCopied] = useState(false);

  const handleSaveEdit = () => {
    onUpdateScene({
      ...scene,
      title: editTitle,
      subtitle: editSubtitle,
      bodyText: editBody,
      imagePrompt: editPrompt,
    });
    setIsEditing(false);
  };

  const handleCopyCopy = () => {
    const text = `[${scene.badge}]\n${scene.title}\n${scene.subtitle}\n\n${scene.bodyText}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadSingle = () => {
    if (!scene.imageUrl) return;
    const link = document.createElement("a");
    link.href = scene.imageUrl;
    link.download = `scene-${scene.index.toString().padStart(2, "0")}-${scene.sectionKey}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all">
      {/* 카드 헤더 */}
      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-black font-mono">
            {scene.index.toString().padStart(2, "0")}
          </span>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: `${scene.accentColor || "#2563EB"}15`,
              color: scene.accentColor || "#2563EB",
            }}
          >
            {scene.badge}
          </span>
          <span className="text-xs font-bold text-slate-800 truncate max-w-[200px] md:max-w-[300px]">
            {scene.title}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyCopy}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            title="카피 복사"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="문구 직접 편집"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 카드 바디 (2단 그리드: 좌측 이미지, 우측 카피) */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* 좌측: 비주얼 이미지 영역 (5칸) */}
        <div className="md:col-span-5 flex flex-col justify-between">
          <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 group">
            {scene.imageUrl ? (
              <>
                <img
                  src={scene.imageUrl}
                  alt={scene.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSingle}
                    className="p-2 bg-white text-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-100 flex items-center gap-1 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> 다운로드
                  </button>
                  <button
                    type="button"
                    onClick={() => onGenerateImage(scene.id)}
                    disabled={isGeneratingImage}
                    className="p-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 flex items-center gap-1 shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingImage ? "animate-spin" : ""}`} /> 재렌더링
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-slate-50">
                {isGeneratingImage ? (
                  <div className="space-y-2">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-blue-600">Nano Banana 렌더링 중...</p>
                    <p className="text-[10px] text-slate-400">초고해상도 제품 비주얼 생성</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">이미지 미생성 상태</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 px-2">
                        {scene.imagePrompt}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onGenerateImage(scene.id)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 mx-auto"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" /> 이미지 렌더링
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 우측: 카피 및 세부 내용 영역 (7칸) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-3">
          {isEditing ? (
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">헤드카피</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">서브카피</label>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">상세 본문</label>
                <textarea
                  rows={3}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">비주얼 영문 프롬프트</label>
                <textarea
                  rows={2}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                >
                  저장 완료
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h4 className="text-base font-black text-slate-900 leading-snug">
                  {scene.title}
                </h4>
                {scene.subtitle && (
                  <p className="text-xs font-semibold text-blue-600 mt-1">
                    {scene.subtitle}
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line">
                {scene.bodyText}
              </p>

              {scene.keyPoints && scene.keyPoints.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    CHECK POINTS
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {scene.keyPoints.map((pt, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        {pt}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1">
                <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                  AI 비주얼 렌더링 프롬프트
                </span>
                <p className="text-[10px] text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border border-slate-200/60 line-clamp-2">
                  {scene.imagePrompt}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
