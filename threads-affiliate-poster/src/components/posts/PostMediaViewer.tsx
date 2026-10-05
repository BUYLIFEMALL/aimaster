"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { ImageLightboxModal } from "@/components/ui/ImageLightboxModal";

interface PostMediaViewerProps {
  videoUrl?: string | null;
  imageUrl?: string | null;
}

export function PostMediaViewer({ videoUrl, imageUrl }: PostMediaViewerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (videoUrl) {
    return (
      <div className="overflow-hidden bg-black">
        <video src={videoUrl} controls className="max-h-[460px] w-full object-cover" />
      </div>
    );
  }

  // 쉼표(,)로 구분된 다중 이미지 URL 파싱
  const images = imageUrl
    ? imageUrl
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  if (images.length === 0) return null;

  const currentImage = images[activeIdx] ?? images[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev + 1) % images.length);
  };

  return (
    <div className="relative overflow-hidden bg-neutral-900 select-none">
      {/* 메인 이미지 영역 (클릭 시 라이트박스 오픈) */}
      <div
        onClick={() => setLightboxOpen(true)}
        className="group relative max-h-[460px] w-full overflow-hidden cursor-pointer flex items-center justify-center bg-neutral-950"
        title="클릭하여 전체 이미지 확대 보기"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt={`게시글 이미지 ${activeIdx + 1}`}
          className="max-h-[460px] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />

        {/* 호버 시 돋보기 오버레이 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-xs transition-all transform scale-95 group-hover:scale-100 flex items-center gap-1.5 shadow-lg border border-white/10">
            <ZoomIn className="h-4 w-4 text-amber-300" />
            <span>전체 화면 확대 보기</span>
          </span>
        </div>

        {/* 여러 장일 때 카운트 배지 */}
        {images.length > 1 && (
          <span className="absolute top-3 left-3 rounded-lg bg-black/75 px-2.5 py-1 text-xs font-extrabold text-white shadow-md backdrop-blur-xs border border-white/10">
            📷 {activeIdx + 1} / {images.length}장
          </span>
        )}

        {/* 여러 장일 때 좌우 넘기기 버튼 */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full bg-black/55 hover:bg-black/80 text-white p-2 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md backdrop-blur-xs border border-white/10"
              title="이전 이미지"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-black/55 hover:bg-black/80 text-white p-2 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md backdrop-blur-xs border border-white/10"
              title="다음 이미지"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* 여러 장일 때 하단 썸네일 스트립 */}
      {images.length > 1 && (
        <div className="flex items-center gap-2 p-2.5 bg-neutral-900 border-t border-neutral-800 overflow-x-auto">
          {images.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                idx === activeIdx
                  ? "border-amber-400 scale-105 shadow-md shadow-amber-400/30 ring-1 ring-amber-400"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`미니 썸네일 ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* 전체 화면 라이트박스 모달 */}
      <ImageLightboxModal
        isOpen={lightboxOpen}
        images={images}
        currentIndex={activeIdx}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setActiveIdx}
      />
    </div>
  );
}
