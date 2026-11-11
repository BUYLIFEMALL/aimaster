"use client";

import { useEffect, useRef, useState } from "react";
import { splitThumbTitle, THUMB_MAX_CHARS } from "@/lib/thumbText";

// v1.49 썸네일 만들기 — 장면 이미지 하나에 큰 제목 글자를 얹은 1280×720 PNG를 이 브라우저에서 만든다(AI 호출·서버 저장 없음).
// 장면 이미지는 공개 저장소(shorts-images)라 캔버스에서 바로 쓸 수 있다.
const W = 1280;
const H = 720;

function drawThumb(canvas: HTMLCanvasElement, img: HTMLImageElement | null, title: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, H);
  if (img) {
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }
  const grad = ctx.createLinearGradient(0, H * 0.35, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const lines = splitThumbTitle(title);
  const size = lines.length > 1 ? 92 : 110;
  ctx.font = `900 ${size}px "Pretendard", "Noto Sans KR", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  lines.forEach((line, i) => {
    const y = H - 60 - (lines.length - 1 - i) * (size + 14);
    ctx.lineWidth = 16;
    ctx.strokeStyle = "#000";
    ctx.strokeText(line, 56, y, W - 112);
    ctx.fillStyle = i === lines.length - 1 ? "#ffd400" : "#ffffff";
    ctx.fillText(line, 56, y, W - 112);
  });
}

export function ThumbnailMaker({ title, imageUrls }: { title: string; imageUrls: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pick, setPick] = useState(0);
  const [text, setText] = useState(title.slice(0, THUMB_MAX_CHARS));
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = imageUrls[pick];
    if (!url) return;
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => { setImg(el); setError(null); };
    el.onerror = () => { setImg(null); setError("장면 이미지를 불러오지 못했습니다. 다른 장면을 골라 주세요."); };
    el.src = url;
  }, [imageUrls, pick]);

  useEffect(() => {
    if (canvasRef.current) drawThumb(canvasRef.current, img, text);
  }, [img, text]);

  const download = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) { setError("썸네일 파일을 만들지 못했습니다."); return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `thumbnail-${(text || "shorts").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 30)}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };

  if (!imageUrls.length) return null;
  return (
    <div className="rounded-lg border border-[#2b2b2b] p-4 space-y-3">
      <p className="text-base font-bold text-[#f1f1f1]">🖼️ 썸네일 만들기 (무료)</p>
      <p className="text-xs text-[#aaaaaa]">장면 사진을 하나 고르고 제목을 고치면 1280×720 유튜브 썸네일 PNG로 내려받을 수 있습니다. AI 요금이 들지 않습니다.</p>
      <div className="flex flex-wrap gap-2">
        {imageUrls.map((u, i) => (
          <button key={u + i} type="button" onClick={() => setPick(i)} aria-label={`장면 ${i + 1} 사진으로`} className={`h-16 w-9 overflow-hidden rounded border ${pick === i ? "border-[#ff0000]" : "border-[#3f3f3f]"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <label className="block text-xs text-[#aaaaaa]">
        썸네일 제목({text.length}/{THUMB_MAX_CHARS}자, 길면 두 줄로 나뉩니다)
        <input value={text} maxLength={THUMB_MAX_CHARS} onChange={(e) => setText(e.target.value)} className="mt-1 w-full rounded-md border border-[#3f3f3f] bg-[#121212] px-3 py-2 text-sm text-[#f1f1f1]" />
      </label>
      <canvas ref={canvasRef} width={W} height={H} className="w-full max-w-xl rounded-md border border-[#2b2b2b]" />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="button" onClick={download} disabled={!img} className="rounded-md bg-[#ff0000] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">PNG 내려받기</button>
    </div>
  );
}
