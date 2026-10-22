"use client";
import { useEffect, useState } from "react";
import { colorDiffPercent, containPoint, toHex } from "@/lib/portrait/compare";

// v1.37: 「원본과 비교」 색 집게 — 누른 자리의 원본·결과 색(HEX)과 차이. 위치 계산은 공용 기준 코드 compare-slider 사본
type RGB = [number, number, number];
export type Pixels = { data: Uint8ClampedArray; w: number; h: number; natW: number; natH: number };

/** 이미지 픽셀을 최대 1024px로 줄여 한 번 읽어 둔다(원본은 blob, 결과는 data 주소라 서버 전송 없음) */
export function useImagePixels(src: string | null | undefined): Pixels | null {
  const [px, setPx] = useState<{ src: string; px: Pixels } | null>(null);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      const scale = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      try {
        setPx({ src, px: { data: ctx.getImageData(0, 0, w, h).data, w, h, natW: img.naturalWidth, natH: img.naturalHeight } });
      } catch {
        // 읽을 수 없는 이미지면 색 집게만 숨긴다
      }
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);
  return src && px?.src === src ? px.px : null;
}

/** 틀 안 위치(%)의 색(주변 5×5 평균). mirror면 좌우 반전해 그린 이미지 기준. 그림 밖 여백이면 null */
export function pickColor(px: Pixels | null, frameW: number, frameH: number, xPct: number, yPct: number, mirror = false): RGB | null {
  if (!px) return null;
  const p = containPoint(frameW, frameH, px.natW, px.natH, mirror ? 100 - xPct : xPct, yPct);
  if (!p) return null;
  const cx = Math.floor((p.x * px.w) / px.natW);
  const cy = Math.floor((p.y * px.h) / px.natH);
  let r = 0, g = 0, b = 0, n = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= px.w || y >= px.h) continue;
      const i = (y * px.w + x) * 4;
      r += px.data[i]; g += px.data[i + 1]; b += px.data[i + 2]; n++;
    }
  }
  return n ? [r / n, g / n, b / n] : null;
}

function Swatch({ label, rgb }: { label: string; rgb: RGB | null }) {
  const hex = rgb ? toHex(...rgb) : null;
  return (
    <div className="cpk-sw">
      <span className={hex ? "cpk-chip" : "cpk-chip empty"} style={hex ? { background: hex } : undefined} aria-hidden />
      <span><small>{label}</small><b>{hex ?? "—"}</b></span>
    </div>
  );
}

/** 원본·결과 색과 차이 한 줄. note가 있으면 아래에 안내 */
export function ColorPickRow({ a, b, note }: { a: RGB | null; b: RGB | null; note?: string }) {
  return (
    <div className="cpk" aria-label="색 집게">
      <Swatch label="원본 색" rgb={a} />
      <div className="cpk-diff"><small>색 차이</small><b data-cpk-diff>{a && b ? `${colorDiffPercent(a, b)}%` : "—"}</b></div>
      <Swatch label="결과 색" rgb={b} />
      {note && <p className="cpk-note">{note}</p>}
    </div>
  );
}
