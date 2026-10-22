"use client";

import { useEffect, useState } from "react";
import { coverRect } from "@/lib/studio/render";
import { ratioSize, type Design, type Ratio } from "@/lib/studio/config";
import { textBand, type RGB } from "@/lib/studio/readability";

/**
 * v1.24: 배경 사진에서 글자가 놓이는 구역의 평균 색(검은 막을 씌우기 전).
 * 결과 크기를 1/10로 줄여 drawQuote와 같은 꽉 채우기(coverRect)로 그린 뒤 그 구역만 평균. 읽을 수 없으면 null
 */
export function useBandColor(image: string, ratio: Ratio, position: Design["position"]): RGB | null {
  const [state, setState] = useState<{ key: string; rgb: RGB | null } | null>(null);
  const key = JSON.stringify([image, ratio, position]);
  useEffect(() => {
    if (!image) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const size = ratioSize(ratio);
      const w = Math.round(size.width / 10), h = Math.round(size.height / 10);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const crop = coverRect(img.naturalWidth, img.naturalHeight, w, h);
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height);
      const [y0, y1] = textBand(position);
      const top = Math.floor(h * y0), bottom = Math.max(top + 1, Math.ceil(h * y1));
      const left = Math.floor(w * 0.09), right = Math.ceil(w * 0.91);
      try {
        const d = ctx.getImageData(left, top, right - left, bottom - top).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        setState({ key, rgb: n ? [r / n, g / n, b / n] : null });
      } catch {
        setState({ key, rgb: null });
      }
    };
    img.onerror = () => { if (!cancelled) setState({ key, rgb: null }); };
    img.src = image;
    return () => { cancelled = true; };
  }, [image, ratio, position, key]);
  return image && state?.key === key ? state.rgb : null;
}
