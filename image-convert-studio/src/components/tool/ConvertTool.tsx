"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Loader2, Trash2, X } from "lucide-react";
import { buildZip, convertImage, type ConvertOptions } from "@/lib/imageTools/engine";
import {
  FORMAT_LABEL,
  OUTPUT_FORMATS,
  RESAMPLE_FILTERS,
  SCALE_OPTIONS,
  formatBytes,
  outputFileName,
  usesQuality,
  type OutputFormat,
  type ResampleFilter,
} from "@/lib/imageTools/formats";
import { fmt } from "@/lib/i18n";
import { Dropzone } from "./Dropzone";
import { useLang } from "./LangProvider";

type Status = "idle" | "working" | "done" | "error";
interface Item {
  id: string;
  file: File;
  url: string;
  selected: boolean;
  status: Status;
  result?: { blob: Blob; name: string; url: string };
  error?: string;
}

const SCALE_KEYS = { 0.5: "scaleHalf", 1: "scaleOne", 1.5: "scaleOneHalf", 2: "scaleTwo", 3: "scaleThree", 4: "scaleFour" } as const;
let nextId = 1;

function triggerDownload(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}

export function ConvertTool() {
  const { t } = useLang();
  const [items, setItems] = useState<Item[]>([]);
  const [format, setFormat] = useState<OutputFormat>("webp");
  const [quality, setQuality] = useState(0.9);
  const [scale, setScale] = useState(1);
  const [filter, setFilter] = useState<ResampleFilter>("lanczos3");
  const [sharpen, setSharpen] = useState(80);
  const [limitSize, setLimitSize] = useState(false);
  const [maxW, setMaxW] = useState(1920);
  const [maxH, setMaxH] = useState(1920);
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  // 화면을 떠날 때 만들어 둔 미리보기·결과 주소를 모두 풀어 준다
  useEffect(
    () => () => {
      itemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.url);
        if (item.result) URL.revokeObjectURL(item.result.url);
      });
    },
    []
  );

  const options = useMemo<ConvertOptions>(
    () => ({
      format,
      quality,
      scale,
      maxWidth: limitSize ? maxW : undefined,
      maxHeight: limitSize ? maxH : undefined,
      filter: scale !== 1 || limitSize ? filter : undefined,
      unsharpAmount: scale > 1 ? sharpen : 0,
    }),
    [format, quality, scale, limitSize, maxW, maxH, filter, sharpen]
  );

  const patch = (id: string, change: Partial<Item>) => setItems((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item)));

  const addFiles = (files: File[]) =>
    setItems((list) => [...list, ...files.map((file) => ({ id: String(nextId++), file, url: URL.createObjectURL(file), selected: false, status: "idle" as Status }))]);

  const removeItem = (id: string) =>
    setItems((list) => {
      const target = list.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        if (target.result) URL.revokeObjectURL(target.result.url);
      }
      return list.filter((item) => item.id !== id);
    });

  const clearAll = () => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.url);
      if (item.result) URL.revokeObjectURL(item.result.url);
    });
    setItems([]);
  };

  const convertOne = async (item: Item) => {
    patch(item.id, { status: "working", error: undefined });
    try {
      const blob = await convertImage(item.file, options);
      if (item.result) URL.revokeObjectURL(item.result.url);
      patch(item.id, { status: "done", result: { blob, name: outputFileName(item.file.name, format), url: URL.createObjectURL(blob) } });
    } catch (error) {
      patch(item.id, { status: "error", error: error instanceof Error ? error.message : t.convert.error });
    }
  };

  const convertSelected = async () => {
    const targets = itemsRef.current.filter((item) => item.selected);
    if (targets.length === 0) return;
    setBusy(true);
    for (const item of targets) await convertOne(item);
    setBusy(false);
  };

  const convertSingle = async (item: Item) => {
    setBusy(true);
    await convertOne(item);
    setBusy(false);
  };

  const downloadZip = async () => {
    const done = items.filter((item) => item.result);
    if (done.length === 0) return;
    setZipping(true);
    try {
      const blob = await buildZip(done.map((item) => ({ name: item.result!.name, blob: item.result!.blob })));
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `converted_${Date.now()}.zip`);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setZipping(false);
    }
  };

  const selectedCount = items.filter((item) => item.selected).length;
  const doneCount = items.filter((item) => item.result).length;
  const showFilter = scale !== 1 || limitSize;
  const fieldClass = "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
  const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <Dropzone currentCount={items.length} label={t.dropzone.convert} onFiles={addFiles} />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-neutral-900">{t.convert.options}</h2>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
            <span className="text-neutral-700">{t.convert.format}</span>
            <select className={fieldClass} value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}>
              {OUTPUT_FORMATS.map((f) => (
                <option key={f} value={f}>{FORMAT_LABEL[f]}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
            <span className="text-neutral-700">{t.convert.quality}: {Math.round(quality * 100)}%</span>
            <input type="range" min={0.1} max={1} step={0.05} value={quality} disabled={!usesQuality(format)} title={usesQuality(format) ? undefined : t.convert.qualityPng} onChange={(event) => setQuality(Number(event.target.value))} className="w-44 accent-blue-600 disabled:opacity-40" />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
            <span className="text-neutral-700">{t.convert.scale}</span>
            <select className={fieldClass} value={scale} onChange={(event) => setScale(Number(event.target.value))}>
              {SCALE_OPTIONS.map((s) => (
                <option key={s} value={s}>{t.convert[SCALE_KEYS[s]]}</option>
              ))}
            </select>
          </label>

          {showFilter && (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
              <span className="text-neutral-700">{t.convert.filter}</span>
              <select className={fieldClass} value={filter} onChange={(event) => setFilter(event.target.value as ResampleFilter)}>
                {RESAMPLE_FILTERS.map((f) => (
                  <option key={f} value={f}>{t.filters[f]}</option>
                ))}
              </select>
            </label>
          )}

          {scale > 1 && (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
              <span className="text-neutral-700">{t.convert.sharpen}: {sharpen}</span>
              <input type="range" min={0} max={300} step={10} value={sharpen} onChange={(event) => setSharpen(Number(event.target.value))} className="w-44 accent-blue-600" />
            </label>
          )}

          <label className="flex items-center gap-2 pb-2 text-sm text-neutral-700">
            <input type="checkbox" checked={limitSize} onChange={(event) => setLimitSize(event.target.checked)} className="h-4 w-4 accent-blue-600" />
            {t.convert.sizeLimit}
          </label>

          {limitSize && (
            <>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
                <span className="text-neutral-700">{t.convert.maxW}</span>
                <input type="number" min={1} max={16384} className={`${fieldClass} w-28`} value={maxW} onChange={(event) => setMaxW(Math.max(1, Math.min(16384, Number(event.target.value) || 1)))} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
                <span className="text-neutral-700">{t.convert.maxH}</span>
                <input type="number" min={1} max={16384} className={`${fieldClass} w-28`} value={maxH} onChange={(event) => setMaxH(Math.max(1, Math.min(16384, Number(event.target.value) || 1)))} />
              </label>
            </>
          )}
        </div>
        <p className="mt-4 text-xs text-neutral-400">{t.privacy}</p>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">{fmt(t.convert.total, { n: items.length })}</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{fmt(t.convert.selected, { n: selectedCount })}</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{fmt(t.convert.done, { n: doneCount })}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={`${btn} border border-neutral-300 text-neutral-700 hover:bg-neutral-100`} onClick={() => setItems((list) => list.map((item) => ({ ...item, selected: true })))} disabled={items.length === 0}>{t.convert.selectAll}</button>
            <button type="button" className={`${btn} border border-neutral-300 text-neutral-700 hover:bg-neutral-100`} onClick={() => setItems((list) => list.map((item) => ({ ...item, selected: false })))} disabled={items.length === 0}>{t.convert.deselectAll}</button>
            <button type="button" className={`${btn} border border-red-200 text-red-600 hover:bg-red-50`} onClick={clearAll} disabled={busy || items.length === 0}><Trash2 className="h-4 w-4" />{t.convert.clearAll}</button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={`${btn} bg-blue-600 text-white hover:bg-blue-700`} onClick={() => void convertSelected()} disabled={busy || selectedCount === 0}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{t.convert.converting}</> : fmt(t.convert.convertSelected, { n: selectedCount })}
          </button>
          <button type="button" className={`${btn} bg-neutral-800 text-white hover:bg-neutral-900`} onClick={() => void downloadZip()} disabled={zipping || doneCount === 0}>
            <Download className="h-4 w-4" />{t.convert.zip} ({doneCount})
          </button>
        </div>

        {items.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-400">{t.convert.empty}</p>
        ) : (
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
            {items.map((item) => {
              const ratio = item.result ? Math.round((1 - item.result.blob.size / item.file.size) * 100) : 0;
              return (
                <div key={item.id} className={`relative flex flex-col overflow-hidden rounded-xl border bg-white ${item.selected ? "border-blue-500 ring-2 ring-blue-100" : "border-neutral-200"}`}>
                  <button
                    type="button"
                    aria-label="select"
                    aria-pressed={item.selected}
                    onClick={() => patch(item.id, { selected: !item.selected })}
                    className={`absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded border text-white ${item.selected ? "border-blue-600 bg-blue-600" : "border-neutral-400 bg-black/50"}`}
                  >
                    {item.selected && <Check className="h-4 w-4" />}
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.result?.url ?? item.url} alt={item.file.name} className="h-36 w-full bg-neutral-100 object-cover" />
                  <div className="flex flex-col gap-0.5 px-3 py-2 text-xs text-neutral-500">
                    <span className="truncate text-sm text-neutral-900" title={item.file.name}>{item.file.name}</span>
                    <span>
                      {formatBytes(item.file.size)}
                      {item.result && (
                        <>
                          {" → "}<b className="text-emerald-700">{formatBytes(item.result.blob.size)}</b>{" "}
                          <span className={ratio >= 0 ? "text-emerald-700" : "text-amber-700"}>({fmt(ratio >= 0 ? t.convert.saved : t.convert.bigger, { p: Math.abs(ratio) })})</span>
                        </>
                      )}
                    </span>
                    {item.status === "working" && <div className="mt-1 h-1 overflow-hidden rounded bg-neutral-200"><div className="h-full w-2/3 animate-pulse bg-blue-500" /></div>}
                    {item.status === "error" && <span className="text-red-600">{item.error}</span>}
                  </div>
                  <div className="flex gap-1.5 px-2 pb-2">
                    <button type="button" className={`${btn} flex-1 bg-blue-600 px-2 py-1.5 text-xs text-white hover:bg-blue-700`} onClick={() => void convertSingle(item)} disabled={busy}>{t.convert.one}</button>
                    {item.result && (
                      <button type="button" className={`${btn} flex-1 border border-neutral-300 px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100`} onClick={() => triggerDownload(item.result!.url, item.result!.name)}>{t.convert.save}</button>
                    )}
                    <button type="button" aria-label="remove" className={`${btn} border border-neutral-200 px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100`} onClick={() => removeItem(item.id)} disabled={busy}><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
