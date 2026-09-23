"use client";

import { useState } from "react";
import { Download, Copy, Check, Maximize2, X, Sparkles } from "lucide-react";

interface ImageResultViewerProps {
  imageUrl: string;
  revisedPrompt?: string;
  providerName: string;
  modelName: string;
  originalPrompt: string;
}

export function ImageResultViewer({
  imageUrl,
  revisedPrompt,
  providerName,
  modelName,
  originalPrompt,
}: ImageResultViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(revisedPrompt || originalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `ai_image_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback: open image in new tab if direct download blocked by CORS
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-emerald-400">
            생성 완료! [{providerName} — {modelName}]
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "프롬프트 복사됨" : "프롬프트 복사"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            이미지 다운로드
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="relative group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <img
            src={imageUrl}
            alt="AI Generated"
            className="w-full object-contain max-h-[480px] rounded-xl"
          />
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute top-3 right-3 p-2 rounded-lg bg-zinc-950/80 text-zinc-300 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity border border-zinc-800"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <span className="font-semibold text-zinc-400">원본 입력 프롬프트:</span>
            <p className="font-mono text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 leading-relaxed">
              {originalPrompt}
            </p>
          </div>

          {revisedPrompt && revisedPrompt !== originalPrompt && (
            <div className="space-y-1">
              <span className="font-semibold text-emerald-400">AI 보정 프롬프트 (Revised Prompt):</span>
              <p className="font-mono text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 leading-relaxed">
                {revisedPrompt}
              </p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 space-y-1">
            <div><strong className="text-zinc-300">플랫폼:</strong> {providerName}</div>
            <div><strong className="text-zinc-300">사용 모델:</strong> {modelName}</div>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 p-2 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={imageUrl}
            alt="AI Generated Fullscreen"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
