"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Loader2, Trash2, X, Sliders, Layers, Sparkles, Image as ImageIcon } from "lucide-react";
import { buildZip, convertImage, type ConvertOptions } from "@/lib/imageTools/engine";
import { CENTER, CROP_RATIOS, POST_PRESETS, normalizeRotation, presetById, presetFromParam, type CropRatioId, type Focus, type Rotation } from "@/lib/imageTools/geometry";
import { TransformedPreview, type PreviewTransform } from "./TransformedPreview";
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
import { importSourceOf } from "@/lib/importSource";
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
  /** v1.13: 이 그림만의 자를 위치(없으면 가운데) */
  focus?: Focus;
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
  // F3(v1.12): 게시처 규격·회전·반전·비율 자르기
  const [presetId, setPresetId] = useState("");
  const [rotate, setRotate] = useState<Rotation>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [cropId, setCropId] = useState<CropRatioId>("original");
  const [editingId, setEditingId] = useState<string | null>(null);
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
      filter: scale !== 1 || limitSize || presetId ? filter : undefined,
      unsharpAmount: scale > 1 ? sharpen : 0,
      rotate,
      flipH,
      flipV,
      cropRatio: CROP_RATIOS.find((c) => c.id === cropId)?.ratio ?? null,
      preset: presetById(presetId),
    }),
    [format, quality, scale, limitSize, maxW, maxH, filter, sharpen, rotate, flipH, flipV, cropId, presetId]
  );

  const patch = (id: string, change: Partial<Item>) => setItems((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item)));

  const addFiles = (files: File[]) =>
    setItems((list) => [...list, ...files.map((file) => ({ id: String(nextId++), file, url: URL.createObjectURL(file), selected: false, status: "idle" as Status }))]);

  // 다른 프로그램 「형식 바꾸기」로 넘어온 결과(?src=서명 주소)를 목록에 넣는다(v1.09 바나나 캔버스, v1.10 AI 인물사진·AI 4컷 만화).
  // 허용 버킷은 lib/importSource.ts. 처리는 지금처럼 브라우저 안에서만.
  const [importNote, setImportNote] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const src = params.get("src");
    // v1.13: 보낸 프로그램이 게시처 규격도 함께 넘기면(?preset=insta-portrait) 미리 골라 둔다
    const pre = presetFromParam(params.get("preset"));
    if (pre) setPresetId(pre.id);
    if (!src) return;
    window.history.replaceState(null, "", window.location.pathname);
    const from = importSourceOf(src, process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (!from) { setImportNote("가져올 수 없는 이미지 주소입니다. 보낸 프로그램 결과의 「형식 바꾸기」로 다시 열어 주세요."); return; }
    (async () => {
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        if (!res.ok || !blob.type.startsWith("image/")) throw new Error();
        const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1] || "png";
        addFiles([new File([blob], `${from.replace(/\s+/g, "-")}-result.${ext}`, { type: blob.type })]);
        setImportNote(`${from} 결과를 목록에 넣었습니다. 형식과 크기를 고른 뒤 변환하세요.`);
      } catch {
        setImportNote(`이미지를 불러오지 못했습니다(주소가 1시간 뒤 만료됩니다). ${from}에서 다시 「형식 바꾸기」를 눌러 주세요.`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const blob = await convertImage(item.file, { ...options, focus: item.focus ?? null });
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
  const showFilter = scale !== 1 || limitSize || !!presetId;
  // v1.13: 변환 전 미리보기(썸네일·자를 위치 창)
  const previewT: PreviewTransform = { rotate, flipH, flipV, cropRatio: CROP_RATIOS.find((c) => c.id === cropId)?.ratio ?? null, preset: presetById(presetId) };
  const cropActive = !!presetId || cropId !== "original";
  const transformActive = cropActive || rotate !== 0 || flipH || flipV;
  const editing = items.find((i) => i.id === editingId) ?? null;
  const fieldClass = "rounded-xl border border-[#1e293b] bg-[#0d121f] px-3 py-2 text-xs text-slate-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50";
  const btn = "ics-btn inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-6">
      {/* 1. 드롭존 섹션 */}
      <section className="rounded-2xl border border-[#1e293b] bg-[#111726] p-4 sm:p-5 shadow-sm">
        {importNote && <p role="status" className="mb-3 rounded-lg border border-amber-300/40 bg-amber-50/10 px-3 py-2 text-sm">{importNote}</p>}
        <Dropzone currentCount={items.length} label={t.dropzone.convert} onFiles={addFiles} />
      </section>

      {/* 2. 변환 & 옵션 패널 섹션 */}
      <section className="rounded-2xl border border-[#1e293b] bg-[#111726] p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-[#1e293b] pb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
            <Sliders size={15} />
          </div>
          <h2 className="text-sm font-bold text-white">{t.convert.options}</h2>
          <span className="text-[11px] text-slate-400 font-mono">Atelier Engine</span>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.convert.format}</span>
            <select className={fieldClass} value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}>
              {OUTPUT_FORMATS.map((f) => (
                <option key={f} value={f} className="bg-[#0d121f] text-slate-200">{FORMAT_LABEL[f]}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.convert.quality}: <span className="text-violet-400 font-mono">{Math.round(quality * 100)}%</span></span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={quality}
              disabled={!usesQuality(format)}
              title={usesQuality(format) ? undefined : t.convert.qualityPng}
              onChange={(event) => setQuality(Number(event.target.value))}
              className="w-40 sm:w-48 accent-violet-500 disabled:opacity-30 cursor-pointer"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.convert.scale}</span>
            <select className={fieldClass} value={scale} onChange={(event) => setScale(Number(event.target.value))}>
              {SCALE_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-[#0d121f] text-slate-200">{t.convert[SCALE_KEYS[s]]}</option>
              ))}
            </select>
          </label>

          {showFilter && (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
              <span className="text-slate-200 font-semibold">{t.convert.filter}</span>
              <select className={fieldClass} value={filter} onChange={(event) => setFilter(event.target.value as ResampleFilter)}>
                {RESAMPLE_FILTERS.map((f) => (
                  <option key={f} value={f} className="bg-[#0d121f] text-slate-200">{t.filters[f]}</option>
                ))}
              </select>
            </label>
          )}

          {scale > 1 && (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
              <span className="text-slate-200 font-semibold">{t.convert.sharpen}: <span className="text-violet-400 font-mono">{sharpen}</span></span>
              <input
                type="range"
                min={0}
                max={300}
                step={10}
                value={sharpen}
                onChange={(event) => setSharpen(Number(event.target.value))}
                className="w-40 accent-violet-500 cursor-pointer"
              />
            </label>
          )}

          <label className="flex items-center gap-2 pb-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={limitSize}
              onChange={(event) => setLimitSize(event.target.checked)}
              className="h-4 w-4 rounded border-[#1e293b] bg-[#0d121f] accent-violet-600 cursor-pointer"
            />
            <span>{t.convert.sizeLimit}</span>
          </label>

          {limitSize && (
            <>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
                <span className="text-slate-200 font-semibold">{t.convert.maxW}</span>
                <input
                  type="number"
                  min={1}
                  max={16384}
                  className={`${fieldClass} w-24`}
                  value={maxW}
                  onChange={(event) => setMaxW(Math.max(1, Math.min(16384, Number(event.target.value) || 1)))}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
                <span className="text-slate-200 font-semibold">{t.convert.maxH}</span>
                <input
                  type="number"
                  min={1}
                  max={16384}
                  className={`${fieldClass} w-24`}
                  value={maxH}
                  onChange={(event) => setMaxH(Math.max(1, Math.min(16384, Number(event.target.value) || 1)))}
                />
              </label>
            </>
          )}
        </div>
        {/* F3(v1.12): 게시처 규격 · 회전 · 반전 · 비율 자르기 */}
        <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-[#1e293b] pt-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
            <span className="text-slate-200 font-semibold">{t.convert.preset}</span>
            <select className={fieldClass} value={presetId} onChange={(event) => setPresetId(event.target.value)}>
              <option value="" className="bg-[#0d121f] text-slate-200">{t.convert.presetNone}</option>
              {POST_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0d121f] text-slate-200">{t.presets[p.id] ?? p.label}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1.5 text-xs">
            <span className="text-slate-200 font-semibold">{t.convert.crop}</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.convert.crop}>
              {CROP_RATIOS.map((c) => (
                <button key={c.id} type="button" disabled={!!presetId} aria-pressed={cropId === c.id} onClick={() => setCropId(c.id)}
                  className={`${btn} whitespace-nowrap ${cropId === c.id && !presetId ? "ics-primary" : "ics-ghost"}`}>{c.id === "original" ? t.convert.cropOriginal : c.label}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-xs">
            <span className="text-slate-200 font-semibold">{t.convert.rotate}: <span className="text-violet-400 font-mono">{rotate}°</span></span>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={`${btn} ics-ghost whitespace-nowrap`} onClick={() => setRotate(normalizeRotation(rotate - 90))}>↺ {t.convert.rotLeft}</button>
              <button type="button" className={`${btn} ics-ghost whitespace-nowrap`} onClick={() => setRotate(normalizeRotation(rotate + 90))}>↻ {t.convert.rotRight}</button>
              <button type="button" className={`${btn} ics-ghost whitespace-nowrap`} onClick={() => setRotate(normalizeRotation(rotate + 180))}>{t.convert.rot180}</button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-xs">
            <span className="text-slate-200 font-semibold">{t.convert.flip}</span>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" aria-pressed={flipH} onClick={() => setFlipH((v) => !v)} className={`${btn} whitespace-nowrap ${flipH ? "ics-primary" : "ics-ghost"}`}>⇋ {t.convert.flipH}</button>
              <button type="button" aria-pressed={flipV} onClick={() => setFlipV((v) => !v)} className={`${btn} whitespace-nowrap ${flipV ? "ics-primary" : "ics-ghost"}`}>⇵ {t.convert.flipV}</button>
            </div>
          </div>
          {(presetId || rotate || flipH || flipV || cropId !== "original") && (
            <button type="button" className={`${btn} ics-danger whitespace-nowrap`} onClick={() => { setPresetId(""); setRotate(0); setFlipH(false); setFlipV(false); setCropId("original"); }}>{t.convert.transformReset}</button>
          )}
        </div>
        {presetId && <p className="mt-2 text-[11px] text-violet-300">{t.convert.presetNote}</p>}
        <p className="mt-4 text-[11px] text-slate-400 border-t border-[#1e293b]/60 pt-3">🔒 {t.privacy}</p>
      </section>

      {/* 3. 작업 리스트 및 갤러리 섹션 */}
      <section className="rounded-2xl border border-[#1e293b] bg-[#111726] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-xl border border-[#1e293b] bg-[#0d121f] px-3 py-1 font-medium text-slate-300">
              {fmt(t.convert.total, { n: items.length })}
            </span>
            <span className="rounded-xl border border-violet-500/30 bg-violet-950/40 px-3 py-1 font-medium text-violet-300">
              {fmt(t.convert.selected, { n: selectedCount })}
            </span>
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 font-medium text-emerald-300">
              {fmt(t.convert.done, { n: doneCount })}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`${btn} ics-ghost border border-[#1e293b] bg-[#162032] text-slate-300 hover:bg-[#1e293b] hover:text-white`}
              onClick={() => setItems((list) => list.map((item) => ({ ...item, selected: true })))}
              disabled={items.length === 0}
            >
              {t.convert.selectAll}
            </button>
            <button
              type="button"
              className={`${btn} ics-ghost border border-[#1e293b] bg-[#162032] text-slate-300 hover:bg-[#1e293b] hover:text-white`}
              onClick={() => setItems((list) => list.map((item) => ({ ...item, selected: false })))}
              disabled={items.length === 0}
            >
              {t.convert.deselectAll}
            </button>
            <button
              type="button"
              className={`${btn} ics-danger border border-rose-900/40 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40`}
              onClick={clearAll}
              disabled={busy || items.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t.convert.clearAll}</span>
            </button>
          </div>
        </div>

        {/* 액션 버튼 바 */}
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            className={`${btn} ics-primary bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-md shadow-violet-500/20`}
            onClick={() => void convertSelected()}
            disabled={busy || selectedCount === 0}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.convert.converting}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{fmt(t.convert.convertSelected, { n: selectedCount })}</span>
              </>
            )}
          </button>

          <button
            type="button"
            className={`${btn} ics-secondary border border-[#334155] bg-[#1e293b] text-white hover:bg-[#334155]`}
            onClick={() => void downloadZip()}
            disabled={zipping || doneCount === 0}
          >
            <Download className="h-4 w-4 text-violet-400" />
            <span>{t.convert.zip} ({doneCount})</span>
          </button>
        </div>

        {/* 빈 상태 또는 이미지 그리드 */}
        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#1e293b] bg-[#0d121f]/50 py-12 text-center">
            <ImageIcon className="mx-auto h-8 w-8 text-slate-500 mb-2 opacity-60" />
            <p className="text-sm font-medium text-slate-400">{t.convert.empty}</p>
            <p className="mt-1 text-xs text-slate-400">위 드롭존에 변환할 이미지를 끌어다 놓아주세요.</p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
            {items.map((item) => {
              const ratio = item.result ? Math.round((1 - item.result.blob.size / item.file.size) * 100) : 0;
              return (
                <div
                  key={item.id}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-[#0d121f] transition-all ${
                    item.selected
                      ? "border-violet-500 ring-2 ring-violet-500/30 shadow-md shadow-violet-500/10"
                      : "border-[#1e293b] hover:border-[#334155]"
                  }`}
                >
                  {/* 체크박스 선택 버튼 */}
                  <button
                    type="button"
                    aria-label="select"
                    aria-pressed={item.selected}
                    onClick={() => patch(item.id, { selected: !item.selected })}
                    className={`absolute left-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg border text-white transition-all shadow-xs ${
                      item.selected
                        ? "border-violet-500 bg-violet-600 shadow-violet-500/30"
                        : "border-slate-500/80 bg-black/60 backdrop-blur-xs hover:border-violet-400"
                    }`}
                  >
                    {item.selected && <Check className="h-3.5 w-3.5" />}
                  </button>

                  {/* 미리보기 이미지 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <div className="relative h-36 w-full bg-[#080b12] overflow-hidden flex items-center justify-center">
                    {transformActive && !item.result ? (
                      <TransformedPreview url={item.url} t={previewT} focus={item.focus} maxSide={360} className="h-full w-full object-contain" />
                    ) : (
                      <img
                        src={item.result?.url ?? item.url}
                        alt={item.file.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                    {item.status === "done" && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-emerald-950/80 backdrop-blur-xs border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        완료
                      </span>
                    )}
                  </div>

                  {/* 상세 정보 */}
                  <div className="flex flex-col gap-1 p-3 text-xs">
                    <span className="truncate text-xs font-bold text-white" title={item.file.name}>
                      {item.file.name}
                    </span>
                    <div className="text-[11px] text-slate-400 font-mono">
                      <span>{formatBytes(item.file.size)}</span>
                      {item.result && (
                        <>
                          <span className="text-slate-400"> → </span>
                          <span className="text-emerald-400 font-bold">{formatBytes(item.result.blob.size)}</span>
                          <span
                            className={`ml-1 inline-block rounded px-1 text-[10px] ${
                              ratio >= 0
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {fmt(ratio >= 0 ? t.convert.saved : t.convert.bigger, { p: Math.abs(ratio) })}
                          </span>
                        </>
                      )}
                    </div>

                    {item.status === "working" && (
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#1e293b]">
                        <div className="h-full w-2/3 animate-pulse bg-gradient-to-r from-violet-500 to-indigo-500" />
                      </div>
                    )}
                    {item.status === "error" && <span className="text-[11px] text-rose-400">{item.error}</span>}
                  </div>

                  {/* 하단 카드 액션 버튼들 */}
                  {cropActive && (
                    <div className="px-2 pt-2">
                      <button type="button" className={`${btn} ics-ghost w-full whitespace-nowrap py-1.5 text-[11px]`} onClick={() => setEditingId(item.id)}>
                        ✂ {t.convert.cropPos}{item.focus ? " ✓" : ""}
                      </button>
                    </div>
                  )}
                  <div className="flex gap-1.5 p-2 pt-0 border-t border-[#1e293b]/50 mt-auto">
                    <button
                      type="button"
                      className={`${btn} flex-1 ics-primary bg-violet-600 hover:bg-violet-500 text-white py-1.5 text-[11px]`}
                      onClick={() => void convertSingle(item)}
                      disabled={busy}
                    >
                      {t.convert.one}
                    </button>
                    {item.result && (
                      <button
                        type="button"
                        className={`${btn} flex-1 ics-secondary border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-slate-200 py-1.5 text-[11px]`}
                        onClick={() => triggerDownload(item.result!.url, item.result!.name)}
                      >
                        {t.convert.save}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="remove"
                      className="inline-flex items-center justify-center rounded-xl border border-[#1e293b] p-1.5 text-slate-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors"
                      onClick={() => removeItem(item.id)}
                      disabled={busy}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {/* v1.13: 자를 위치 편집 창 */}
      {editing && cropActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setEditingId(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-[#2a3852] bg-[#111726] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white">✂ {t.convert.cropPos} — <span className="text-slate-300">{editing.file.name}</span></h3>
            <p className="mt-1 text-[12px] text-slate-300">{t.convert.cropPosHint}</p>
            <div className="mt-3 flex justify-center rounded-xl bg-[#080b12] p-2">
              <TransformedPreview url={editing.url} t={previewT} focus={editing.focus} maxSide={640} className="max-h-[60vh] max-w-full"
                onFocusChange={(f) => patch(editing.id, { focus: f, status: editing.result ? "idle" : editing.status })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={`${btn} ics-ghost whitespace-nowrap`} onClick={() => patch(editing.id, { focus: { ...CENTER } })}>{t.convert.cropCenter}</button>
              <button type="button" className={`${btn} ics-primary whitespace-nowrap`} onClick={() => setEditingId(null)}>{t.convert.cropDone}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
