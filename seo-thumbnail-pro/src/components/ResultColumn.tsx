"use client";

import React, { useState } from "react";
import {
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  Maximize2,
  Loader2,
  RefreshCw,
  Sparkles,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

interface ResultColumnProps {
  imageResult: string | null;
  usedPrompt: string | null;
  isGeneratingImage: boolean;
  onGenerateImage: (feedback?: string) => void;
  onOpenFullscreen: () => void;
  errorMessage: string | null;
  hasTitle: boolean;
}

export default function ResultColumn({
  imageResult,
  usedPrompt,
  isGeneratingImage,
  onGenerateImage,
  onOpenFullscreen,
  errorMessage,
  hasTitle,
}: ResultColumnProps) {
  const [feedback, setFeedback] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleDownload = () => {
    if (!imageResult) return;
    const a = document.createElement("a");
    a.href = imageResult;
    a.download = `youtube-thumbnail-${Date.now()}.png`;
    a.click();
  };

  const handleCopyPrompt = () => {
    if (!usedPrompt) return;
    navigator.clipboard.writeText(usedPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleApplyFeedback = () => {
    if (!feedback.trim()) return;
    onGenerateImage(feedback.trim());
    setFeedback("");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 flex flex-col gap-5">
      {/* Step Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div className="flex items-center gap-1.5 text-slate-900 font-bold text-base">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            <h2>결과물</h2>
          </div>
        </div>

        {/* Action buttons (when image exists) */}
        {imageResult && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              title="사용한 프롬프트 복사"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedPrompt ? "복사됨" : "프롬프트"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors"
              title="1080p 고화질 다운로드"
            >
              <Download className="w-3.5 h-3.5" />
              다운로드
            </button>
          </div>
        )}
      </div>

      {/* Main Generation Trigger Button */}
      <div>
        <button
          onClick={() => onGenerateImage()}
          disabled={isGeneratingImage || !hasTitle}
          className="w-full py-4 px-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white rounded-2xl text-sm sm:text-base font-extrabold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 cursor-pointer disabled:cursor-not-allowed"
        >
          {isGeneratingImage ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>16:9 고화질 썸네일 렌더링 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>썸네일 생성하기</span>
            </>
          )}
        </button>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed break-all">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* Result Display Area */}
      <div className="flex-1 flex flex-col justify-center">
        {imageResult ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Image Preview Card */}
            <div className="relative group rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageResult}
                alt="Generated Thumbnail"
                className="w-full h-full object-cover"
              />
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={onOpenFullscreen}
                  className="p-3 bg-white/90 hover:bg-white text-slate-900 rounded-full shadow-lg backdrop-blur-xs transition-transform hover:scale-105"
                  title="전체화면 확대"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg transition-transform hover:scale-105"
                  title="PNG 다운로드"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* AI Feedback & Iteration Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                결과물 수정 요청 (AI 피드백)
              </label>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                현재 썸네일 구도를 유지하면서 특정 요소만 바꾸고 싶다면 피드백을 입력하세요.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleApplyFeedback();
                  }}
                  placeholder="예: 인물의 표정을 더 놀란 표정으로 / 배경을 사이버펑크 네온으로 변경"
                  className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleApplyFeedback}
                  disabled={isGeneratingImage || !feedback.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  수정 생성
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 sm:h-80 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center bg-slate-50/50">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm mb-1">
              생성된 썸네일이 아직 없습니다
            </h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              1단계 기획에서 A/B 전략을 수립하고, 2단계 상세 설정을 마친 뒤 상단의 [썸네일 생성하기] 버튼을 눌러주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
