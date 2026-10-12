"use client";

import { useState } from "react";
import {
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Wand2,
  Image as ImageIcon,
  Share2,
} from "lucide-react";
import type { GenerationResult } from "@/types/influencer";

interface ImageDisplayProps {
  result: GenerationResult;
  onRefineImage: (feedback: string) => void;
  onRegenerateCaption: (feedback: string) => void;
  isGeneratingCaption?: boolean;
}

export function ImageDisplay({
  result,
  onRefineImage,
  onRegenerateCaption,
  isGeneratingCaption = false,
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
    <main className="flex-1 bg-slate-50 flex flex-col h-[calc(100vh-61px)] overflow-hidden">
      {/* 본문 콘텐츠 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6 items-start justify-center">
        {/* 좌측(또는 메인): 이미지 디스플레이 영역 */}
        <div className="w-full lg:flex-1 max-w-xl flex flex-col items-center">
          {result.imageUrl ? (
            <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-md p-3 space-y-3">
              {/* 이미지 컨테이너 */}
              <div className="w-full max-h-[65vh] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center relative group">
                <img
                  src={result.imageUrl}
                  alt="AI 인플루언서 생성 화보"
                  className="max-h-[65vh] w-auto object-contain mx-auto transition-transform duration-300"
                />
                {/* 오버레이 액션 버튼 */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md shadow-lg transition-transform hover:scale-105 flex items-center gap-1.5 text-xs font-semibold"
                    title="고화질 원본 다운로드"
                  >
                    <Download className="w-4 h-4" />
                    <span>다운로드</span>
                  </button>
                </div>
              </div>

              {/* 이미지 미세 보정 루프 채팅바 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Wand2 className="w-3.5 h-3.5 text-pink-500" />
                  <span>이미지 미세 보정 (Refinement Loop)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="예: 머리를 조금 더 밝게 해줘, 배경에 카페 분위기를 더해줘..."
                    value={imageFeedback}
                    onChange={(e) => setImageFeedback(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && imageFeedback.trim() && !result.loading) {
                        onRefineImage(imageFeedback.trim());
                        setImageFeedback("");
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                  />
                  <button
                    onClick={() => {
                      if (imageFeedback.trim() && !result.loading) {
                        onRefineImage(imageFeedback.trim());
                        setImageFeedback("");
                      }
                    }}
                    disabled={result.loading || !imageFeedback.trim()}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-black disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${result.loading ? "animate-spin" : ""}`} />
                    <span>수정 요청</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* 생성 전 안내 상태 */
            <div className="w-full h-[65vh] rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center p-8 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-100 to-rose-100 flex items-center justify-center text-pink-600 shadow-inner">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="font-bold text-slate-800 text-base">
                  나만의 AI 인플루언서를 만들어보세요
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  왼쪽 패널에서 캐릭터 외형, 하루 일과, 광고 모드, 촬영 옵션을 설정하고{" "}
                  <strong className="text-pink-600">&apos;AI 인플루언서 화보 생성&apos;</strong>{" "}
                  버튼을 눌러주세요.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 max-w-sm pt-2">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-left">
                  ✨ <strong>초현실적 리얼리티</strong>
                  <p className="text-[10px] text-slate-400 mt-0.5">30종 모공/솜털/물광 텍스처</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-left">
                  📸 <strong>지능형 시점 제어</strong>
                  <p className="text-[10px] text-slate-400 mt-0.5">거울 셀카 / 전면 / 3인칭 화보</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-left">
                  🛍️ <strong>PPL 광고 / 공구</strong>
                  <p className="text-[10px] text-slate-400 mt-0.5">제품 사진 1:1 자연스러운 합성</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-left">
                  💬 <strong>인스타 3종 캡션</strong>
                  <p className="text-[10px] text-slate-400 mt-0.5">감성 / 위트 / 질문형 + 해시태그</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 우측: 인스타그램 캡션 & 피드백 영역 */}
        {result.imageUrl && (
          <div className="w-full lg:w-[380px] xl:w-[420px] bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col space-y-4 shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-pink-500" />
                <h3 className="font-bold text-slate-900 text-sm">인스타그램 캡션 스튜디오</h3>
              </div>
              <span className="text-[11px] font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                3종 자동 생성
              </span>
            </div>

            {/* 3종 캡션 탭 */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {["감성/스토리", "위트/트렌디", "질문/소통"].map((label, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCaptionTab(idx)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedCaptionTab === idx
                      ? "bg-white text-pink-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 선택된 캡션 본문 카드 */}
            <div className="flex-1 min-h-[220px] p-4 rounded-xl bg-slate-50 border border-slate-200 relative group flex flex-col justify-between">
              <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-[300px]">
                {result.captions[selectedCaptionTab] || "캡션을 생성하고 있습니다..."}
              </div>

              {/* 원클릭 복사 버튼 */}
              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() =>
                    handleCopyCaption(
                      result.captions[selectedCaptionTab] || "",
                      selectedCaptionTab
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                >
                  {copiedIndex === selectedCaptionTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
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

            {/* 캡션 톤/멘트 수정 요청 */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-700">
                캡션 톤/멘트 수정 요청
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="예: 조금 더 신나는 말투로 바꿔줘, 할인 강조해줘..."
                  value={captionFeedback}
                  onChange={(e) => setCaptionFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && captionFeedback.trim() && !isGeneratingCaption) {
                      onRegenerateCaption(captionFeedback.trim());
                      setCaptionFeedback("");
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                />
                <button
                  onClick={() => {
                    if (captionFeedback.trim() && !isGeneratingCaption) {
                      onRegenerateCaption(captionFeedback.trim());
                      setCaptionFeedback("");
                    }
                  }}
                  disabled={isGeneratingCaption || !captionFeedback.trim()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-white font-semibold text-xs hover:bg-slate-900 disabled:opacity-50 transition-colors shrink-0"
                >
                  {isGeneratingCaption ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "다시 작성"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
