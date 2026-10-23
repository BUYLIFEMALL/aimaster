"use client";
// v1.13: 회전·반전·자르기를 적용한 모습을 변환 전에 보여 준다(썸네일·「자를 위치」 창 공용).
// 원본은 바꾸지 않고 작은 캔버스에만 그린다. onFocusChange가 있으면 자르기 틀을 끌어 위치를 바꾼다.
import { useEffect, useRef, useState } from "react";
import { clampFocus, planTransform, type Focus, type PostPreset, type Rotation } from "@/lib/imageTools/geometry";

export interface PreviewTransform { rotate: Rotation; flipH: boolean; flipV: boolean; cropRatio: number | null; preset: PostPreset | null }

export function TransformedPreview({ url, t, focus, maxSide, onFocusChange, className }: {
  url: string;
  t: PreviewTransform;
  focus?: Focus | null;
  maxSide: number;
  onFocusChange?: (f: Focus) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const drag = useRef<{ px: number; py: number; f: Focus; freeX: number; freeY: number } | null>(null);

  useEffect(() => {
    const el = new Image();
    el.onload = () => setImg(el);
    el.src = url;
  }, [url]);

  // 미리보기 크기(회전 후 원본 비율을 maxSide 안에 맞춤)와 자르기 영역
  const geo = img ? (() => {
    const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * s));
    const h = Math.max(1, Math.round(img.naturalHeight * s));
    return { w, h, plan: planTransform(w, h, { ...t, focus }) };
  })() : null;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !img || !geo) return;
    const { w, h, plan } = geo;
    c.width = plan.rotW;
    c.height = plan.rotH;
    const x = c.getContext("2d");
    if (!x) return;
    x.save();
    x.translate(plan.rotW / 2, plan.rotH / 2);
    x.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1); // 엔진과 같은 순서: 반전 → 회전
    x.rotate((t.rotate * Math.PI) / 180);
    x.drawImage(img, -w / 2, -h / 2, w, h);
    x.restore();
    const r = plan.crop;
    if (r.width < plan.rotW || r.height < plan.rotH) {
      x.fillStyle = "rgba(5, 8, 15, 0.62)";
      x.fillRect(0, 0, plan.rotW, r.y);
      x.fillRect(0, r.y + r.height, plan.rotW, plan.rotH - r.y - r.height);
      x.fillRect(0, r.y, r.x, r.height);
      x.fillRect(r.x + r.width, r.y, plan.rotW - r.x - r.width, r.height);
      x.strokeStyle = "#a78bfa";
      x.lineWidth = Math.max(1, Math.round(plan.rotW / 200));
      x.strokeRect(r.x + 0.5, r.y + 0.5, r.width - 1, r.height - 1);
    }
  });

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onFocusChange || !geo) return;
    const box = e.currentTarget.getBoundingClientRect();
    const k = geo.plan.rotW / box.width; // 화면 px → 미리보기 px
    drag.current = { px: e.clientX, py: e.clientY, f: clampFocus(focus), freeX: (geo.plan.rotW - geo.plan.crop.width) / k, freeY: (geo.plan.rotH - geo.plan.crop.height) / k };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || !onFocusChange) return;
    onFocusChange(clampFocus({
      x: d.freeX > 0 ? d.f.x + (e.clientX - d.px) / d.freeX : 0.5,
      y: d.freeY > 0 ? d.f.y + (e.clientY - d.py) / d.freeY : 0.5,
    }));
  };
  const onUp = () => { drag.current = null; };

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={onFocusChange ? { touchAction: "none", cursor: "grab" } : undefined}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-label={onFocusChange ? "자르기 틀을 끌어 위치를 옮기세요" : "변환 미리보기"}
    />
  );
}
