"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Image as ImageIcon, Loader2, Sparkles, Upload } from "lucide-react";
import {
  ASPECTS, BACKGROUND, CAMERA, COLOR, FILM, LIGHTING, OUTFIT, POSE, RESOLUTIONS, RETOUCH, SKIN, byId,
} from "@/lib/portrait/options";
import type { AspectRatio, ModelLevel, PurposeId, Resolution, Retouch } from "@/lib/portrait/options";
import { PURPOSES, getPurpose } from "@/lib/portrait/purposes";
import type { Purpose } from "@/lib/portrait/purposes";
import { MAX_CANDIDATES, SIZE_PRESETS, baseNameOf, controlsFromCrop, coverCrop, decideBatchCrop, describeBatchDecision, evaluateHead, headInCrop, moveItem, parseStoredControls, safeFileName, scaleCrop, sizePresetById, tightCrop, toneFilter } from "@/lib/portrait/post";

const MAX_BATCH = 6;
import { downloadBlob, makeThumb, prepareInput, renderSized, renderPng, toUploadJpeg, whitenDataUrl } from "@/lib/portrait/canvas";
import { addHistory } from "@/lib/portrait/history";
import { createZip } from "@/lib/portrait/zip";
import { GuideOverlay } from "./GuideOverlay";
import { ZoomCompare } from "./ZoomCompare";
import { CropAdjuster } from "./CropAdjuster";

const OUTFIT_CATS = [
  { id: "all", label: "전체" }, { id: "formal", label: "포멀" }, { id: "casual", label: "캐주얼" },
  { id: "editorial", label: "화보" }, { id: "cozy", label: "편안한" },
] as const;

function Section({ n, title, sub, children }: { n?: number; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card st-sec">
      <div className="st-sec-head">{n !== undefined && <span className="gd-num">{n}</span>}<h2>{title}</h2></div>
      {sub && <p className="muted">{sub}</p>}
      {children}
    </section>
  );
}

function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return <button type="button" className={on ? "chip on" : "chip"} aria-pressed={on} onClick={onClick} title={title}>{children}</button>;
}

export function Studio({ userId }: { userId: string }) {
  const first = PURPOSES[0];
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selfie, setSelfie] = useState(false);
  const [confirmOwn, setConfirmOwn] = useState(false);

  const [purposeId, setPurposeId] = useState<PurposeId>(first.id);
  const [aspect, setAspect] = useState<AspectRatio>(first.aspect);
  const [poseId, setPoseId] = useState(first.poseId);
  const [lightingId, setLightingId] = useState(first.lightingId);
  const [backgroundId, setBackgroundId] = useState(first.backgroundId);
  const [colorId, setColorId] = useState(first.colorId);
  const [outfitId, setOutfitId] = useState(first.outfitId);
  const [filmId, setFilmId] = useState(first.filmId);
  const [cameraId, setCameraId] = useState(first.cameraId);
  const [skinIds, setSkinIds] = useState<string[]>(first.skinIds);
  const [symmetry, setSymmetry] = useState(first.symmetry);
  const [guide, setGuide] = useState(first.guide);
  const [whiten, setWhiten] = useState(first.whiteClean);
  const [retouch, setRetouch] = useState<Retouch>(first.retouch);
  const [outfitCat, setOutfitCat] = useState<(typeof OUTFIT_CATS)[number]["id"]>("all");

  const [model, setModel] = useState<ModelLevel>("flash");
  const [resolution, setResolution] = useState<Resolution>("1K");

  const [results, setResults] = useState<string[]>([]);
  const [sources, setSources] = useState<number[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [serverSave, setServerSave] = useState(false);
  const [retention, setRetention] = useState(30);
  const [progress, setProgress] = useState("");
  const [active, setActive] = useState(0);
  const [count, setCount] = useState(1);
  const [sizeId, setSizeId] = useState(SIZE_PRESETS[0].id);
  const [compare, setCompare] = useState(false);
  const [grid, setGrid] = useState(false);
  const [zoomOn, setZoomOn] = useState(false);
  const [skip, setSkip] = useState<boolean[]>([]);
  const [headBusy, setHeadBusy] = useState(false);
  const [repZoom, setRepZoom] = useState<number | null>(null);
  const [cropOpen, setCropOpen] = useState<{ w: number; h: number } | null>(null);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [pendingCrop, setPendingCrop] = useState(false);
  const [measures, setMeasures] = useState<Record<number, { crownY: number; chinY: number; centerX: number; srcW: number; srcH: number; manual: boolean }>>({});
  const [markStart, setMarkStart] = useState(false);
  const [retryConfirm, setRetryConfirm] = useState(false);
  const [centerOk, setCenterOk] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoProgress, setAutoProgress] = useState("");
  const [batchReport, setBatchReport] = useState<{ idx: number; name: string; text: string; tone: "ok" | "warn" | "info" }[]>([]);
  const [batchCrops, setBatchCrops] = useState<Record<number, { presetId: string; crop: { sx: number; sy: number; sw: number; sh: number }; srcW: number; srcH: number }>>({});
  const [headMeasure, setHeadMeasure] = useState<{ url: string; crownY: number; chinY: number; centerX: number; srcW: number; srcH: number } | null>(null);
  const [headMsg, setHeadMsg] = useState<{ tone: "ok" | "warn" | "info"; text: string } | null>(null);
  const [names, setNames] = useState<Record<number, string>>({});
  const [cmpPos, setCmpPos] = useState(50);
  const result = results[active] ?? null;
  const sourceIdx = sources[active] ?? 0;
  const comparePreview = previews[sourceIdx] ?? previewUrl;
  const batchMode = files.length > 1;
  /** 일괄 모드에서 사진(원본 파일 번호)별 저장 이름 — 지정하지 않으면 업로드 파일 이름을 쓴다 */
  const nameFor = (fileIdx: number, fallback: string) =>
    safeFileName(names[fileIdx] ?? baseNameOf(files[fileIdx]?.name ?? ""), fallback);
  const [cleaned, setCleaned] = useState<{ url: string; ratio: number } | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [mirrored, setMirrored] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [exposure, setExposure] = useState(0);
  const [contrast, setContrast] = useState(0);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needKey, setNeedKey] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { previews.forEach((u) => URL.revokeObjectURL(u)); }, [previews]);
  useEffect(() => {
    try {
      setServerSave(localStorage.getItem("portrait-photo:server-save") === "1");
      const r = Number(localStorage.getItem("portrait-photo:retention"));
      if ([0, 7, 30, 90].includes(r) && localStorage.getItem("portrait-photo:retention") !== null) setRetention(r);
    } catch { /* 무시 */ }
  }, []);
  function changeRetention(days: number) {
    setRetention(days);
    try { localStorage.setItem("portrait-photo:retention", String(days)); } catch { /* 무시 */ }
  }
  function toggleServerSave(on: boolean) {
    setServerSave(on);
    try { localStorage.setItem("portrait-photo:server-save", on ? "1" : "0"); } catch { /* 무시 */ }
  }

  const applyPurpose = useCallback((p: Purpose) => {
    setPurposeId(p.id); setAspect(p.aspect); setPoseId(p.poseId); setLightingId(p.lightingId);
    setBackgroundId(p.backgroundId); setColorId(p.colorId); setOutfitId(p.outfitId); setFilmId(p.filmId);
    setCameraId(p.cameraId); setSkinIds(p.skinIds); setSymmetry(p.symmetry); setGuide(p.guide);
    setWhiten(p.whiteClean); setRetouch(p.retouch); setMirrored(false);
    setNotice(`‘${p.label}’에 맞는 촬영 설정을 적용했습니다.`);
  }, []);

  // 생성 결과가 바뀌거나 순백 정리를 켜면 배경 정리본을 만든다
  useEffect(() => {
    let alive = true;
    if (!result || !whiten) { setCleaned(null); return; }
    setCleaning(true);
    whitenDataUrl(result)
      .then((r) => { if (alive) setCleaned({ url: r.dataUrl, ratio: r.ratio }); })
      .catch(() => { if (alive) setCleaned(null); })
      .finally(() => { if (alive) setCleaning(false); });
    return () => { alive = false; };
  }, [result, whiten]);

  const shown = whiten && cleaned ? cleaned.url : result;
  useEffect(() => { setCropOpen(null); }, [shown]);
  useEffect(() => {
    if (!pendingCrop || !result) return;
    if (whiten && (cleaning || !cleaned)) return;
    setPendingCrop(false);
    void openCrop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCrop, result, shown, whiten, cleaning, cleaned]);
  const filter = useMemo(() => toneFilter(brightness, exposure, contrast), [brightness, exposure, contrast]);
  const toneActive = brightness !== 0 || exposure !== 0 || contrast !== 0;

  function onPick(list: FileList | File[] | null) {
    const picked = Array.from(list ?? []).filter((f) => /^image\/(png|jpeg|webp)$/.test(f.type));
    if (picked.length === 0) { if (list && Array.from(list).length) setError("PNG, JPG, WEBP 사진만 올릴 수 있습니다."); return; }
    const chosen = picked.slice(0, MAX_BATCH);
    previews.forEach((u) => URL.revokeObjectURL(u));
    const urls = chosen.map((f) => URL.createObjectURL(f));
    setNames({}); setBatchCrops({}); setMeasures({}); setBatchReport([]); setAutoConfirm(false); setZoomOn(false); setFiles(chosen); setPreviews(urls);
    setFile(chosen[0]); setPreviewUrl(urls[0]);
    setResults([]); setSources([]); setActive(0); setCompare(false); setCleaned(null); setError(""); setNeedKey(false);
    setNotice(picked.length > MAX_BATCH ? `사진은 한 번에 ${MAX_BATCH}장까지 처리합니다. 앞의 ${MAX_BATCH}장만 사용합니다.` : chosen.length > 1 ? `${chosen.length}장을 한 번에 처리합니다(사진마다 결과 1장).` : "");
  }

  async function generate() {
    if (files.length === 0 && !file) { setError("인물 사진을 먼저 올려 주세요."); return; }
    if (!confirmOwn) { setError("본인 사진이거나 사용 동의를 받은 사진임을 확인해 주세요."); return; }
    const batch = files.length > 1;
    const inputs = batch ? files : [file as File];
    setGrid(false); setZoomOn(false); setCropOpen(null); setBatchCrops({}); setMeasures({}); setBatchReport([]); setAutoConfirm(false); setSkip([]); setHeadMsg(null); setHeadMeasure(null); setBusy(true); setError(""); setNeedKey(false); setNotice(""); setResults([]); setSources([]); setActive(0); setCleaned(null); setMirrored(false); setCompare(false);
    setBrightness(0); setExposure(0); setContrast(0); setProgress("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    type Out = { url: string; model: string; src: number };
    try {
      const options = { lightingId, cameraId, poseId, outfitId, filmId, colorId, backgroundId, skinIds, retouch, truePerspective: selfie, symmetry };
      const callOne = async (body: string): Promise<{ url: string; model: string }> => {
        const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal, body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { const err = new Error(data.error || "이미지를 만들지 못했습니다.") as Error & { needKey?: boolean }; err.needKey = !!data.needKey; throw err; }
        return { url: `data:${data.image.mimeType};base64,${data.image.data}`, model: (data.model as string | undefined) ?? model };
      };
      // 작업 목록: 일괄이면 사진마다 1장, 단일이면 후보 count장
      const jobs: { src: number; body: Promise<string> }[] = [];
      for (let i = 0; i < inputs.length; i++) {
        const bodyP = prepareInput(inputs[i], selfie).then((inp) => JSON.stringify({ image: { data: inp.base64, mimeType: inp.mimeType }, model, resolution, aspect, options }));
        const n = batch ? 1 : count;
        for (let k = 0; k < n; k++) jobs.push({ src: i, body: bodyP });
      }
      const ok: Out[] = [];
      const failed: (Error & { needKey?: boolean })[] = [];
      let done = 0;
      const limit = batch ? 2 : jobs.length;
      let next = 0;
      const worker = async () => {
        while (next < jobs.length) {
          const j = jobs[next++];
          try { const r = await callOne(await j.body); ok.push({ ...r, src: j.src }); }
          catch (e) { failed.push(e as Error & { needKey?: boolean }); }
          done++;
          if (batch) setProgress(`${done}/${jobs.length}장 처리됨`);
        }
      };
      await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
      if (ok.length === 0) {
        const first = failed[0];
        if (first?.name === "AbortError") throw first;
        setNeedKey(!!first?.needKey);
        throw new Error(first?.message || "이미지를 만들지 못했습니다.");
      }
      ok.sort((a, b) => a.src - b.src);
      setResults(ok.map((r) => r.url));
      setSources(ok.map((r) => r.src));
      setSkip(ok.map(() => false));
      setHeadMsg(null);
      setHeadMeasure(null);
      if (ok.length > 1 && !batch) setGrid(true);
      if (failed.length > 0) setNotice(`${jobs.length}장 중 ${ok.length}장을 만들었습니다. 나머지는 실패해 다시 시도해 주세요.`);
      else if (batch) setNotice(`${ok.length}장을 모두 만들었습니다. 아래에서 사진을 눌러 확인하고 [전체 저장]으로 한꺼번에 받을 수 있어요.`);
      else if (ok.length > 1) setNotice(`후보 ${ok.length}장을 만들었습니다. 마음에 드는 사진을 눌러 고르세요.`);
      const purpose = getPurpose(purposeId);
      let serverFail = 0;
      for (const r of ok) {
        makeThumb(r.url).then((thumb) => addHistory(userId, {
          id: crypto.randomUUID(), createdAt: Date.now(), purposeLabel: purpose?.label ?? "자유", aspect, model: r.model, thumb,
        })).catch(() => undefined);
      }
      if (serverSave) {
        for (const r of ok) {
          try {
            const up = await toUploadJpeg(r.url);
            if (!up) { serverFail++; continue; }
            const res = await fetch("/api/saved", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: { data: up.base64, mimeType: up.mimeType }, purposeLabel: purpose?.label ?? "자유", aspect, model: r.model, retentionDays: retention }),
            });
            if (!res.ok) serverFail++;
          } catch { serverFail++; }
        }
        setNotice((n) => `${n ? n + " " : ""}${serverFail === 0 ? "서버 보관함에도 저장했습니다." : `서버 보관함 저장에 ${serverFail}장 실패했습니다.`}`);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") setError("생성을 취소했습니다.");
      else if (e instanceof Error && e.name === "AbortError") setError("생성을 취소했습니다.");
      else setError(e instanceof Error ? e.message : "이미지를 만들지 못했습니다.");
    } finally {
      setBusy(false); setProgress(""); abortRef.current = null;
    }
  }

  /** 규격을 바꾸면 이미 얻은 머리 위치(AI 추정·직접 지정)로 새 규격의 자르기 영역과 보고를 다시 계산한다(AI 호출 없음) */
  function changePreset(id: string) {
    const p = sizePresetById(id);
    setSizeId(id); setHeadMsg(null); setAutoConfirm(false); setRetryConfirm(false);
    if (!batchMode || Object.keys(measures).length === 0 || !p.headRange) { setBatchReport([]); return; }
    const rep: { idx: number; name: string; text: string; tone: "ok" | "warn" | "info" }[] = [];
    const next = { ...batchCrops };
    results.forEach((_, i) => {
      if (skip[i]) return;
      const fi = sources[i] ?? i;
      const label = nameFor(fi, `${i + 1}번`);
      const m = measures[fi];
      if (!m) {
        const old = batchReport.find((r) => r.idx === i && r.text.includes("얼굴 위치를 찾지 못해"));
        if (old) rep.push(old);
        return;
      }
      const d = decideBatchCrop({ found: true, crownY: m.crownY, chinY: m.chinY, centerX: m.centerX }, p, m.srcW, m.srcH, centerOk);
      if (d.crop) next[fi] = { presetId: p.id, crop: d.crop, srcW: m.srcW, srcH: m.srcH };
      else if (next[fi] && next[fi].presetId !== p.id) delete next[fi];
      const t = describeBatchDecision(d, m.manual);
      rep.push({ idx: i, name: label, text: t.text, tone: t.tone });
    });
    setBatchCrops(next);
    setBatchReport(rep);
    setNotice(`${p.label.split(" (")[0]} 규격으로 바꿔 이미 얻은 머리 위치로 다시 계산했습니다(AI 호출 없음).`);
  }

  /** 일괄 검사 보고에서 해당 사진의 영역 조정(또는 얼굴 위치 직접 지정)을 연다 */
  function gotoCrop(i: number, mark: boolean) {
    setGrid(false); setZoomOn(false); setCropOpen(null); setCleaned(null);
    setActive(i); setMarkStart(mark); setPendingCrop(true);
  }

  /** 사용자가 직접 지정한 정수리·턱으로 확대 자르기 영역을 정한다 */
  function handleMark(mk: { crownY: number; chinY: number; centerX: number }) {
    if (!cropOpen) return;
    const preset = sizePresetById(sizeId);
    const url = result ?? shown;
    if (!url) return;
    setHeadMeasure({ url, crownY: mk.crownY, chinY: mk.chinY, centerX: mk.centerX, srcW: cropOpen.w, srcH: cropOpen.h });
    setMeasures((cur) => ({ ...cur, [sources[active] ?? active]: { crownY: mk.crownY, chinY: mk.chinY, centerX: mk.centerX, srcW: cropOpen.w, srcH: cropOpen.h, manual: true } }));
    setMarkStart(false);
    if (!preset.headRange) { setNotice("이 규격은 공식 머리 기준이 없어 위치만 기록했습니다."); return; }
    const t = tightCrop(mk.crownY, mk.chinY, cropOpen.w, cropOpen.h, preset, (preset.headRange[0] + preset.headRange[1]) / 2, mk.centerX);
    const cur = headInCrop(mk.crownY, mk.chinY, cropOpen.w, cropOpen.h, preset).ratio;
    const pct = (n: number) => Math.round(n * 100);
    const fileIdx = sources[active] ?? active;
    if (batchMode) setBatchCrops((c) => ({ ...c, [fileIdx]: { presetId: preset.id, crop: t.crop, srcW: cropOpen.w, srcH: cropOpen.h } }));
    setBatchReport((rep) => rep.map((r) => (r.idx === active ? { ...r, text: `수동 지정: 머리 약 ${pct(cur)}% → 확대 자르기로 약 ${pct(t.achievedRatio)}%`, tone: "ok" as const } : r)));
    setNotice(`얼굴 위치를 지정했습니다(머리 약 ${pct(cur)}% → ${pct(t.achievedRatio)}%). 추천 영역이 갱신됐습니다.`);
  }

  async function openCrop() {
    if (!shown) return;
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("이미지를 읽지 못했습니다.")); img.src = shown; });
      setGrid(false); setZoomOn(false);
      setCropOpen({ w: img.naturalWidth, h: img.naturalHeight });
    } catch (e) { setError(e instanceof Error ? e.message : "이미지를 읽지 못했습니다."); }
  }

  /** 조정한 영역으로 규격 크기 저장 */
  async function saveCropped(crop: { sx: number; sy: number; sw: number; sh: number }) {
    if (!shown) return;
    const preset = sizePresetById(sizeId);
    if (cropOpen) {
      try { localStorage.setItem(`portrait-photo:crop:${preset.id}`, JSON.stringify(controlsFromCrop(crop, cropOpen.w, cropOpen.h))); } catch { /* 무시 */ }
    }
    setSaving("lic");
    try {
      const r = await renderSized(shown, preset, { mirrored, filter, applyFilter: toneActive, crop });
      downloadBlob(r.blob, `${batchMode ? nameFor(sourceIdx, "증명사진") : "증명사진"}-${preset.id}-조정-${preset.width}x${preset.height}.jpg`);
      const up = crop.sw < preset.width ? " 원본보다 확대돼 선명도가 낮을 수 있습니다." : "";
      setNotice(`조정한 영역으로 ${preset.width}×${preset.height}px 저장했습니다(${Math.round(r.bytes / 1024)}KB).${up} 제출 기관의 사진 규정은 별도로 확인해 주세요.${preset.caution ? " " + preset.caution : ""}`);
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); } finally { setSaving(""); }
  }

  /** 머리 비율 검사 결과로 규격에 맞춰 얼굴 쪽을 더 가깝게 잘라 저장한다 */
  async function saveTight() {
    if (!shown || !headMeasure) return;
    const preset = sizePresetById(sizeId);
    if (!preset.headRange) return;
    const target = (preset.headRange[0] + preset.headRange[1]) / 2;
    const t = tightCrop(headMeasure.crownY, headMeasure.chinY, headMeasure.srcW, headMeasure.srcH, preset, target, headMeasure.centerX);
    setSaving("lic");
    try {
      const r = await renderSized(shown, preset, { mirrored, filter, applyFilter: toneActive, crop: t.crop });
      downloadBlob(r.blob, `${batchMode ? nameFor(sourceIdx, "증명사진") : "증명사진"}-${preset.id}-확대-${preset.width}x${preset.height}.jpg`);
      const pct = (n: number) => Math.round(n * 100);
      const up = t.crop.sw < preset.width ? " 원본 해상도보다 확대돼 선명도가 낮을 수 있습니다." : "";
      setNotice(`얼굴 확대 자르기로 저장했습니다(머리 약 ${pct(t.achievedRatio)}%, 기준 ${pct(preset.headRange[0])}~${pct(preset.headRange[1])}%${t.clamped ? ", 사진 크기 한계로 더 확대하지 못했습니다" : ""}).${up} 머리 위치는 AI 추정이라 결과를 눈으로 확인하세요. 제출 기관 규정은 별도로 확인해 주세요.${preset.caution ? " " + preset.caution : ""}`);
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); } finally { setSaving(""); }
  }

  /** 일괄 모드: 사진마다 머리 비율을 AI로 검사하고, 작게 나온 사진은 자동 확대 자르기 영역을 지정한다(AI N회 호출) */
  async function autoCropBatch(only?: number[]) {
    const preset = sizePresetById(sizeId);
    if (!preset.headRange) return;
    const keep = results.map((_, i) => i).filter((i) => !skip[i]).filter((i) => !only || only.includes(i));
    if (keep.length === 0) { setError("검사할 사진이 없습니다. 제외 표시를 확인해 주세요."); return; }
    setAutoConfirm(false); setRetryConfirm(false); setAutoBusy(true); setError(""); setNeedKey(false);
    const report: { idx: number; name: string; text: string; tone: "ok" | "warn" | "info" }[] = only ? batchReport.filter((r) => !only.includes(r.idx)) : [];
    if (!only) setBatchReport([]);
    let stop = false;
    let done = 0;
    let next = 0;
    const pct = (n: number) => Math.round(n * 100);
    const worker = async () => {
      while (!stop && next < keep.length) {
        const i = keep[next++];
        const fileIdx = sources[i] ?? i;
        const label = nameFor(fileIdx, `${i + 1}번`);
        try {
          const up = await toUploadJpeg(results[i]);
          if (!up) throw new Error("검사용 이미지를 만들지 못했습니다.");
          const res = await fetch("/api/headcheck", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: { data: up.base64, mimeType: up.mimeType } }) });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) { if (data.needKey) { setNeedKey(true); stop = true; } throw new Error(data.error || "검사하지 못했습니다."); }
          const im = new Image();
          await new Promise<void>((resolve, reject) => { im.onload = () => resolve(); im.onerror = () => reject(new Error("이미지를 읽지 못했습니다.")); im.src = results[i]; });
          const d = decideBatchCrop(data, preset, im.naturalWidth, im.naturalHeight, centerOk);
          if (d.status !== "notfound") {
            const mm = { crownY: data.crownY as number, chinY: data.chinY as number, centerX: typeof data.centerX === "number" ? (data.centerX as number) : 0.5, srcW: im.naturalWidth, srcH: im.naturalHeight, manual: false };
            setMeasures((cur) => ({ ...cur, [fileIdx]: mm }));
          }
          if (d.status === "notfound") report.push({ idx: i, name: label, text: "얼굴 위치를 찾지 못해 자동 중앙 자르기를 씁니다.", tone: "warn" });
          else if (d.status === "ok" || d.status === "large") {
            if (d.crop) {
              const crop = d.crop;
              setBatchCrops((cur) => ({ ...cur, [fileIdx]: { presetId: preset.id, crop, srcW: im.naturalWidth, srcH: im.naturalHeight } }));
            }
            const where = d.crop ? "얼굴 가로 중앙 맞춤" : "자동 중앙 자르기";
            report.push(d.status === "ok"
              ? { idx: i, name: label, text: `머리 약 ${pct(d.ratio ?? 0)}% — 범위 안(${where})`, tone: "ok" }
              : { idx: i, name: label, text: `머리 약 ${pct(d.ratio ?? 0)}% — 기준보다 큼(${where}, 필요하면 [자르기 영역 조정])`, tone: "warn" });
          }
          else if (d.crop) {
            const crop = d.crop;
            setBatchCrops((cur) => ({ ...cur, [fileIdx]: { presetId: preset.id, crop, srcW: im.naturalWidth, srcH: im.naturalHeight } }));
            report.push({ idx: i, name: label, text: `머리 약 ${pct(d.ratio ?? 0)}% → 확대 자르기로 약 ${pct(d.achieved ?? 0)}%${d.clamped ? " (원본 한계로 더 확대하지 못함)" : ""}`, tone: "ok" });
          }
        } catch (e) {
          report.push({ idx: i, name: label, text: e instanceof Error ? e.message : "검사하지 못했습니다.", tone: "warn" });
        }
        done++;
        setAutoProgress(`${done}/${keep.length}장 검사됨`);
      }
    };
    try {
      await Promise.all(Array.from({ length: Math.min(2, keep.length) }, worker));
      report.sort((a, b) => a.idx - b.idx);
      setBatchReport(report);
      const applied = report.filter((r) => r.text.includes("확대 자르기로")).length;
      setNotice(`일괄 머리 비율 검사를 마쳤습니다(${keep.length}장 중 확대 자르기 지정 ${applied}장). [규격으로 일괄 저장]을 누르면 지정된 영역으로 저장됩니다. 머리 위치는 AI 추정이라 결과를 눈으로 확인하세요.`);
    } finally { setAutoBusy(false); setAutoProgress(""); }
  }

  /** 일괄 모드: 제외하지 않은 모든 결과를 선택한 규격 크기 JPEG로 만들어 ZIP 하나로 저장(사진마다 지정한 영역 우선) */
  async function saveSizedBatch() {
    const preset = sizePresetById(sizeId);
    const keep = results.map((_, i) => i).filter((i) => !skip[i]);
    if (keep.length === 0) { setError("저장할 사진이 없습니다. 제외 표시를 확인해 주세요."); return; }
    setSaving("batch");
    try {
      const entries: { name: string; data: Uint8Array }[] = [];
      let custom = 0;
      let over = 0;
      for (const i of keep) {
        let src = results[i];
        if (whiten) { try { src = (await whitenDataUrl(src)).dataUrl; } catch { /* 원본 사용 */ } }
        const fileIdx = sources[i] ?? i;
        const bc = batchCrops[fileIdx];
        let crop: { sx: number; sy: number; sw: number; sh: number } | undefined;
        if (bc && bc.presetId === preset.id) {
          const im = new Image();
          await new Promise<void>((resolve, reject) => { im.onload = () => resolve(); im.onerror = () => reject(new Error("이미지를 읽지 못했습니다.")); im.src = src; });
          crop = scaleCrop(bc.crop, bc.srcW, bc.srcH, im.naturalWidth, im.naturalHeight);
          custom++;
        }
        const r = await renderSized(src, preset, { mirrored, filter, applyFilter: toneActive, crop });
        if (r.overLimit) over++;
        entries.push({ name: `${nameFor(fileIdx, `증명사진-${i + 1}`)}-${preset.id}-${preset.width}x${preset.height}.jpg`, data: new Uint8Array(await r.blob.arrayBuffer()) });
      }
      const zip = createZip(entries);
      downloadBlob(new Blob([zip as BlobPart], { type: "application/zip" }), `증명사진-${preset.id}-${entries.length}장-${new Date().toISOString().slice(0, 10)}.zip`);
      setNotice(`${entries.length}장을 ${preset.width}×${preset.height}px로 ZIP 저장했습니다(직접 지정한 영역 ${custom}장, 자동 중앙 자르기 ${entries.length - custom}장${over ? `, 용량 제한을 넘은 파일 ${over}장` : ""}). 제출 기관의 사진 규정은 별도로 확인해 주세요.${preset.caution ? " " + preset.caution : ""}`);
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); } finally { setSaving(""); }
  }

  function moveResult(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= results.length) return;
    setResults((a) => moveItem(a, i, j));
    setSources((a) => moveItem(a, i, j));
    setSkip((a) => moveItem(a, i, j));
    setActive((cur) => (cur === i ? j : cur === j ? i : cur));
    setCleaned(null);
  }

  async function checkHead() {
    if (!shown) return;
    const preset = sizePresetById(sizeId);
    if (!preset.headRange) { setHeadMsg({ tone: "info", text: "이 규격은 공식 안내에서 머리 높이 비율 기준을 확인하지 못해 검사하지 않습니다." }); return; }
    setHeadBusy(true); setHeadMsg(null); setError(""); setNeedKey(false);
    try {
      const up = await toUploadJpeg(shown);
      if (!up) throw new Error("검사용 이미지를 만들지 못했습니다.");
      const res = await fetch("/api/headcheck", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: { data: up.base64, mimeType: up.mimeType } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setNeedKey(!!data.needKey); throw new Error(data.error || "머리 비율을 검사하지 못했습니다."); }
      if (!data.found) { setHeadMsg({ tone: "warn", text: "얼굴 위치를 찾지 못했습니다. 정면이 뚜렷한 사진으로 다시 시도해 주세요." }); return; }
      // 저장 규격으로 잘렸을 때의 머리 비율로 계산한다
      const img = new Image();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("이미지를 읽지 못했습니다.")); img.src = shown; });
      setHeadMeasure({ url: result ?? shown, crownY: data.crownY, chinY: data.chinY, centerX: typeof data.centerX === "number" ? data.centerX : 0.5, srcW: img.naturalWidth, srcH: img.naturalHeight });
      const m = headInCrop(data.crownY, data.chinY, img.naturalWidth, img.naturalHeight, preset);
      const ev = evaluateHead(m.ratio, preset.headRange);
      const pct = (n: number) => Math.round(n * 100);
      const range = `${pct(preset.headRange[0])}~${pct(preset.headRange[1])}%`;
      const verdict = ev.status === "ok" ? "기준 범위 안입니다." : ev.status === "small" ? "기준보다 머리가 작게 나옵니다. 가까이 찍은 사진·4:5에 가까운 비율로 다시 만들어 보세요." : "기준보다 머리가 크게 나옵니다. 상체가 더 보이는 사진·여백이 있는 구도로 다시 만들어 보세요.";
      setHeadMsg({
        tone: ev.status === "ok" ? "ok" : "warn",
        text: `머리 높이 약 ${pct(m.ratio)}% (기준 ${range}, ${preset.headSource}) · 정수리 위 여백 약 ${Math.max(0, pct(m.topMargin))}%. ${verdict}${m.cropped ? " 저장 규격으로 자를 때 머리가 잘릴 수 있습니다." : ""} AI 추정치라 오차가 있습니다.`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "머리 비율을 검사하지 못했습니다.");
    } finally { setHeadBusy(false); }
  }

  async function saveAll() {
    if (results.length === 0) return;
    setSaving("all");
    try {
      const entries: { name: string; data: Uint8Array }[] = [];
      const keep = results.map((_, i) => i).filter((i) => !skip[i]);
      if (keep.length === 0) { setError("저장할 사진이 없습니다. 제외 표시를 확인해 주세요."); setSaving(""); return; }
      for (const i of keep) {
        let src = results[i];
        if (whiten) { try { src = (await whitenDataUrl(src)).dataUrl; } catch { /* 원본 사용 */ } }
        const blob = await renderPng(src, { mirrored, filter, applyFilter: toneActive, resolution });
        entries.push({ name: `${batchMode ? nameFor(sources[i] ?? i, `인물사진-${i + 1}`) : `인물사진-${String(i + 1).padStart(2, "0")}`}-${aspect.replace(":", "x")}-${resolution}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      const zip = createZip(entries);
      downloadBlob(new Blob([zip as BlobPart], { type: "application/zip" }), `인물사진-${entries.length}장-${new Date().toISOString().slice(0, 10)}.zip`);
      setNotice(`${entries.length}장을 ZIP 파일 하나로 저장했습니다(${Math.round(zip.length / 1024)}KB).`);
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); } finally { setSaving(""); }
  }

  async function savePng() {
    if (!shown) return;
    setSaving("png");
    try {
      const blob = await renderPng(shown, { mirrored, filter, applyFilter: toneActive, resolution });
      downloadBlob(blob, `${batchMode ? nameFor(sourceIdx, "인물사진") : "인물사진"}-${aspect.replace(":", "x")}-${resolution}${whiten ? "-순백" : ""}.png`);
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); } finally { setSaving(""); }
  }

  async function saveSized() {
    if (!shown) return;
    const preset = sizePresetById(sizeId);
    setSaving("lic");
    try {
      const r = await renderSized(shown, preset, { mirrored, filter, applyFilter: toneActive });
      downloadBlob(r.blob, `${batchMode ? nameFor(sourceIdx, "증명사진") : "증명사진"}-${preset.id}-${preset.width}x${preset.height}-${new Date().toISOString().slice(0, 10)}.jpg`);
      const extra = [r.underMin ? `용량(${Math.round(r.bytes / 1024)}KB)이 최소 ${Math.round((preset.minBytes ?? 0) / 1024)}KB보다 작습니다. 제출처 기준을 확인해 주세요.` : "", preset.caution ?? ""].filter(Boolean).join(" ");
      setNotice(
        r.overLimit
          ? `${preset.width}×${preset.height}px로 저장했지만 용량(${Math.round(r.bytes / 1024)}KB)이 제한(${Math.round(preset.maxBytes / 1024)}KB)을 넘습니다. 제출처에서 다시 압축해 주세요.`
          : `${preset.width}×${preset.height}px로 저장했습니다(${Math.round(r.bytes / 1024)}KB). 제출 기관의 사진 규정은 별도로 확인해 주세요.`,
      );
      if (extra) setNotice((n) => `${n} ${extra}`);
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); } finally { setSaving(""); }
  }

  const toggleSkin = (id: string) => setSkinIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 6 ? cur : [...cur, id]));
  const outfits = OUTFIT.filter((o) => outfitCat === "all" || o.category === outfitCat || o.category === "keep");
  const purpose = getPurpose(purposeId);
  const solidBg = backgroundId === "solid";

  return (
    <div className="studio">
      <div className="notice st-own">
        <label className="check">
          <input type="checkbox" checked={confirmOwn} onChange={(e) => setConfirmOwn(e.target.checked)} />
          <span>본인 사진이거나 사진 속 인물의 사용 동의를 받았습니다. 타인·유명인의 사진을 무단으로 쓰지 않겠습니다.</span>
        </label>
        <small>기본적으로 사진과 결과는 서버에 저장되지 않으며 이 브라우저에만 보관됩니다. AI 생성은 본인 Gemini 키 사용량으로 계산됩니다.</small>
        <label className="check st-server">
          <input type="checkbox" checked={serverSave} onChange={(e) => toggleServerSave(e.target.checked)} />
          <span><b>생성 결과를 내 서버 보관함에도 저장 (선택, 최대 30장)</b><small>켜면 결과 사진(원본 제외)이 비공개 저장소에 보관되어 다른 기기에서도 볼 수 있어요. 언제든 [내 기록]에서 삭제할 수 있습니다.</small></span>
        </label>
        {serverSave && (
          <label className="slider st-retention"><span>보관 기간</span>
            <select value={retention} onChange={(e) => changeRetention(Number(e.target.value))} aria-label="서버 보관 기간">
              <option value={7}>7일 후 자동 삭제</option><option value={30}>30일 후 자동 삭제</option><option value={90}>90일 후 자동 삭제</option><option value={0}>직접 삭제할 때까지</option>
            </select><b />
          </label>
        )}
      </div>

      <div className="purposes" role="tablist" aria-label="촬영 목적">
        {PURPOSES.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={purposeId === p.id} className={purposeId === p.id ? "purpose on" : "purpose"} onClick={() => applyPurpose(p)}>
            <span className="purpose-icon">{p.icon}</span>
            <strong>{p.label}</strong>
            <small>{p.badge}</small>
          </button>
        ))}
      </div>
      {purpose && <p className="muted st-purpose-desc">{purpose.desc}</p>}

      <div className="st-grid">
        <div className="st-col">
          <Section n={1} title="인물 사진" sub={`얼굴이 정면에 가깝고 밝은 사진을 권장합니다. PNG·JPG·WEBP · 여러 장(최대 ${MAX_BATCH}장)을 한꺼번에 올리면 일괄 처리됩니다.`}>
            <label className={previewUrl ? "dropzone has" : "dropzone"} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onPick(e.dataTransfer.files); }}>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="업로드한 참조 사진" style={selfie ? { transform: "scaleX(-1)" } : undefined} />
              ) : (
                <span className="drop-empty"><Upload size={22} /><b>클릭하거나 사진을 끌어다 놓으세요</b><small>얼굴 위주 사진 권장</small></span>
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => onPick(e.target.files)} />
            </label>
            <label className="check st-selfie">
              <input type="checkbox" checked={selfie} onChange={(e) => setSelfie(e.target.checked)} />
              <span><b>전면 카메라 셀카입니다</b><small>켜면 좌우를 뒤집어 남들이 보는 실제 방향으로 만들어요(가르마·점 위치 유지).</small></span>
            </label>
          </Section>

          <Section title="자세·디테일 보정" sub="얼굴 생김새는 바꾸지 않고 자연스럽게만 다듬습니다.">
            <div className="stack-sm">
              {RETOUCH.map((r) => (
                <label key={r.key} className="check">
                  <input type="checkbox" checked={retouch[r.key]} onChange={(e) => setRetouch({ ...retouch, [r.key]: e.target.checked })} />
                  <span><b>{r.label}</b><small>{r.desc}</small></span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="모델·해상도" sub="프로·고해상도일수록 본인 키 요금이 늘어납니다.">
            <div className="chips">
              <Chip on={model === "flash"} onClick={() => setModel("flash")}>빠른 생성 (Flash)</Chip>
              <Chip on={model === "pro"} onClick={() => setModel("pro")}>고품질 (Pro)</Chip>
            </div>
            <div className="chips" style={{ marginTop: 8 }}>
              {RESOLUTIONS.map((r) => <Chip key={r} on={resolution === r} onClick={() => setResolution(r)} title={model === "flash" ? "해상도는 Pro에서 적용됩니다" : undefined}>{r}</Chip>)}
            </div>
            {model === "flash" && <small className="muted">해상도 선택은 Pro 모델에서만 적용됩니다.</small>}
          </Section>

          <Section title="한 번에 만들 장수" sub={files.length > 1 ? "여러 장을 올린 일괄 모드에서는 사진마다 1장씩 만듭니다." : "여러 장을 만들어 마음에 드는 사진을 고릅니다. 장수만큼 본인 키 사용량이 늘어요."}>
            <div className="chips">
              {Array.from({ length: MAX_CANDIDATES }, (_, i) => i + 1).map((n) => <Chip key={n} on={count === n} onClick={() => setCount(n)}>{n}장</Chip>)}
            </div>
          </Section>

          <Section title="이미지 비율">
            <div className="chips">
              {ASPECTS.map((a) => <Chip key={a.value} on={aspect === a.value} onClick={() => setAspect(a.value)} title={a.desc}>{a.value}</Chip>)}
            </div>
            <small className="muted">{byId(ASPECTS.map((a) => ({ ...a, id: a.value })), aspect)?.desc}</small>
          </Section>
        </div>

        <div className="st-col st-center">
          <section className="card st-result">
            <div className="st-result-head">
              <h2><Sparkles size={16} /> 생성 결과</h2>
              <span className="muted">{model === "pro" ? "Pro" : "Flash"} · {resolution} · {aspect}{count > 1 ? ` · ${count}장` : ""}</span>
            </div>
            {cropOpen && shown && (() => {
              const pr = sizePresetById(sizeId);
              const aspect = pr.width / pr.height;
              const base = coverCrop(cropOpen.w, cropOpen.h, pr.width, pr.height, 0.15);
              const bm = measures[sourceIdx];
              const m = headMeasure && headMeasure.url === (result ?? shown) ? headMeasure : (bm ? { url: result ?? shown, crownY: bm.crownY, chinY: bm.chinY, centerX: bm.centerX, srcW: bm.srcW, srcH: bm.srcH } : null);
              const rec = m && pr.headRange
                ? tightCrop(m.crownY, m.chinY, m.srcW, m.srcH, pr, (pr.headRange[0] + pr.headRange[1]) / 2, m.centerX).crop
                : base;
              void aspect;
              return (
                <CropAdjuster
                  key={`${shown.length}-${sizeId}-${m ? Math.round(m.crownY * 1000) + "-" + Math.round(m.chinY * 1000) : "x"}`}
                  url={shown} srcW={cropOpen.w} srcH={cropOpen.h} preset={pr} initial={rec} recommended={rec}
                  measure={m ? { crownY: m.crownY, chinY: m.chinY } : null} mirrored={mirrored}
                  busy={!!saving} onClose={() => setCropOpen(null)} onSave={(c) => { void saveCropped(c); }}
                  remembered={(() => { try { return parseStoredControls(localStorage.getItem(`portrait-photo:crop:${pr.id}`)); } catch { return null; } })()}
                  onAssign={batchMode ? (c) => { setBatchCrops((cur) => ({ ...cur, [sourceIdx]: { presetId: pr.id, crop: c, srcW: cropOpen.w, srcH: cropOpen.h } })); setNotice(`${sourceIdx + 1}번 사진의 영역을 지정했습니다. [규격으로 일괄 저장]에서 사용됩니다.`); } : undefined}
                  assigned={batchMode && batchCrops[sourceIdx]?.presetId === pr.id}
                  onMark={handleMark} startInMark={markStart}
                />
              );
            })()}
            {zoomOn && results.length > 1 && (
              <ZoomCompare urls={results} initialA={active} aspect={aspect} onClose={() => setZoomOn(false)} onPick={(i) => { setActive(i); setCleaned(null); setZoomOn(false); setGrid(false); }} />
            )}
            {grid && results.length > 1 && !zoomOn && (
              <div className="cand-grid" role="listbox" aria-label="후보 한눈에 비교">
                {results.map((u, i) => (
                  <button key={i} type="button" role="option" aria-selected={i === active} className={i === active ? "cand-cell on" : "cand-cell"}
                    onClick={() => { setActive(i); setCleaned(null); setGrid(false); }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={`후보 ${i + 1}`} style={{ aspectRatio: aspect.replace(":", " / ") }} />
                    <span>{i + 1}번 선택{i === active ? " (현재)" : ""}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="st-stage" style={{ aspectRatio: aspect.replace(":", " / "), display: ((grid || zoomOn) && results.length > 1) || cropOpen ? "none" : undefined }}>
              {busy && <div className="st-loading"><Loader2 size={30} className="ls-spin" /><p>이미지를 만드는 중입니다…</p><small>{progress || "보통 10~40초가 걸립니다."}</small>
                <button type="button" onClick={() => abortRef.current?.abort()}>취소</button></div>}
              {shown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shown} alt="생성된 인물 사진" style={{ filter: toneActive ? filter : undefined, transform: mirrored ? "scaleX(-1)" : undefined }} />
              ) : (
                !busy && <div className="st-placeholder"><ImageIcon size={34} /><p>옵션을 고르고 [인물 사진 만들기]를 눌러 주세요.</p></div>
              )}
              {shown && compare && comparePreview && (
                <div className="cmp" style={{ clipPath: `inset(0 ${100 - cmpPos}% 0 0)` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={comparePreview ?? undefined} alt="원본 사진" style={{ transform: selfie ? "scaleX(-1)" : undefined }} />
                  <span className="cmp-tag">원본</span>
                </div>
              )}
              {shown && compare && comparePreview && <div className="cmp-handle" style={{ left: `${cmpPos}%` }} aria-hidden="true" />}
              {shown && guide && !compare && <GuideOverlay />}
            </div>
            {shown && compare && comparePreview && (
              <label className="slider cmp-slider"><span>원본</span><input type="range" min={0} max={100} value={cmpPos} onChange={(e) => setCmpPos(Number(e.target.value))} aria-label="원본과 결과 비교 슬라이더" /><b>결과</b></label>
            )}
            {batchMode && results.length > 0 && (
              <div className="names" aria-label="저장 이름">
                <b>저장 이름</b>
                {results.map((_, i) => {
                  const fi = sources[i] ?? i;
                  return (
                    <div key={i} className={skip[i] ? "name-row skipped" : "name-row"}>
                      <span>{i + 1}</span>
                      <input
                        type="text" maxLength={40} value={names[fi] ?? baseNameOf(files[fi]?.name ?? "")}
                        placeholder={`인물사진-${i + 1}`}
                        onChange={(e) => setNames((cur) => ({ ...cur, [fi]: e.target.value }))}
                        aria-label={`${i + 1}번 저장 이름`}
                      />
                      <span className="row-tools">
                        <button type="button" onClick={() => moveResult(i, -1)} disabled={i === 0} aria-label={`${i + 1}번 위로`}>↑</button>
                        <button type="button" onClick={() => moveResult(i, 1)} disabled={i === results.length - 1} aria-label={`${i + 1}번 아래로`}>↓</button>
                        <label className="check"><input type="checkbox" checked={!!skip[i]} onChange={(e) => setSkip((a) => a.map((v, k) => (k === i ? e.target.checked : v)))} /><span>제외</span></label>
                      </span>
                    </div>
                  );
                })}
                <small className="muted">ZIP과 개별 저장 파일 이름에 사용됩니다(금지 문자는 자동 제거). ↑↓로 순서를 바꾸고, 제외한 사진은 [ZIP으로 전체 저장]에서 빠집니다.</small>
              </div>
            )}
            {results.length > 1 && (
              <div className="cands" role="listbox" aria-label="후보 사진">
                {results.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <button key={i} type="button" role="option" aria-selected={i === active} className={`${i === active ? "cand on" : "cand"}${skip[i] ? " skipped" : ""}`} onClick={() => { setActive(i); setCleaned(null); }}>
                    <img src={u} alt={`후보 ${i + 1}`} /><span>{i + 1}</span>
                  </button>
                ))}
              </div>
            )}
            {shown && (
              <div className="st-tools">
                <label className="check"><input type="checkbox" checked={whiten} onChange={(e) => setWhiten(e.target.checked)} /><span>배경 순백 정리 {cleaning ? "(처리 중…)" : whiten && cleaned ? `(배경 ${Math.round(cleaned.ratio * 100)}% 정리)` : ""}</span></label>
                <label className="check"><input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} /><span>증명사진 가이드선</span></label>
                <label className="check"><input type="checkbox" checked={mirrored} onChange={(e) => setMirrored(e.target.checked)} /><span>거울상으로 보기</span></label>
                {results.length > 1 && <label className="check"><input type="checkbox" checked={zoomOn} onChange={(e) => { setZoomOn(e.target.checked); if (e.target.checked) setGrid(false); }} /><span>확대 비교(두 장)</span></label>}
                {results.length > 1 && <label className="check"><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /><span>후보 한눈에 비교</span></label>}
                {previewUrl && <label className="check"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /><span>원본과 비교</span></label>}
              </div>
            )}
            {shown && whiten && cleaned && (cleaned.ratio < 0.03 || cleaned.ratio > 0.9) && (
              <p className="notice">배경 영역을 정확히 찾지 못했을 수 있습니다({Math.round(cleaned.ratio * 100)}%). 결과를 눈으로 확인해 주세요.</p>
            )}
            {error && (
              <p role="alert" className="lp-alert"><span>{error}{needKey && <> <a className="subtle-link" href="/settings">API키등록·플랫폼연동으로 이동</a></>}</span></p>
            )}
            {notice && !error && <p className="notice">{notice}</p>}
            {headMeasure && headMeasure.url === (result ?? shown) && (() => {
              const pr = sizePresetById(sizeId);
              if (!pr.headRange) return null;
              const cur = headInCrop(headMeasure.crownY, headMeasure.chinY, headMeasure.srcW, headMeasure.srcH, pr).ratio;
              if (evaluateHead(cur, pr.headRange).status !== "small") return null;
              const t = tightCrop(headMeasure.crownY, headMeasure.chinY, headMeasure.srcW, headMeasure.srcH, pr, (pr.headRange[0] + pr.headRange[1]) / 2, headMeasure.centerX);
              return (
                <button type="button" className="primary st-tight" onClick={saveTight} disabled={!!saving}>
                  <Download size={14} />얼굴 확대 자르기로 규격 저장 (머리 약 {Math.round(cur * 100)}% → {Math.round(t.achievedRatio * 100)}%)
                </button>
              );
            })()}
            {autoConfirm && !autoBusy && <p className="notice warning" role="status">사진 {results.length - skip.filter(Boolean).length}장을 각각 검사하므로 <b>본인 Gemini 키로 {results.length - skip.filter(Boolean).length}회</b> 호출됩니다. 계속하려면 [확인하고 시작]을 누르세요.</p>}
            {retryConfirm && !autoBusy && <p className="notice warning" role="status">얼굴을 찾지 못한 사진만 다시 검사하며 <b>본인 Gemini 키로 {batchReport.filter((r) => r.text.includes("얼굴 위치를 찾지 못해") && !skip[r.idx]).length}회</b> 호출됩니다. 계속하려면 [확인하고 다시 검사]를 누르세요.</p>}
            {batchReport.length > 0 && (
              <ul className="batch-report" aria-label="일괄 머리 비율 검사 결과">
                {repZoom !== null && results[repZoom] && (
                  <div className="rep-zoom" role="dialog" aria-label="사진 크게 보기" onClick={() => setRepZoom(null)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={results[repZoom]} alt="크게 보기" />
                    <small>클릭하면 닫힙니다</small>
                  </div>
                )}
                {batchReport.map((r) => (
                  <li key={r.idx} className={r.tone === "ok" ? "ok" : "warn"}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <button type="button" className="rep-thumb-btn" onClick={() => setRepZoom(r.idx)} aria-label={r.name + " 크게 보기"}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="rep-thumb" src={results[r.idx]} alt="" />
                    </button>
                    <span className="rep-body"><b>{r.name}</b> {r.text}{" "}
                    <button type="button" className="mini" onClick={() => gotoCrop(r.idx, false)}>영역 조정</button>
                    {r.text.includes("얼굴 위치를 찾지 못해") && <button type="button" className="mini" onClick={() => gotoCrop(r.idx, true)}>얼굴 위치 직접 지정</button>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {headMsg && <p className={headMsg.tone === "ok" ? "notice head-ok" : headMsg.tone === "warn" ? "notice warning" : "notice"} role="status">{headMsg.text}</p>}
            <button type="button" className="primary st-generate" onClick={generate} disabled={busy || !file}>
              {busy ? <><Loader2 size={16} className="ls-spin" />만드는 중</> : <><Sparkles size={16} />인물 사진 만들기</>}
            </button>
            {shown && (
              <div className="actions st-save">
                {batchMode && results.length > 1 && sizePresetById(sizeId).headRange && (
                  <button type="button" onClick={() => (autoConfirm ? void autoCropBatch() : setAutoConfirm(true))} disabled={!!saving || autoBusy}
                    title="사진마다 머리 비율을 AI로 검사하고 작게 나온 사진은 자동으로 확대 자르기를 지정합니다">
                    {autoBusy ? <Loader2 size={14} className="ls-spin" /> : <Sparkles size={14} />}
                    {autoBusy ? `검사 중… ${autoProgress}` : autoConfirm ? `확인하고 시작 (AI ${results.length - skip.filter(Boolean).length}회 호출)` : "일괄 머리 비율 검사 + 자동 확대 자르기"}
                  </button>
                )}
                {batchMode && results.length > 1 && sizePresetById(sizeId).headRange && (
                  <label className="check" title="머리 비율이 범위 안이거나 큰 사진도 얼굴을 가로 중앙에 맞춰 자릅니다">
                    <input type="checkbox" checked={centerOk} onChange={(e) => setCenterOk(e.target.checked)} />
                    <span>범위 안 사진도 얼굴을 가로 중앙에 맞춤(다음 일괄 검사부터)</span>
                  </label>
                )}
                {(() => {
                  const missed = batchReport.filter((r) => r.text.includes("얼굴 위치를 찾지 못해") && !skip[r.idx]).map((r) => r.idx);
                  if (!batchMode || missed.length === 0 || autoBusy) return null;
                  return (
                    <button type="button" disabled={!!saving} onClick={() => (retryConfirm ? void autoCropBatch(missed) : setRetryConfirm(true))}>
                      <Sparkles size={14} />{retryConfirm ? `확인하고 다시 검사 (AI ${missed.length}회 호출)` : `얼굴 없음 ${missed.length}장만 다시 검사`}
                    </button>
                  );
                })()}
                {batchMode && results.length > 1 && <button type="button" onClick={saveSizedBatch} disabled={!!saving}>{saving === "batch" ? <Loader2 size={14} className="ls-spin" /> : <Download size={14} />}규격으로 일괄 저장 ({sizePresetById(sizeId).width}×{sizePresetById(sizeId).height}, ZIP)</button>}
                {results.length > 1 && <button type="button" onClick={saveAll} disabled={!!saving}>{saving === "all" ? <Loader2 size={14} className="ls-spin" /> : <Download size={14} />}ZIP으로 전체 저장 ({results.length - skip.filter(Boolean).length}장)</button>}
                <button type="button" onClick={savePng} disabled={!!saving}>{saving === "png" ? <Loader2 size={14} className="ls-spin" /> : <Download size={14} />}PNG 저장 ({resolution})</button>
                <button type="button" onClick={checkHead} disabled={headBusy || !!saving} title="선택한 규격의 공식 머리 높이 기준과 견줍니다(본인 키 1회 호출)">{headBusy ? <Loader2 size={14} className="ls-spin" /> : <Sparkles size={14} />}머리 비율 검사 (AI 1회)</button>
                <button type="button" onClick={openCrop} disabled={!!saving} title="저장될 영역을 미리 보고 위치·확대를 직접 조정합니다">자르기 영역 조정</button>
                <select value={sizeId} onChange={(e) => changePreset(e.target.value)} aria-label="증명사진 규격" className="size-select">
                  {SIZE_PRESETS.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
                <button type="button" onClick={saveSized} disabled={!!saving}>{saving === "lic" ? <Loader2 size={14} className="ls-spin" /> : <Download size={14} />}규격 저장 ({sizePresetById(sizeId).note})</button>
              </div>
            )}
          </section>

          {shown && (
            <Section title="세부 조정" sub="화면과 저장 파일에 함께 적용됩니다.">
              {([["밝기", brightness, setBrightness], ["노출", exposure, setExposure], ["대비", contrast, setContrast]] as const).map(([label, v, set]) => (
                <label key={label} className="slider"><span>{label}</span><input type="range" min={-50} max={50} value={v} onChange={(e) => set(Number(e.target.value))} /><b>{v}</b></label>
              ))}
              <button type="button" onClick={() => { setBrightness(0); setExposure(0); setContrast(0); }}>초기화</button>
            </Section>
          )}
        </div>

        <div className="st-col">
          <Section n={2} title="조명">
            <div className="chips">{LIGHTING.map((o) => <Chip key={o.id} on={lightingId === o.id} onClick={() => setLightingId(o.id)}>{o.label}</Chip>)}</div>
          </Section>
          <Section n={3} title="카메라·렌즈">
            <div className="chips">{CAMERA.map((o) => <Chip key={o.id} on={cameraId === o.id} onClick={() => setCameraId(o.id)}>{o.label}</Chip>)}</div>
          </Section>
          <Section n={4} title="배경">
            <div className="chips">{BACKGROUND.map((o) => <Chip key={o.id} on={backgroundId === o.id} onClick={() => setBackgroundId(o.id)}>{o.label}</Chip>)}</div>
            {solidBg && (
              <div className="colors" aria-label="배경 색">
                {COLOR.map((c) => (
                  <button key={c.id} type="button" className={colorId === c.id ? "swatch on" : "swatch"} style={{ background: c.hex }} title={c.label} aria-label={c.label} aria-pressed={colorId === c.id} onClick={() => setColorId(c.id)} />
                ))}
              </div>
            )}
          </Section>
          <Section n={5} title="포즈·표정">
            <div className="chips">{POSE.map((o) => <Chip key={o.id} on={poseId === o.id} onClick={() => setPoseId(o.id)}>{o.label}</Chip>)}</div>
          </Section>
          <Section n={6} title="복장">
            <div className="chips cats">{OUTFIT_CATS.map((c) => <Chip key={c.id} on={outfitCat === c.id} onClick={() => setOutfitCat(c.id)}>{c.label}</Chip>)}</div>
            <div className="outfits">
              {outfits.map((o) => (
                <button key={o.id} type="button" className={outfitId === o.id ? "outfit on" : "outfit"} aria-pressed={outfitId === o.id} onClick={() => setOutfitId(o.id)}>
                  <b>{o.label}</b><small>{o.desc}</small>
                </button>
              ))}
            </div>
          </Section>
          <Section n={7} title="피부 질감" sub="최대 6개까지 고를 수 있어요.">
            <div className="chips">{SKIN.map((o) => <Chip key={o.id} on={skinIds.includes(o.id)} onClick={() => toggleSkin(o.id)}>{o.label}</Chip>)}</div>
          </Section>
          <Section n={8} title="필름 룩">
            <div className="chips">{FILM.map((o) => <Chip key={o.id} on={filmId === o.id} onClick={() => setFilmId(o.id)}>{o.label}</Chip>)}</div>
            <label className="check" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={symmetry} onChange={(e) => setSymmetry(e.target.checked)} />
              <span><b>정면·좌우 대칭 구도</b><small>눈높이 수평, 양쪽 귀 노출, 어깨 수평의 증명사진식 구도</small></span>
            </label>
          </Section>
        </div>
      </div>
    </div>
  );
}
