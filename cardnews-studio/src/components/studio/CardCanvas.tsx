"use client";

import { useEffect, useRef } from "react";
import { renderCardToCanvas } from "@/lib/cardnews/renderClient";
import type { RatioId } from "@/lib/cardnews/presets";
import type { CardPage, CardStyle } from "@/lib/cardnews/types";

/** 카드 한 장 미리보기. 미리보기와 PNG 내보내기는 같은 그리기 함수를 쓰므로 결과가 같다. */
export function CardCanvas({
  page,
  style,
  ratio,
  className = "",
}: {
  page: Pick<CardPage, "headline" | "sub" | "imageUrl">;
  style: CardStyle;
  ratio: RatioId;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    // 입력 중 연속 변경에 대비해 한 프레임 뒤에 그린다.
    const id = requestAnimationFrame(() => {
      if (!cancelled) void renderCardToCanvas(canvas, page, style, ratio, page.imageUrl).catch(() => undefined);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [page, style, ratio]);

  return <canvas ref={ref} className={`h-auto w-full rounded-xl border border-gray-200 bg-gray-100 ${className}`} />;
}
