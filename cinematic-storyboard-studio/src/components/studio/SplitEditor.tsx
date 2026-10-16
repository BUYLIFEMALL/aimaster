"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import type { Lang } from "@/lib/storyboard/types";
import { cellRects, clampBand, clampCrop, defaultBands, keyframeFileName, safeName, type Band, type Crop } from "@/lib/storyboard/plan";
import { STRINGS } from "./i18n";

/** 마스터 시트의 3x3 경계를 슬라이더로 맞춘 뒤 9개 JPG를 ZIP으로 받는 편집기 (모두 브라우저 안에서 처리) */
export function SplitEditor({ imageUrl, title, lang, onClose }: { imageUrl: string; title: string; lang: Lang; onClose: () => void }) {
  const t = STRINGS[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<Crop>({ left: 0, right: 0 });
  const [bands, setBands] = useState<Band[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let objectUrl = "";
    // 서명 URL 이미지를 blob으로 받아 캔버스가 오염되지 않게 한다
    fetch(imageUrl)
      .then((r) => r.blob())
      .then((b) => {
        objectUrl = URL.createObjectURL(b);
        const im = new Image();
        im.onload = () => {
          if (!alive) return;
          setImg(im);
          setSize({ w: im.naturalWidth, h: im.naturalHeight });
          setBands(defaultBands(im.naturalHeight));
        };
        im.src = objectUrl;
      })
      .catch(() => alive && setError("이미지를 불러오지 못했습니다."));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  const rects = useMemo(() => (size.w ? cellRects(size.w, crop, bands) : []), [size.w, crop, bands]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !img) return;
    c.width = size.w;
    c.height = size.h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    // 잘려 나가는 영역을 어둡게
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.beginPath();
    ctx.rect(0, 0, size.w, size.h);
    for (const r of rects) ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fill("evenodd");
    ctx.lineWidth = Math.max(3, size.w / 700);
    ctx.strokeStyle = "#f59e0b"; // 앰버 골드 가이드 라인
    for (const r of rects) ctx.strokeRect(r.x, r.y, r.w, r.h);
  }, [img, size, rects]);

  function setBand(i: number, key: "top" | "bottom", v: number) {
    setBands((prev) => prev.map((b, idx) => (idx === i ? clampBand({ ...b, [key]: v }, size.h) : b)));
  }

  async function download() {
    if (!img) return;
    setBusy(true);
    setError(null);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const work = document.createElement("canvas");
      const ctx = work.getContext("2d")!;
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        work.width = r.w;
        work.height = r.h;
        ctx.clearRect(0, 0, r.w, r.h);
        ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
        const blob: Blob | null = await new Promise((res) => work.toBlob(res, "image/jpeg", 0.95));
        if (blob) zip.file(keyframeFileName(i), blob);
      }
      const out = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName(title)}_keyframes.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      setError(lang === "ko" ? "ZIP을 만들지 못했습니다." : "Could not create the ZIP.");
    } finally {
      setBusy(false);
    }
  }

  const slider = (label: string, value: number, max: number, onChange: (v: number) => void) => (
    <label className="block text-xs font-bold text-slate-300">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="font-mono text-amber-400">{value}px</span>
      </span>
      <input
        type="range"
        min={0}
        max={Math.max(1, max)}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="mt-1.5 w-full accent-amber-500 cursor-pointer"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0f17] md:flex-row">
      <div className="flex max-h-[45vh] w-full shrink-0 flex-col border-b border-slate-800 bg-[#0e131f] md:max-h-none md:w-80 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div>
            <h2 className="text-sm font-black text-slate-100">{t.splitTitle}</h2>
            <p className="text-[11px] text-slate-400">{t.splitDesc}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="rounded-xl border border-slate-700 bg-[#182030] p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#202b40]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-[#131926] p-3.5">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">좌우 여백 (Width Crop)</p>
            {slider(t.cropLeft, crop.left, Math.floor(size.w / 2), (v) => setCrop((c) => clampCrop({ ...c, left: v }, size.w)))}
            {slider(t.cropRight, crop.right, Math.floor(size.w / 2), (v) => setCrop((c) => clampCrop({ ...c, right: v }, size.w)))}
          </div>
          {bands.map((b, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-slate-800 bg-[#131926] p-3.5">
              <p className="text-xs font-black uppercase tracking-wider text-amber-400">
                {t.row} {i + 1}
              </p>
              {slider(t.top, b.top, size.h, (v) => setBand(i, "top", v))}
              {slider(t.bottom, b.bottom, size.h, (v) => setBand(i, "bottom", v))}
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 p-4 bg-[#0e131f]">
          {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}
          <button
            type="button"
            onClick={download}
            disabled={busy || !img}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition hover:from-amber-400 hover:to-amber-500 disabled:bg-slate-800 disabled:text-slate-400 disabled:shadow-none"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {busy ? t.processing : t.downloadZip}
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#070a0f] p-4">
        {img ? (
          <canvas ref={canvasRef} className="max-h-full max-w-full rounded-xl border border-slate-800 shadow-2xl" />
        ) : (
          <Loader2 className="animate-spin text-amber-400" />
        )}
      </div>
    </div>
  );
}
