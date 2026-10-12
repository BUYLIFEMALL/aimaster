"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2, Trash2, X } from "lucide-react";
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

  const fieldClass = "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
  const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const num = (value: number, set: (n: number) => void, min: number, max: number, fallback: number) => ({
    type: "number" as const,
    min,
    max,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => set(clampInt(Number(event.target.value), min, max, fallback)),
    className: `${fieldClass} w-24`,
  });

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <Dropzone currentCount={items.length} label={t.dropzone.collage} onFiles={addFiles} />
      </section>

      {items.length > 0 && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-neutral-900">{fmt(t.collage.order, { n: items.length })}</h2>
          <div className="flex flex-wrap gap-3">
            {items.map((item, index) => (
              <div key={item.id} className="w-28 overflow-hidden rounded-lg border border-neutral-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.file.name} className="h-24 w-full bg-neutral-100 object-cover" />
                <div className="flex items-center justify-between px-1 py-1">
                  <button type="button" aria-label={t.collage.moveLeft} title={t.collage.moveLeft} disabled={index === 0} onClick={() => move(item.id, -1)} className="rounded p-1 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-[11px] text-neutral-400">{index + 1}</span>
                  <button type="button" aria-label={t.collage.moveRight} title={t.collage.moveRight} disabled={index === items.length - 1} onClick={() => move(item.id, 1)} className="rounded p-1 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                  <button type="button" aria-label={t.collage.remove} title={t.collage.remove} onClick={() => removeItem(item.id)} className="rounded p-1 text-red-500 hover:bg-red-50"><X className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-neutral-900">{t.collage.options}</h2>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-700">
            <span>{t.collage.layout}</span>
            <select className={fieldClass} value={layout} onChange={(event) => setLayout(event.target.value as CollageLayout)}>
              <option value="grid">{t.collage.grid}</option>
              <option value="horizontal">{t.collage.horizontal}</option>
              <option value="vertical">{t.collage.vertical}</option>
            </select>
          </label>
          {layout === "grid" && (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-700">
              <span>{t.collage.columns}</span>
              <input {...num(columns, setColumns, 1, 12, 3)} />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-700"><span>{t.collage.cellW}</span><input {...num(cellW, setCellW, 40, 4000, 400)} /></label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-700"><span>{t.collage.cellH}</span><input {...num(cellH, setCellH, 40, 4000, 400)} /></label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-700"><span>{t.collage.gap}</span><input {...num(gap, setGap, 0, 400, 8)} /></label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-700"><span>{t.collage.padding}</span><input {...num(padding, setPadding, 0, 800, 16)} /></label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-700">
            <span>{t.collage.bg}</span>
            <input type="color" value={background} onChange={(event) => setBackground(event.target.value)} className="h-10 w-16 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-700">
            <span>{t.collage.fit}</span>
            <select className={fieldClass} value={fit} onChange={(event) => setFit(event.target.value as CollageFit)}>
              <option value="cover">{t.collage.cover}</option>
              <option value="contain">{t.collage.contain}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-700">
            <span>{t.collage.format}</span>
            <select className={fieldClass} value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}>
              {OUTPUT_FORMATS.map((f) => (
                <option key={f} value={f}>{FORMAT_LABEL[f]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-700">
            <span>{t.collage.quality}: {Math.round(quality * 100)}%</span>
            <input type="range" min={0.1} max={1} step={0.01} value={quality} disabled={!usesQuality(format)} onChange={(event) => setQuality(Number(event.target.value))} className="w-40 accent-blue-600 disabled:opacity-40" />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className={`${btn} bg-blue-600 text-white hover:bg-blue-700`} onClick={() => void make()} disabled={busy || items.length === 0}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{t.collage.making}</> : t.collage.make}
          </button>
          <button type="button" className={`${btn} bg-neutral-800 text-white hover:bg-neutral-900`} onClick={download} disabled={!result}><Download className="h-4 w-4" />{t.collage.download}</button>
          <button type="button" className={`${btn} border border-red-200 text-red-600 hover:bg-red-50`} onClick={clearAll} disabled={busy || items.length === 0}><Trash2 className="h-4 w-4" />{t.collage.clearAll}</button>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        <p className="mt-4 text-xs text-neutral-400">{t.privacy}</p>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-neutral-900">{t.collage.preview}</h2>
        <div className="flex min-h-48 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <canvas ref={canvasRef} className={result ? "block h-auto max-w-full" : "hidden"} />
          {!result && <p className="text-sm text-neutral-400">{t.collage.previewEmpty}</p>}
        </div>
        {result && <p className="mt-2 text-xs text-neutral-500">{fmt(t.collage.size, { w: result.width, h: result.height, s: formatBytes(result.blob.size) })}</p>}
      </section>
    </div>
  );
}
