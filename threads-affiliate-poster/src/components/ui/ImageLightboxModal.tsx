"use client";

import React, { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, Download, ExternalLink } from "lucide-react";

interface ImageLightboxModalProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange?: (newIndex: number) => void;
}

export function ImageLightboxModal({
  isOpen,
  images,
  currentIndex,
  onClose,
  onIndexChange,
}: ImageLightboxModalProps) {
  const total = images.length;
  const currentImage = images[currentIndex];

  const handlePrev = useCallback(() => {
    if (total <= 1 || !onIndexChange) return;
    onIndexChange((currentIndex - 1 + total) % total);
  }, [currentIndex, total, onIndexChange]);

  const handleNext = useCallback(() => {
    if (total <= 1 || !onIndexChange) return;
    onIndexChange((currentIndex + 1) % total);
  }, [currentIndex, total, onIndexChange]);

  // 키보드 단축키 (ESC, 좌/우 화살표)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // 모달 오픈 시 배경 스크롤 방지
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentImage) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-6 transition-all duration-200 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* 상단 컨트롤 바 */}
      <div
        className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 인덱스 표시 */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/60 px-3.5 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-md border border-white/10">
          <ZoomIn className="h-3.5 w-3.5 text-amber-400" />
          <span>전체 이미지 보기</span>
          {total > 1 && (
            <span className="text-neutral-400 font-normal">
              ({currentIndex + 1} / {total})
            </span>
          )}
        </div>

        {/* 우측 도구 버튼들 */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* 새 탭에서 원본 보기 */}
          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-full bg-black/60 p-2 text-white hover:bg-neutral-800 transition-colors shadow-md backdrop-blur-md border border-white/10"
            title="새 탭에서 원본 보기"
          >
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* 닫기 버튼 */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white p-2 transition-transform hover:scale-105 active:scale-95 shadow-md cursor-pointer border border-white/20"
            title="닫기 (ESC)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 중앙 메인 이미지 */}
      <div
        className="relative max-h-[85vh] max-w-[90vw] flex items-center justify-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt={`확대 이미지 ${currentIndex + 1}`}
          className="max-h-[82vh] max-w-[88vw] rounded-2xl object-contain shadow-2xl border border-white/10 ring-1 ring-black/50"
        />
      </div>

      {/* 좌측 이전 버튼 (여러 장일 때) */}
      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/85 text-white p-3 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-lg backdrop-blur-md border border-white/10"
          title="이전 이미지 (←)"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* 우측 다음 버튼 (여러 장일 때) */}
      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-black/85 text-white p-3 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-lg backdrop-blur-md border border-white/10"
          title="다음 이미지 (→)"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* 하단 썸네일 내비게이션 바 (여러 장일 때) */}
      {total > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 max-w-[90vw] overflow-x-auto p-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onIndexChange?.(idx)}
              className={`relative h-12 w-12 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                idx === currentIndex
                  ? "border-amber-400 scale-105 shadow-md shadow-amber-400/30"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`썸네일 ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
