"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, Play, Film } from "lucide-react";
import { ImageLightboxModal } from "@/components/ui/ImageLightboxModal";
import { isVideoUrl } from "@/lib/mediaRetention";

interface PostMediaViewerProps {
  videoUrl?: string | null;
  imageUrl?: string | null;
}

export function PostMediaViewer({ videoUrl, imageUrl }: PostMediaViewerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // 이미지 및 동영상 URL 목록 파싱 (혼합 캐러셀 지원)
  const rawUrls: string[] = [];
  if (imageUrl) {
    rawUrls.push(...imageUrl.split(",").map((u) => u.trim()).filter(Boolean));
  }
  if (videoUrl) {
    const vUrls = videoUrl.split(",").map((u) => u.trim()).filter(Boolean);
    for (const v of vUrls) {
      if (!rawUrls.includes(v)) rawUrls.push(v);
    }
  }

  if (rawUrls.length === 0) return null;

  const mediaList = rawUrls.map((url) => ({
    url,
    isVideo: isVideoUrl(url),
  }));

  const currentMedia = mediaList[activeIdx] ?? mediaList[0];
  const allImageUrls = mediaList.filter((m) => !m.isVideo).map((m) => m.url);
  const currentImageIdxInAll = allImageUrls.indexOf(currentMedia.url);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev + 1) % mediaList.length);
  };

  return (
    <div className="relative overflow-hidden bg-neutral-900 select-none">
      {/* 메인 미디어 뷰어 영역 */}
      <div className="relative max-h-[460px] w-full overflow-hidden flex items-center justify-center bg-neutral-950">
        {currentMedia.isVideo ? (
          <div className="w-full flex items-center justify-center bg-black">
            <video
              key={currentMedia.url}
              src={currentMedia.url}
              controls
              className="max-h-[460px] w-full object-contain"
            />
          </div>
        ) : (
          <div
            onClick={() => {
              if (currentImageIdxInAll !== -1) {
                setLightboxOpen(true);
              }
            }}
            className="group relative max-h-[460px] w-full overflow-hidden cursor-pointer flex items-center justify-center bg-neutral-950"
            title="클릭하여 전체 이미지 확대 보기"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentMedia.url}
              alt={`게시글 미디어 ${activeIdx + 1}`}
              className="max-h-[460px] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />

            {/* 호버 시 돋보기 오버레이 */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-xs transition-all transform scale-95 group-hover:scale-100 flex items-center gap-1.5 shadow-lg border border-white/10">
                <ZoomIn className="h-4 w-4 text-amber-300" />
                <span>전체 화면 확대 보기</span>
              </span>
            </div>
          </div>
        )}

        {/* 여러 개일 때 카운트 배지 */}
        {mediaList.length > 1 && (
          <span className="absolute top-3 left-3 rounded-lg bg-black/75 px-2.5 py-1 text-xs font-extrabold text-white shadow-md backdrop-blur-xs border border-white/10 flex items-center gap-1.5">
            {currentMedia.isVideo ? <span>🎬 영상</span> : <span>📷 이미지</span>}
            <span>
              {activeIdx + 1} / {mediaList.length}
            </span>
          </span>
        )}

        {/* 여러 개일 때 좌우 넘기기 버튼 */}
        {mediaList.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full bg-black/55 hover:bg-black/80 text-white p-2 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md backdrop-blur-xs border border-white/10 z-10"
              title="이전 미디어"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-black/55 hover:bg-black/80 text-white p-2 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md backdrop-blur-xs border border-white/10 z-10"
              title="다음 미디어"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* 여러 개일 때 하단 썸네일 스트립 */}
      {mediaList.length > 1 && (
        <div className="flex items-center gap-2 p-2.5 bg-neutral-900 border-t border-neutral-800 overflow-x-auto">
          {mediaList.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer bg-neutral-800 flex items-center justify-center ${
                idx === activeIdx
                  ? "border-amber-400 scale-105 shadow-md shadow-amber-400/30 ring-1 ring-amber-400"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {item.isVideo ? (
                <div className="relative h-full w-full bg-neutral-800 flex flex-col items-center justify-center text-white">
                  <Film className="h-5 w-5 text-amber-400" />
                  <span className="text-[9px] font-bold text-neutral-300">영상</span>
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Play className="h-3.5 w-3.5 fill-white text-white" />
                  </div>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.url} alt={`미니 썸네일 ${idx + 1}`} className="h-full w-full object-cover" />
              )}
              <span className="absolute bottom-0.5 right-0.5 text-[9px] font-black bg-black/80 text-white px-1 rounded-xs">
                {idx + 1}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 전체 화면 라이트박스 모달 (이미지인 경우) */}
      {allImageUrls.length > 0 && (
        <ImageLightboxModal
          isOpen={lightboxOpen}
          images={allImageUrls}
          currentIndex={Math.max(0, currentImageIdxInAll)}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={(newImgIdx) => {
            const targetUrl = allImageUrls[newImgIdx];
            const foundIdx = mediaList.findIndex((m) => m.url === targetUrl);
            if (foundIdx !== -1) setActiveIdx(foundIdx);
          }}
        />
      )}
    </div>
  );
}
