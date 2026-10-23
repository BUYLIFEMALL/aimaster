"use client";

import { Button } from "@/components/ui/Button";

interface ImageZoomModalProps {
  imageUrl: string;
  title?: string;
  isActive?: boolean;
  onClose: () => void;
  onSelect?: () => void;
}

// 슬라이드 이미지를 크게 확대해서 보는 모달. 이력 갤러리에서 아직 선택되지 않은
// 이미지를 볼 때는 "이 이미지로 선택" 버튼도 함께 보여줘, 확대해서 확인한 뒤 바로
// 고를 수 있게 한다.
export function ImageZoomModal({ imageUrl, title, isActive, onClose, onSelect }: ImageZoomModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-full max-w-2xl flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <p className="text-sm font-medium text-white">{title}</p>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title ?? "확대된 이미지"}
          className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
        />
        <div className="flex gap-2">
          {onSelect && !isActive && (
            <Button type="button" onClick={onSelect}>
              이 이미지로 선택
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
