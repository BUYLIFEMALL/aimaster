"use client";

import { useEffect, useState } from "react";
import { coverRect } from "@/lib/studio/render";
import { ratioSize, type Design, type Ratio } from "@/lib/studio/config";
import { POSITIONS, textBand, type RGB } from "@/lib/studio/readability";

/**
 * 결과 크기(width×height)를 1/10로 줄여 drawQuote와 같은 꽉 채우기(coverRect)로 그린 뒤,
 * 글자 구역(위/가운데/아래, 가로 9~91%)의 평균 색(검은 막을 씌우기 전). 읽을 수 없으면 null
 */
function bandColorOf(img: HTMLImageElement, width: number, height: number, position: Design["position"]): RGB | null {
  const w = Math.max(1, Math.round(width / 10)), h = Math.max(1, Math.round(height / 10));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const crop = coverRect(img.naturalWidth, img.naturalHeight, w, h);
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height);
  const [y0, y1] = textBand(position);
  const top = Math.floor(h * y0), bottom = Math.max(top + 1, Math.ceil(h * y1));
  const left = Math.floor(w * 0.09), right = Math.ceil(w * 0.91);
  try {
    const d = ctx.getImageData(left, top, right - left, bottom - top).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return n ? [r / n, g / n, b / n] : null;
  } catch {
    return null;
  }
}

/** v1.24: 여러 크기의 글자 구역 평균 색을 사진 한 번 읽어 함께 구한다(키 = 크기 id) */
export function useBandColors(image: string, sizes: readonly { id: string; width: number; height: number }[], position: Design["position"]): Record<string, RGB | null> | null {
  const [state, setState] = useState<{ key: string; colors: Record<string, RGB | null> } | null>(null);
  const key = JSON.stringify([image, sizes.map((s) => [s.id, s.width, s.height]), position]);
  useEffect(() => {
    if (!image) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const colors: Record<string, RGB | null> = {};
      for (const s of sizes) colors[s.id] = bandColorOf(img, s.width, s.height, position);
      setState({ key, colors });
    };
    img.onerror = () => { if (!cancelled) setState({ key, colors: {} }); };
    img.src = image;
    return () => { cancelled = true; };
    // key가 image·sizes·position을 모두 담는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return image && state?.key === key ? state.colors : null;
}

/** v1.24: 지금 비율 하나의 글자 구역 평균 색(「배경 어둡기」 추천용) */
export function useBandColor(image: string, ratio: Ratio, position: Design["position"]): RGB | null {
  const size = ratioSize(ratio);
  const colors = useBandColors(image, [{ id: "main", width: size.width, height: size.height }], position);
  return colors?.main ?? null;
}

/** v1.24: 크기마다 세 자리(위/가운데/아래) 배경색을 사진 한 번 읽어 함께 구한다 — 키 = `${크기 id}|${자리}` */
export function useBandGrid(image: string, sizes: readonly { id: string; width: number; height: number }[]): Record<string, RGB | null> | null {
  const [state, setState] = useState<{ key: string; colors: Record<string, RGB | null> } | null>(null);
  const key = JSON.stringify([image, sizes.map((s) => [s.id, s.width, s.height])]);
  useEffect(() => {
    if (!image) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const colors: Record<string, RGB | null> = {};
      for (const s of sizes) for (const p of POSITIONS) colors[`${s.id}|${p}`] = bandColorOf(img, s.width, s.height, p);
      setState({ key, colors });
    };
    img.onerror = () => { if (!cancelled) setState({ key, colors: {} }); };
    img.src = image;
    return () => { cancelled = true; };
    // key가 image·sizes를 모두 담는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return image && state?.key === key ? state.colors : null;
}
