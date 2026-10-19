"use client";

import { useState } from "react";
import {
  Download,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  Wand2,
} from "lucide-react";
import type { GenerationResult, HistoryItem } from "@/types/influencer";
import { InstagramPublishPanel } from "./InstagramPublishPanel";

interface ImageDisplayProps {
  result: GenerationResult;
  onRefineImage: (feedback: string) => void;
  onRegenerateCaption: (feedback: string) => void;
  isGeneratingCaption?: boolean;
  history?: HistoryItem[];
}

export function ImageDisplay({
  result,
  onRefineImage,
  onRegenerateCaption,
  isGeneratingCaption = false,
  history = [],
}: ImageDisplayProps) {
  const [selectedCaptionTab, setSelectedCaptionTab] = useState<number>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [captionFeedback, setCaptionFeedback] = useState("");
  const [imageFeedback, setImageFeedback] = useState("");

  const handleCopyCaption = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownload = () => {
    if (!result.imageUrl) return;
    const a = document.createElement("a");
    a.href = result.imageUrl;
    a.download = `ai-influencer-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <main className="flex-1 bg-if-canvas flex flex-col h-screen overflow-hidden">
      {/* 본문 콘텐츠 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
        {result.imageUrl ? (
          <div className="w-full max-w-2xl bg-if-surface rounded-2xl border border-if-border shadow-md p-4 space-y-4">
            {/* 생성된 화보 이미지 */}
            <div className="w-full max-h-[60vh] rounded-xl overflow-hidden bg-if-canvas flex items-center justify-center relative group">
              <img
                src={result.imageUrl}
                alt="AI 인플루언서 생성 화보"
                className="max-h-[60vh] w-auto object-contain mx-auto"
              />
              {/* 다운로드 버튼 */}
              <div className="absolute bottom-3 right-3">
                <button
                  onClick={handleDownload}
                  className="px-3.5 py-2 rounded-xl bg-black/70 hover:bg-black text-white shadow-lg transition-transform hover:scale-105 flex items-center gap-1.5 text-xs font-bold"
                  title="고화질 원본 다운로드"
                >
                  <Download className="w-4 h-4" />
                  <span>이미지 다운로드</span>
                </button>
              </div>
            </div>

            {/* 인스타그램 캡션 스튜디오 */}
            <div className="p-4 rounded-xl bg-if-raised border border-if-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-pink-500" />
                  <h4 className="font-bold text-if-text text-xs md:text-sm">
                    인스타그램 캡션
                  </h4>
                </div>
                <div className="flex items-center gap-1 bg-if-raised p-0.5 rounded-lg text-[11px]">
                  {["감성/스토리", "위트/트렌디", "질문/소통"].map((label, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedCaptionTab(idx)}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        selectedCaptionTab === idx
                          ? "bg-if-surface text-pink-400 shadow-2xs"
                          : "text-if-muted hover:text-if-text"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 캡션 본문 & 복사 버튼 */}
              <div className="p-3.5 rounded-lg bg-if-surface border border-if-border relative group">
                <div className="text-xs text-if-text whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto">
                  {result.captions[selectedCaptionTab] || "캡션을 작성하고 있습니다..."}
                </div>
                <div className="pt-2 mt-2 border-t border-if-border flex justify-end">
                  <button
                    onClick={() =>
                      handleCopyCaption(
                        result.captions[selectedCaptionTab] || "",
                        selectedCaptionTab
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copiedIndex === selectedCaptionTab ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>캡션 복사</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 캡션 수정 요청 (다시 작성) */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="캡션 수정 요청사항 (예: 조금 더 신나는 톤으로 바꿔줘)"
                  value={captionFeedback}
                  onChange={(e) => setCaptionFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && captionFeedback.trim() && !isGeneratingCaption) {
                      onRegenerateCaption(captionFeedback.trim());
                      setCaptionFeedback("");
                    }
                  }}
                  className="flex-1 bg-if-surface border border-if-border rounded-lg px-3 py-1.5 text-xs text-if-text focus:ring-1 focus:ring-pink-500 focus:border-pink-500 placeholder:text-if-muted"
                />
                <button
                  onClick={() => {
                    if (captionFeedback.trim() && !isGeneratingCaption) {
                      onRegenerateCaption(captionFeedback.trim());
                      setCaptionFeedback("");
                    }
                  }}
                  disabled={isGeneratingCaption || !captionFeedback.trim()}
                  className="px-3.5 py-1.5 rounded-lg if-gradient text-white font-semibold text-xs hover:brightness-110 disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1"
                >
                  {isGeneratingCaption ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : null}
                  <span>다시 작성</span>
                </button>
              </div>
            </div>

            {/* 이미지 수정 요청 (Refinement) */}
            <div className="p-3.5 rounded-xl bg-if-raised border border-if-border space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-if-text">
                <Wand2 className="w-3.5 h-3.5 text-pink-500" />
                <span>이미지 수정 요청</span>
              </div>
              <p className="text-[11px] text-if-muted">
                결과물이 마음에 드시나요? &apos;머리를 조금 더 밝게 해줘&apos; 혹은 &apos;배경에 카페 분위기를 더해줘&apos; 라고 요청하세요.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="예: 조금 더 밝고 화사하게 해줘, 배경에 바다를 넣어줘..."
                  value={imageFeedback}
                  onChange={(e) => setImageFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && imageFeedback.trim() && !result.loading) {
                      onRefineImage(imageFeedback.trim());
                      setImageFeedback("");
                    }
                  }}
                  className="flex-1 bg-if-surface border border-if-border rounded-lg px-3 py-2 text-xs text-if-text focus:ring-1 focus:ring-pink-500 focus:border-pink-500 placeholder:text-if-muted"
                />
                <button
                  onClick={() => {
                    if (imageFeedback.trim() && !result.loading) {
                      onRefineImage(imageFeedback.trim());
                      setImageFeedback("");
                    }
                  }}
                  disabled={result.loading || !imageFeedback.trim()}
                  className="px-4 py-2 rounded-lg if-gradient text-white font-semibold text-xs hover:brightness-110 disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${result.loading ? "animate-spin" : ""}`} />
                  <span>수정 요청</span>
                </button>
              </div>
            </div>

            {/* v1.14 인스타그램에 바로 게시(자동 포스팅 1차) */}
            {result.imageUrl && !result.loading && (
              <InstagramPublishPanel
                currentImage={result.imageUrl}
                caption={result.captions[selectedCaptionTab] || ""}
                history={history}
              />
            )}
          </div>
        ) : (
          /* 생성 전 안내 카드 (2026-10-17 디자인 리뉴얼: 한글 안내 + 캐릭터 + 단계 칩) */
          <div className="relative w-full max-w-lg overflow-hidden p-10 rounded-2xl border border-if-border bg-if-surface flex flex-col items-center justify-center text-center space-y-4">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full if-gradient opacity-20 blur-3xl" />
            <div className="relative w-16 h-16 rounded-full if-gradient flex items-center justify-center text-3xl shadow-lg shadow-pink-500/20">
              📸
            </div>
            <div className="relative space-y-1.5">
              <h3 className="font-bold text-if-text text-lg tracking-tight">
                나만의 <span className="if-gradient-text">AI 인플루언서 화보</span>를 만들어 보세요
              </h3>
              <p className="text-xs text-if-muted leading-relaxed max-w-sm">
                왼쪽 패널에서 인종, 나이, 헤어스타일, 표정 등 세부 옵션을 고른 뒤 아래 「이미지 생성」을 누르면 이곳에 화보와 인스타 캡션이 나타나요.
              </p>
            </div>
            <div className="relative flex flex-wrap justify-center gap-1.5">
              <span className="if-chip">👗 외형</span>
              <span className="if-chip">🗓️ 일과·앵글</span>
              <span className="if-chip">😊 표정·포즈</span>
              <span className="if-chip">🛍️ 광고/공구</span>
              <span className="if-chip">✨ 화보·캡션</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
