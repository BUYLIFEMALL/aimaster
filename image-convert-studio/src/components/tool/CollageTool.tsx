"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2, Trash2, X, LayoutGrid, Sliders, Eye, Sparkles } from "lucide-react";
import { renderCollage } from "@/lib/imageTools/engine";
import { FORMAT_LABEL, OUTPUT_FORMATS, clampInt, formatBytes, outputFileName, usesQuality, type CollageFit, type CollageLayout, type OutputFormat } from "@/lib/imageTools/formats";
import { fmt } from "@/lib/i18n";
import { Dropzone } from "./Dropzone";
import { useLang } from "./LangProvider";

interface Item {
  id: string;
  file: File;
  url: string;
}
let nextId = 1;

export function CollageTool() {
  const { t } = useLang();
  const [items, setItems] = useState<Item[]>([]);
  const [layout, setLayout] = useState<CollageLayout>("grid");
  const [columns, setColumns] = useState(3);
  const [cellW, setCellW] = useState(400);
  const [cellH, setCellH] = useState(400);
  const [gap, setGap] = useState(8);
  const [padding, setPadding] = useState(16);
  const [background, setBackground] = useState("#ffffff");
  const [fit, setFit] = useState<CollageFit>("cover");
  const [format, setFormat] = useState<OutputFormat>("webp");
  const [quality, setQuality] = useState(0.92);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ blob: Blob; url: string; width: number; height: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const resultRef = useRef(result);
  resultRef.current = result;

  useEffect(
    () => () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    },
    []
  );

  const addFiles = (files: File[]) => setItems((list) => [...list, ...files.map((file) => ({ id: String(nextId++), file, url: URL.createObjectURL(file) }))]);
  const removeItem = (id: string) =>
    setItems((list) => {
      const target = list.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return list.filter((item) => item.id !== id);
    });
  const move = (id: string, delta: number) =>
    setItems((list) => {
      const index = list.findIndex((item) => item.id === id);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  const clearAll = () => {
    items.forEach((item) => URL.revokeObjectURL(item.url));
    setItems([]);
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setError("");
  };

  const make = async () => {
    if (!canvasRef.current || items.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const blob = await renderCollage(items.map((item) => item.file), { layout, columns, cellW, cellH, gap, padding, background, fit, format, quality }, canvasRef.current);
      if (result) URL.revokeObjectURL(result.url);
      setResult({ blob, url: URL.createObjectURL(blob), width: canvasRef.current.width, height: canvasRef.current.height });
    } catch (e) {
      setError(`${t.collage.error}: ${e instanceof Error ? e.message : ""}`);
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = outputFileName(`collage_${Date.now()}`, format);
    a.click();
  };

  const fieldClass = "rounded-xl border border-[#1e293b] bg-[#0d121f] px-3 py-2 text-xs text-slate-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50";
  const btn = "ics-btn inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40";
  const num = (value: number, set: (n: number) => void, min: number, max: number, fallback: number) => ({
    type: "number" as const,
    min,
    max,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => set(clampInt(Number(event.target.value), min, max, fallback)),
    className: `${fieldClass} w-24`,
  });

  return (
    <div className="space-y-6">
      {/* 1. 드롭존 섹션 */}
      <section className="rounded-2xl border border-[#1e293b] bg-[#111726] p-4 sm:p-5 shadow-sm">
        <Dropzone currentCount={items.length} label={t.dropzone.collage} onFiles={addFiles} />
      </section>

      {/* 2. 이미지 순서 배치 갤러리 */}
      {items.length > 0 && (
        <section className="rounded-2xl border border-[#1e293b] bg-[#111726] p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                <LayoutGrid size={15} />
              </div>
              <h2 className="text-sm font-bold text-white">{fmt(t.collage.order, { n: items.length })}</h2>
            </div>
            <span className="text-[11px] text-slate-400">좌우 버튼으로 순서 변경 가능</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {items.map((item, index) => (
              <div key={item.id} className="w-28 overflow-hidden rounded-xl border border-[#1e293b] bg-[#0d121f] shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.file.name} className="h-24 w-full bg-[#080b12] object-cover" />
                <div className="flex items-center justify-between p-1 border-t border-[#1e293b]">
                  <button
                    type="button"
                    aria-label={t.collage.moveLeft}
                    title={t.collage.moveLeft}
                    disabled={index === 0}
                    onClick={() => move(item.id, -1)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-[#162032] hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[11px] font-mono font-medium text-violet-400">{index + 1}</span>
                  <button
                    type="button"
                    aria-label={t.collage.moveRight}
                    title={t.collage.moveRight}
                    disabled={index === items.length - 1}
                    onClick={() => move(item.id, 1)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-[#162032] hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t.collage.remove}
                    title={t.collage.remove}
                    onClick={() => removeItem(item.id)}
                    className="rounded-lg p-1 text-rose-400 hover:bg-rose-950/30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. 콜라주 옵션 설정 섹션 */}
      <section className="rounded-2xl border border-[#1e293b] bg-[#111726] p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-[#1e293b] pb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
            <Sliders size={15} />
          </div>
          <h2 className="text-sm font-bold text-white">{t.collage.options}</h2>
          <span className="text-[11px] text-slate-400 font-mono">Layout Controller</span>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.collage.layout}</span>
            <select className={fieldClass} value={layout} onChange={(event) => setLayout(event.target.value as CollageLayout)}>
              <option value="grid" className="bg-[#0d121f] text-slate-200">{t.collage.grid}</option>
              <option value="horizontal" className="bg-[#0d121f] text-slate-200">{t.collage.horizontal}</option>
              <option value="vertical" className="bg-[#0d121f] text-slate-200">{t.collage.vertical}</option>
            </select>
          </label>
          {layout === "grid" && (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
              <span className="text-slate-200 font-semibold">{t.collage.columns}</span>
              <input {...num(columns, setColumns, 1, 12, 3)} />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.collage.cellW}</span>
            <input {...num(cellW, setCellW, 40, 4000, 400)} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.collage.cellH}</span>
            <input {...num(cellH, setCellH, 40, 4000, 400)} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.collage.gap}</span>
            <input {...num(gap, setGap, 0, 400, 8)} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.collage.padding}</span>
            <input {...num(padding, setPadding, 0, 800, 16)} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.collage.bg}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
                className="h-9 w-12 cursor-pointer rounded-xl border border-[#1e293b] bg-[#0d121f] p-1"
              />
              <span className="text-[11px] font-mono text-slate-400">{background}</span>
            </div>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.collage.fit}</span>
            <select className={fieldClass} value={fit} onChange={(event) => setFit(event.target.value as CollageFit)}>
              <option value="cover" className="bg-[#0d121f] text-slate-200">{t.collage.cover}</option>
              <option value="contain" className="bg-[#0d121f] text-slate-200">{t.collage.contain}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.collage.format}</span>
            <select className={fieldClass} value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}>
              {OUTPUT_FORMATS.map((f) => (
                <option key={f} value={f} className="bg-[#0d121f] text-slate-200">{FORMAT_LABEL[f]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.collage.quality}: <span className="text-violet-400 font-mono">{Math.round(quality * 100)}%</span></span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.01}
              value={quality}
              disabled={!usesQuality(format)}
              onChange={(event) => setQuality(Number(event.target.value))}
              className="w-40 accent-violet-500 disabled:opacity-30 cursor-pointer"
            />
          </label>
        </div>

        {/* 액션 버튼 */}
        <div className="mt-5 flex flex-wrap gap-2.5 pt-2">
          <button
            type="button"
            className={`${btn} ics-primary bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-md shadow-violet-500/20`}
            onClick={() => void make()}
            disabled={busy || items.length === 0}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.collage.making}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{t.collage.make}</span>
              </>
            )}
          </button>
          <button
            type="button"
            className={`${btn} ics-secondary border border-[#334155] bg-[#1e293b] text-white hover:bg-[#334155]`}
            onClick={download}
            disabled={!result}
          >
            <Download className="h-4 w-4 text-violet-400" />
            <span>{t.collage.download}</span>
          </button>
          <button
            type="button"
            className={`${btn} ics-danger border border-rose-900/40 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40`}
            onClick={clearAll}
            disabled={busy || items.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t.collage.clearAll}</span>
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-rose-900/50 bg-rose-950/40 p-3 text-xs text-rose-300" role="alert">
            {error}
          </p>
        )}
        <p className="mt-4 text-[11px] text-slate-400 border-t border-[#1e293b]/60 pt-3">🔒 {t.privacy}</p>
      </section>

      {/* 4. 실시간 콜라주 프리뷰 캔버스 */}
      <section className="rounded-2xl border border-[#1e293b] bg-[#111726] p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <Eye size={15} />
            </div>
            <h2 className="text-sm font-bold text-white">{t.collage.preview}</h2>
          </div>
          {result && (
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              {fmt(t.collage.size, { w: result.width, h: result.height, s: formatBytes(result.blob.size) })}
            </span>
          )}
        </div>

        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[#1e293b] bg-[#080b12] p-4 overflow-auto">
          <canvas ref={canvasRef} className={result ? "block h-auto max-w-full rounded-lg shadow-xl" : "hidden"} />
          {!result && (
            <div className="text-center py-8">
              <LayoutGrid className="mx-auto h-8 w-8 text-slate-600 mb-2 opacity-50" />
              <p className="text-xs text-slate-400">{t.collage.previewEmpty}</p>
              <p className="mt-1 text-[11px] text-slate-500">이미지를 업로드하고 [콜라주 만들기]를 누르면 고화질 결과물이 렌더링됩니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
