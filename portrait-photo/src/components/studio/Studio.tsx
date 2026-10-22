"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Image as ImageIcon, Loader2, Sparkles, Upload } from "lucide-react";
import {
  ASPECTS, BACKGROUND, CAMERA, COLOR, FILM, LIGHTING, OUTFIT, POSE, RESOLUTIONS, RETOUCH, SKIN, byId,
} from "@/lib/portrait/options";
import type { AspectRatio, ModelLevel, PurposeId, Resolution, Retouch } from "@/lib/portrait/options";
import { PURPOSES, getPurpose } from "@/lib/portrait/purposes";
import type { Purpose } from "@/lib/portrait/purposes";
import { MAX_CANDIDATES, PROFILE_FORMATS, SIZE_PRESETS, baseNameOf, overlayY, profileCrop, controlsFromCrop, coverCrop, decideBatchCrop, describeBatchDecision, evaluateHead, headInCrop, localDateStamp, moveItem, parseStoredControls, recommendSizedCrop, safeFileName, scaleCrop, sizePresetById, tightCrop, toneFilter } from "@/lib/portrait/post";
import type { SizedRecommendation } from "@/lib/portrait/post";

const MAX_BATCH = 6;

/** v1.24 프로필 세트 미리보기 한 장(미리보기와 저장에 같은 그림을 쓴다) */
interface ProfileItem { label: string; circle: boolean; name: string; blob: Blob; url: string }
import { checkPhotoLocal, detectHeadLocal } from "@/lib/portrait/faceLocal";
import type { FaceIssue } from "@/lib/portrait/post";
import { IMAGE_READ_FAIL_MESSAGE, splitReadableImages } from "@/lib/imageFileCheck";
import { downloadBlob, makeThumb, prepareInput, renderProfile, renderSized, renderPng, toUploadJpeg, whitenDataUrl } from "@/lib/portrait/canvas";
import { addHistory } from "@/lib/portrait/history";
import { createZip } from "@/lib/portrait/zip";
import { BUNDLES, bundleFileName, bundleItemLabel, bundlePreview, cleanBundle, type BundleKey } from "@/lib/portrait/bundles";
import { GuideOverlay } from "./GuideOverlay";
import { ZoomCompare } from "./ZoomCompare";
import { CropAdjuster } from "./CropAdjuster";

const OUTFIT_CATS = [
  { id: "all", label: "전체" }, { id: "formal", label: "포멀" }, { id: "casual", label: "캐주얼" },
  { id: "editorial", label: "화보" }, { id: "cozy", label: "편안한" },
] as const;

// v1.30: 결과 무대 배경 밝기(사진 가장자리·머리카락 경계를 밝은/어두운 바탕에서 확인)
const STAGE_BGS = [
  { id: "grid", label: "기본(격자)", swatch: "repeating-conic-gradient(#3a3f4b 0 25%, #2a2e38 0 50%) 0 0/8px 8px" },
  { id: "white", label: "흰색", swatch: "#ffffff" },
  { id: "gray", label: "회색", swatch: "#9ca3af" },
  { id: "black", label: "검정", swatch: "#000000" },
] as const;
type StageBg = (typeof STAGE_BGS)[number]["id"];
const STAGE_BG_KEY = "portrait-photo:stage-bg";

/** v1.30: 단계 칩 → 해당 영역으로 부드럽게 이동(첫 번째 id가 없으면 다음 id) */
function goToArea(...ids: string[]) {
  const el = ids.map((id) => document.getElementById(id)).find(Boolean);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Section({ n, title, sub, children }: { n?: number; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card st-sec" id={n !== undefined ? `st-sec-${n}` : undefined}>
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
  // F4(v1.35): 목적별 묶음 저장 — 고른 규격·프로필 항목
  const [bundleKeys, setBundleKeys] = useState<BundleKey[]>(BUNDLES[0].items);
  const [compare, setCompare] = useState(false);
  const [grid, setGrid] = useState(false);
  const [zoomOn, setZoomOn] = useState(false);
  const [skip, setSkip] = useState<boolean[]>([]);
  const [headBusy, setHeadBusy] = useState(false);
  const [repZoom, setRepZoom] = useState<number | null>(null);
  const [cropOpen, setCropOpen] = useState<{ w: number; h: number } | null>(null);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [pendingCrop, setPendingCrop] = useState(false);
  // auto: v1.26 브라우저 안 얼굴 인식으로 자동 추정한 값(AI 검사·직접 지정이 들어오면 덮어씀)
  const [measures, setMeasures] = useState<Record<number, { crownY: number; chinY: number; centerX: number; srcW: number; srcH: number; manual: boolean; auto?: boolean }>>({});
  const [faceDetecting, setFaceDetecting] = useState(false);
  // v1.27: 올린 사진별 품질 점검 결과(undefined=점검 중, null=점검 불가, []=문제 없음)
  const [photoChecks, setPhotoChecks] = useState<Record<number, FaceIssue[] | null>>({});
  const [showHeadLines, setShowHeadLines] = useState(true);
  const [markStart, setMarkStart] = useState(false);
  const [retryConfirm, setRetryConfirm] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoProgress, setAutoProgress] = useState("");
  const [batchReport, setBatchReport] = useState<{ idx: number; name: string; text: string; tone: "ok" | "warn" | "info" }[]>([]);
  const [batchCrops, setBatchCrops] = useState<Record<number, { presetId: string; crop: { sx: number; sy: number; sw: number; sh: number }; srcW: number; srcH: number }>>({});
  const [headMeasure, setHeadMeasure] = useState<{ url: string; crownY: number; chinY: number; centerX: number; srcW: number; srcH: number } | null>(null);
  const [profileCircleBg, setProfileCircleBg] = useState<"transparent" | "white">("transparent");
  const [profilePreview, setProfilePreview] = useState<{ items: ProfileItem[]; measured: boolean; base: string } | null>(null);
  const [headMsg, setHeadMsg] = useState<{ tone: "ok" | "warn" | "info"; text: string } | null>(null);
  const [names, setNames] = useState<Record<number, string>>({});
  const [cmpPos, setCmpPos] = useState(50);
  // v1.30: 결과 무대 배경(이 브라우저에만 기억 — 저장소를 못 쓰면 기본값)
  const [stageBg, setStageBg] = useState<StageBg>("grid");
  useEffect(() => {
    try {
      const v = localStorage.getItem(STAGE_BG_KEY);
      if (v && STAGE_BGS.some((b) => b.id === v)) setStageBg(v as StageBg);
    } catch { /* 저장소를 못 쓰면 기본값 */ }
  }, []);
  const changeStageBg = (v: StageBg) => {
    setStageBg(v);
    try { localStorage.setItem(STAGE_BG_KEY, v); } catch { /* 무시 */ }
  };
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
      if ([7, 30].includes(r) && localStorage.getItem("portrait-photo:retention") !== null) setRetention(r); // v1.31: 옛 0·90 값은 기본 30일
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

  // v1.26: 결과가 나오면 회원 PC 브라우저 안에서 얼굴을 찾아 머리 위치를 자동 추정(사진 서버 전송·AI 호출 없음).
  // 아직 측정값이 없는 결과만, 한 장씩 순서대로. 이미 AI 검사·직접 지정 값이 있으면 건드리지 않는다.
  useEffect(() => {
    let alive = true;
    const todo = results.map((url, i) => ({ url, fi: sources[i] ?? i })).filter((x) => x.url && !measures[x.fi]);
    if (todo.length === 0) return;
    setFaceDetecting(true);
    (async () => {
      for (const { url, fi } of todo) {
        const m = await detectHeadLocal(url).catch(() => null);
        if (!alive) return;
        if (m) setMeasures((cur) => (cur[fi] ? cur : { ...cur, [fi]: { ...m, manual: false, auto: true } }));
      }
      if (alive) setFaceDetecting(false);
    })();
    return () => { alive = false; setFaceDetecting(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, sources]);

  // v1.27: 사진을 올리면 생성 전에 브라우저 안에서 품질 점검(얼굴 없음·여러 사람·작은 얼굴·옆모습·기울어짐). 안내만, 막지 않음.
  useEffect(() => {
    let alive = true;
    setPhotoChecks({});
    (async () => {
      for (let i = 0; i < previews.length; i++) {
        const r = await checkPhotoLocal(previews[i]).catch(() => null);
        if (!alive) return;
        setPhotoChecks((cur) => ({ ...cur, [i]: r }));
      }
    })();
    return () => { alive = false; };
  }, [previews]);

  const shown = whiten && cleaned ? cleaned.url : result;
  useEffect(() => { setCropOpen(null); }, [shown]);
  useEffect(() => {
    if (!pendingCrop || !result) return;
    if (whiten && (cleaning || !cleaned)) return;
    setPendingCrop(false);
    void openCrop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCrop, result, shown, whiten, cleaning, cleaned]);
  // 보고 있는 사진이 바뀌면 지난 프로필 미리보기는 닫는다(다른 사진의 그림이 저장되지 않게)
  useEffect(() => { closeProfilePreview(); }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const filter = useMemo(() => toneFilter(brightness, exposure, contrast), [brightness, exposure, contrast]);
  const toneActive = brightness !== 0 || exposure !== 0 || contrast !== 0;

  async function onPick(list: FileList | File[] | null) {
    const typed = Array.from(list ?? []).filter((f) => /^image\/(png|jpeg|webp)$/.test(f.type));
    if (typed.length === 0) { if (list && Array.from(list).length) setError("PNG, JPG, WEBP 사진만 올릴 수 있습니다."); return; }
    // 깨진 사진은 받지 않는다(공용 image-file-check — 브라우저 안에서 풀어 보기, 서버 전송 없음)
    const { readable: picked, failed } = await splitReadableImages(typed);
    if (picked.length === 0) { setError(IMAGE_READ_FAIL_MESSAGE); return; }
    const chosen = picked.slice(0, MAX_BATCH);
    previews.forEach((u) => URL.revokeObjectURL(u));
    const urls = chosen.map((f) => URL.createObjectURL(f));
    setNames({}); setBatchCrops({}); setMeasures({}); setBatchReport([]); setAutoConfirm(false); setZoomOn(false); setFiles(chosen); setPreviews(urls);
    setFile(chosen[0]); setPreviewUrl(urls[0]);
    setResults([]); setSources([]); setActive(0); setCompare(false); setCleaned(null); setError(""); setNeedKey(false);
    const skipped = failed.length ? ` 읽지 못한 사진 ${failed.length}장(${failed.map((f) => f.name).join(", ")})은 뺐습니다.` : "";
    setNotice((picked.length > MAX_BATCH ? `사진은 한 번에 ${MAX_BATCH}장까지 처리합니다. 앞의 ${MAX_BATCH}장만 사용합니다.` : chosen.length > 1 ? `${chosen.length}장을 한 번에 처리합니다(사진마다 결과 1장).` : "") + skipped);
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
      const options = { lightingId, cameraId, poseId, outfitId, filmId, colorId, backgroundId, skinIds, retouch, truePerspective: selfie, symmetry, idFraming: purposeId === "id-photo" };
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
      const d = decideBatchCrop({ found: true, crownY: m.crownY, chinY: m.chinY, centerX: m.centerX }, p, m.srcW, m.srcH);
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
    // 같은 사진이면 순백 정리본을 지우지 않는다 — result가 그대로라 정리 효과가 다시 돌지 않아 패널이 열리지 않던 문제(v1.24 바로가기에서 발견)
    setGrid(false); setZoomOn(false); setCropOpen(null);
    if (i !== active) setCleaned(null);
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

  /** 지금 보고 있는 사진의 머리 측정값(머리 비율 검사 결과 → 없으면 일괄 검사·직접 지정 값) */
  function currentMeasure(): { crownY: number; chinY: number; centerX: number; srcW: number; srcH: number } | null {
    if (headMeasure && headMeasure.url === (result ?? shown)) return headMeasure;
    return measures[sourceIdx] ?? null;
  }

  /** 규격 저장 기본 영역 추천(측정값이 있고 규격에 공식 머리 기준이 있을 때만) */
  function sizedRecommendation(): { rec: SizedRecommendation; m: ReturnType<typeof currentMeasure> } {
    const m = currentMeasure();
    return { rec: m ? recommendSizedCrop(m, sizePresetById(sizeId), m.srcW, m.srcH) : { mode: "none" }, m };
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
          // v1.24: 단일 [규격 저장]과 같은 추천 영역 계산(작음 확대 · 범위 안 가운데 · 큼 위치만)
          const d = decideBatchCrop(data, preset, im.naturalWidth, im.naturalHeight);
          if (d.status !== "notfound") {
            const mm = { crownY: data.crownY as number, chinY: data.chinY as number, centerX: typeof data.centerX === "number" ? (data.centerX as number) : 0.5, srcW: im.naturalWidth, srcH: im.naturalHeight, manual: false };
            setMeasures((cur) => ({ ...cur, [fileIdx]: mm }));
          }
          if (d.crop) {
            const crop = d.crop;
            setBatchCrops((cur) => ({ ...cur, [fileIdx]: { presetId: preset.id, crop, srcW: im.naturalWidth, srcH: im.naturalHeight } }));
          }
          const t = describeBatchDecision(d);
          report.push({ idx: i, name: label, text: t.text, tone: t.tone });
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
      const measured = report.filter((r) => r.text.includes("머리 약")).length;
      setNotice(`일괄 머리 비율 검사를 마쳤습니다(머리 기준 영역 지정 ${measured}장, 그중 확대 ${applied}장). [규격으로 일괄 저장]을 누르면 지정된 영역으로 저장됩니다. 머리 위치는 AI 추정이라 결과를 눈으로 확인하세요.`);
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
        // 지정 영역 → 없으면 머리 측정값 추천 영역(v1.24, 단일 저장과 같은 계산) → 없으면 가운데 자르기
        const mm = measures[fileIdx];
        const rec = !(bc && bc.presetId === preset.id) && mm ? recommendSizedCrop(mm, preset, mm.srcW, mm.srcH).crop : undefined;
        let crop: { sx: number; sy: number; sw: number; sh: number } | undefined;
        if ((bc && bc.presetId === preset.id) || (rec && mm)) {
          const im = new Image();
          await new Promise<void>((resolve, reject) => { im.onload = () => resolve(); im.onerror = () => reject(new Error("이미지를 읽지 못했습니다.")); im.src = src; });
          crop = bc && bc.presetId === preset.id
            ? scaleCrop(bc.crop, bc.srcW, bc.srcH, im.naturalWidth, im.naturalHeight)
            : scaleCrop(rec!, mm!.srcW, mm!.srcH, im.naturalWidth, im.naturalHeight);
          custom++;
        }
        const r = await renderSized(src, preset, { mirrored, filter, applyFilter: toneActive, crop });
        if (r.overLimit) over++;
        entries.push({ name: `${nameFor(fileIdx, `증명사진-${i + 1}`)}-${preset.id}-${preset.width}x${preset.height}.jpg`, data: new Uint8Array(await r.blob.arrayBuffer()) });
      }
      const zip = createZip(entries);
      downloadBlob(new Blob([zip as BlobPart], { type: "application/zip" }), `증명사진-${preset.id}-${entries.length}장-${localDateStamp()}.zip`);
      setNotice(`${entries.length}장을 ${preset.width}×${preset.height}px로 ZIP 저장했습니다(지정·머리 기준 추천 영역 ${custom}장, 가운데 자르기 ${entries.length - custom}장${over ? `, 용량 제한을 넘은 파일 ${over}장` : ""}). 제출 기관의 사진 규정은 별도로 확인해 주세요.${preset.caution ? " " + preset.caution : ""}`);
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
      const verdict = ev.status === "ok" ? "기준 범위 안입니다." : ev.status === "small" ? "기준보다 머리가 작게 나옵니다. [규격 저장] 시 얼굴 쪽으로 확대한 추천 영역으로 저장됩니다." : "기준보다 머리가 크게 나옵니다. 상체가 더 보이는 사진·여백이 있는 구도로 다시 만들어 보세요.";
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
      downloadBlob(new Blob([zip as BlobPart], { type: "application/zip" }), `인물사진-${entries.length}장-${localDateStamp()}.zip`);
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

  /** v1.24 프로필 세트: 같은 사진·같은 머리 측정값으로 정사각·세로 4:5·원형 프로필을 만들어 먼저 미리보기로 보여 준다(AI 호출 없음) */
  async function openProfilePreview(circleBg: "transparent" | "white" = profileCircleBg) {
    if (!shown) return;
    setProfileCircleBg(circleBg);
    setSaving("profile");
    try {
      const m = currentMeasure();
      const im = new Image();
      await new Promise<void>((resolve, reject) => { im.onload = () => resolve(); im.onerror = () => reject(new Error("이미지를 읽지 못했습니다.")); im.src = shown; });
      const W = im.naturalWidth, H = im.naturalHeight;
      const base = batchMode ? nameFor(sourceIdx, "프로필") : "프로필";
      const items: ProfileItem[] = [];
      for (const f of PROFILE_FORMATS) {
        const c = m ? scaleCrop(profileCrop(m, f, m.srcW, m.srcH), m.srcW, m.srcH, W, H) : profileCrop(null, f, W, H);
        const blob = await renderProfile(shown, f, c, { mirrored, filter, applyFilter: toneActive, circleBg });
        items.push({ label: f.label, circle: f.circle, name: `${base}-${f.id}-${f.width}x${f.height}.${f.circle ? "png" : "jpg"}`, blob, url: URL.createObjectURL(blob) });
      }
      closeProfilePreview();
      setProfilePreview({ items, measured: !!m, base });
    } catch (e) { setError(e instanceof Error ? e.message : "미리보기를 만들지 못했습니다."); } finally { setSaving(""); }
  }

  function closeProfilePreview() {
    setProfilePreview((cur) => { cur?.items.forEach((it) => URL.revokeObjectURL(it.url)); return null; });
  }

  /** 미리보기에서 본 그림 그대로 ZIP 저장(보이는 모양 = 저장 모양) */
  async function saveProfileSet() {
    if (!profilePreview) return;
    setSaving("profile");
    try {
      const entries = await Promise.all(profilePreview.items.map(async (it) => ({ name: it.name, data: new Uint8Array(await it.blob.arrayBuffer()) })));
      const zip = createZip(entries);
      downloadBlob(new Blob([zip as BlobPart], { type: "application/zip" }), `${profilePreview.base}-세트-${localDateStamp()}.zip`);
      setNotice(`프로필 세트 ${entries.length}장(${PROFILE_FORMATS.map((f) => f.label).join(" · ")})을 ZIP으로 저장했습니다. ${profilePreview.measured ? "머리 위치를 기준으로 얼굴이 가운데 오게 잘랐습니다." : "머리 위치를 몰라 위쪽 가운데로 잘랐습니다 — [얼굴 위치 직접 지정]을 하면 얼굴 기준으로 잘립니다."}`);
      closeProfilePreview();
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); } finally { setSaving(""); }
  }

  /** F4(v1.35): 지금 보고 있는 결과 한 장을 고른 규격·프로필로 한 번에 ZIP 저장(AI 호출 없음). 규격은 [규격 저장]과 같은 머리 기준 추천 영역, 프로필은 프로필 세트와 같은 계산 */
  async function saveBundle() {
    if (!shown) return;
    const keys = cleanBundle(bundleKeys);
    if (keys.length === 0) { setError("묶음에 넣을 규격을 하나 이상 골라 주세요."); return; }
    setSaving("bundle");
    try {
      let src = shown;
      if (whiten) { try { src = (await whitenDataUrl(src)).dataUrl; } catch { /* 원본 사용 */ } }
      const im = new Image();
      await new Promise<void>((resolve, reject) => { im.onload = () => resolve(); im.onerror = () => reject(new Error("이미지를 읽지 못했습니다.")); im.src = src; });
      const W = im.naturalWidth, H = im.naturalHeight;
      const m = currentMeasure();
      const base = batchMode ? nameFor(sourceIdx, "인물사진") : "인물사진";
      const entries: { name: string; data: Uint8Array }[] = [];
      const over: string[] = [];
      const cautions: string[] = [];
      for (const k of keys) {
        const [kind, id] = k.split(":");
        if (kind === "size") {
          const preset = sizePresetById(id);
          const rec = m ? recommendSizedCrop(m, preset, m.srcW, m.srcH) : { mode: "none" as const };
          const crop = rec.mode !== "none" && rec.crop && m ? scaleCrop(rec.crop, m.srcW, m.srcH, W, H) : undefined;
          const r = await renderSized(src, preset, { mirrored, filter, applyFilter: toneActive, crop });
          if (r.overLimit) over.push(preset.label);
          if (preset.caution && !cautions.includes(preset.caution)) cautions.push(preset.caution);
          entries.push({ name: bundleFileName(base, k), data: new Uint8Array(await r.blob.arrayBuffer()) });
        } else {
          const f = PROFILE_FORMATS.find((x) => x.id === id)!;
          const c = m ? scaleCrop(profileCrop(m, f, m.srcW, m.srcH), m.srcW, m.srcH, W, H) : profileCrop(null, f, W, H);
          const blob = await renderProfile(src, f, c, { mirrored, filter, applyFilter: toneActive, circleBg: profileCircleBg });
          entries.push({ name: bundleFileName(base, k), data: new Uint8Array(await blob.arrayBuffer()) });
        }
      }
      const zip = createZip(entries);
      downloadBlob(new Blob([zip as BlobPart], { type: "application/zip" }), `${base}-묶음-${entries.length}종-${localDateStamp()}.zip`);
      setNotice([
        `묶음 ${entries.length}종을 ZIP 하나로 저장했습니다(${keys.map(bundleItemLabel).join(" · ")}).`,
        m ? "머리 위치를 기준으로 규격마다 잘랐습니다(추정값이라 눈으로 확인하세요)." : "머리 위치를 몰라 규격은 가운데, 프로필은 위쪽 가운데로 잘랐습니다 — [머리 비율 검사] 또는 [얼굴 위치 직접 지정]을 하면 얼굴 기준으로 잘립니다.",
        over.length ? `용량 제한을 넘은 파일: ${over.join(", ")} — 제출처에서 다시 압축해 주세요.` : "",
        ...cautions,
      ].filter(Boolean).join(" "));
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); } finally { setSaving(""); }
  }

  async function saveSized() {
    if (!shown) return;
    const preset = sizePresetById(sizeId);
    setSaving("lic");
    try {
      // v1.23: 머리 위치를 알고 있으면 공식 머리 기준에 맞춘 추천 영역으로 저장(모델이 머리 비율을 잘 못 맞추는 문제 보완)
      const { rec, m } = sizedRecommendation();
      let crop: { sx: number; sy: number; sw: number; sh: number } | undefined;
      if (rec.crop && m) {
        const im = new Image();
        await new Promise<void>((resolve, reject) => { im.onload = () => resolve(); im.onerror = () => reject(new Error("이미지를 읽지 못했습니다.")); im.src = shown; });
        crop = scaleCrop(rec.crop, m.srcW, m.srcH, im.naturalWidth, im.naturalHeight);
      }
      const r = await renderSized(shown, preset, { mirrored, filter, applyFilter: toneActive, crop });
      downloadBlob(r.blob, `${batchMode ? nameFor(sourceIdx, "증명사진") : "증명사진"}-${preset.id}${crop ? "-추천" : ""}-${preset.width}x${preset.height}-${localDateStamp()}.jpg`);
      const pct = (n: number) => Math.round(n * 100);
      const range = preset.headRange ? `기준 ${pct(preset.headRange[0])}~${pct(preset.headRange[1])}%` : "";
      const head = rec.mode === "none"
        ? (preset.headRange ? "가운데 자르기로 저장했습니다. [머리 비율 검사(AI 1회)] 또는 [자르기 영역 조정]의 얼굴 위치 직접 지정(무료)을 하면 다음 저장부터 머리 기준에 맞춘 추천 영역으로 저장됩니다." : "")
        : rec.status === "small"
          ? `추천 영역으로 저장했습니다(머리 약 ${pct(rec.ratio ?? 0)}% → ${pct(rec.achieved ?? 0)}%, ${range}${rec.clamped ? ", 사진 크기 한계로 더 확대하지 못했습니다" : ""}).${crop && crop.sw < preset.width ? " 원본 해상도보다 확대돼 선명도가 낮을 수 있습니다." : ""}`
          : rec.status === "large"
            ? `머리가 기준보다 큽니다(약 ${pct(rec.ratio ?? 0)}%, ${range}). 원본 크기 한계로 더 줄이지 못해 머리가 잘리지 않게 위치만 맞춰 저장했습니다. 상체가 더 보이는 구도로 다시 만들어 보세요.`
            : `머리 약 ${pct(rec.ratio ?? 0)}%로 ${range} 안이라 얼굴만 가로 가운데로 맞춰 저장했습니다.`;
      const extra = [head, rec.mode !== "none" ? "머리 위치는 추정값이라 결과를 눈으로 확인하세요." : "", r.underMin ? `용량(${Math.round(r.bytes / 1024)}KB)이 최소 ${Math.round((preset.minBytes ?? 0) / 1024)}KB보다 작습니다. 제출처 기준을 확인해 주세요.` : "", preset.caution ?? ""].filter(Boolean).join(" ");
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
              <option value={7}>7일 후 자동 삭제</option><option value={30}>30일 후 자동 삭제</option>
            </select><b />
          </label>
        )}
      </div>

      <ol className="st-steps" aria-label="진행 단계">
        <li className={previewUrl ? "done" : "on"}><button type="button" onClick={() => goToArea("st-sec-1")} title="사진 올리기로 이동"><span>1</span>사진</button></li>
        <li className={previewUrl && !shown && !busy ? "on" : shown ? "done" : ""}><button type="button" onClick={() => goToArea("st-purposes")} title="목적·옵션으로 이동"><span>2</span>목적·옵션</button></li>
        <li className={busy ? "on" : shown ? "done" : ""}><button type="button" onClick={() => goToArea("st-result")} title="생성 결과로 이동"><span>3</span>만들기</button></li>
        <li className={shown && !busy ? "on" : ""}><button type="button" onClick={() => goToArea("st-save", "st-result")} title="저장·규격으로 이동"><span>4</span>저장·규격</button></li>
      </ol>

      <div className="purposes" id="st-purposes" role="tablist" aria-label="촬영 목적">
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
            <label className={previewUrl ? "dropzone has" : "dropzone"} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void onPick(e.dataTransfer.files); }}>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="업로드한 참조 사진" style={selfie ? { transform: "scaleX(-1)" } : undefined} />
              ) : (
                <span className="drop-empty"><Upload size={22} /><b>클릭하거나 사진을 끌어다 놓으세요</b><small>얼굴 위주 사진 권장</small></span>
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => void onPick(e.target.files)} />
            </label>
            {previews.length > 0 && (() => {
              // v1.27 생성 전 품질 점검 결과(브라우저 안 얼굴 인식, AI 비용 없음) — 안내만 하고 막지 않는다
              const done = previews.map((_, i) => photoChecks[i]);
              if (done.some((d) => d === undefined)) return <p className="notice" role="status"><Loader2 size={14} className="ls-spin" /> 사진을 점검하는 중입니다(이 브라우저 안에서만)…</p>;
              if (done.every((d) => d === null)) return null;
              const bad = done.map((d, i) => ({ i, d: d ?? [] })).filter((x) => x.d.length > 0);
              if (bad.length === 0) return <p className="notice head-ok" role="status">사진 점검: 정면 얼굴 1명 확인{previews.length > 1 ? ` (${previews.length}장 모두)` : ""}.</p>;
              return (
                <div className="notice warning" role="status">
                  <b>사진 점검 — 이대로도 만들 수 있지만 결과가 덜 닮을 수 있어요.</b>
                  <ul className="gd-list" style={{ marginTop: 6 }}>
                    {bad.map(({ i, d }) => d.map((x) => <li key={`${i}-${x.code}`}>{previews.length > 1 ? `${i + 1}번 사진: ` : ""}{x.text}</li>))}
                  </ul>
                </div>
              );
            })()}
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
          <section className="card st-result" id="st-result">
            <div className="st-result-head">
              <h2><Sparkles size={16} /> 생성 결과</h2>
              <span className="muted">{model === "pro" ? "Pro" : "Flash"} · {resolution} · {aspect}{count > 1 ? ` · ${count}장` : ""}</span>
              <span className="st-stage-bg" role="group" aria-label="결과 배경 밝기">
                배경
                {STAGE_BGS.map((b) => (
                  <button key={b.id} type="button" aria-pressed={stageBg === b.id} title={b.label} aria-label={`배경 ${b.label}`} style={{ background: b.swatch }} onClick={() => changeStageBg(b.id)} />
                ))}
              </span>
            </div>
            {cropOpen && shown && (() => {
              const pr = sizePresetById(sizeId);
              const aspect = pr.width / pr.height;
              const base = coverCrop(cropOpen.w, cropOpen.h, pr.width, pr.height, 0.15);
              const bm = measures[sourceIdx];
              const m = headMeasure && headMeasure.url === (result ?? shown) ? headMeasure : (bm ? { url: result ?? shown, crownY: bm.crownY, chinY: bm.chinY, centerX: bm.centerX, srcW: bm.srcW, srcH: bm.srcH } : null);
              // 규격 저장과 같은 추천 영역(v1.23) — 측정 크기와 다르면 패널 이미지 크기로 맞춤
              const sr = m ? recommendSizedCrop(m, pr, m.srcW, m.srcH) : null;
              const rec = m && sr?.crop ? scaleCrop(sr.crop, m.srcW, m.srcH, cropOpen.w, cropOpen.h) : base;
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
            <div className={stageBg === "grid" ? "st-stage" : `st-stage bg-${stageBg}`} style={{ aspectRatio: aspect.replace(":", " / "), display: ((grid || zoomOn) && results.length > 1) || cropOpen ? "none" : undefined }}>
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
              {shown && showHeadLines && !compare && (() => {
                // v1.27 머리 위치 선(정수리·턱) — 사진이 무대 안에 contain으로 그려지는 영역에 맞춘다
                const m = currentMeasure();
                if (!m) return null;
                const [aw, ah] = aspect.split(":").map(Number);
                const ratio = aw && ah ? aw / ah : m.srcW / m.srcH;
                const src = "auto" in m && m.auto ? "자동 추정" : headMeasure && headMeasure.url === (result ?? shown) ? "검사·지정" : ("manual" in m && m.manual ? "직접 지정" : "검사");
                const line = (y: number, color: string, label: string) => (
                  <div key={label} className="head-line" style={{ position: "absolute", left: 0, right: 0, top: `${overlayY(y, m.srcW, m.srcH, ratio)}%`, borderTop: `2px dashed ${color}`, opacity: 0.85, pointerEvents: "none", zIndex: 4 }}>
                    <span style={{ position: "absolute", left: 6, top: -18, fontSize: 10, padding: "0 4px", borderRadius: 4, background: "#000000b3", color }}>{label}</span>
                  </div>
                );
                return <>{line(m.crownY, "#38bdf8", `정수리(${src})`)}{line(m.chinY, "#f59e0b", "턱")}</>;
              })()}
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
                <label className="check" title="자동 추정·검사·직접 지정한 정수리와 턱 위치를 사진 위에 선으로 보여 줍니다(고정 위치인 증명사진 가이드선과 달리 실제 머리 위치)"><input type="checkbox" checked={showHeadLines} onChange={(e) => setShowHeadLines(e.target.checked)} /><span>머리 위치 선 보기</span></label>
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
            {shown && (() => {
              const { rec, m } = sizedRecommendation();
              if (rec.mode === "none") return null;
              const pct = (n: number) => Math.round(n * 100);
              const isAuto = !!(m && "auto" in m && m.auto);
              return (
                <p className="notice head-ok" role="status">
                  {isAuto && <b>머리 위치: 브라우저 자동 추정 · </b>}
                  {rec.status === "small" && <>[규격 저장] 시 추천 영역이 자동 적용됩니다 — 얼굴 쪽으로 확대(머리 약 {pct(rec.ratio ?? 0)}% → {pct(rec.achieved ?? 0)}%).</>}
                  {rec.status === "large" && <>머리가 기준보다 큽니다(약 {pct(rec.ratio ?? 0)}%). [규격 저장] 시 머리가 잘리지 않게 위치만 맞춥니다. 상체가 더 보이게 다시 만들면 좋습니다.</>}
                  {rec.status === "ok" && <>머리 약 {pct(rec.ratio ?? 0)}%로 기준 범위 안입니다. [규격 저장] 시 얼굴을 가로 가운데로 맞춥니다.</>}
                  {isAuto && <> 추정이 어긋나 보이면 [자르기 영역 조정]의 얼굴 위치 직접 지정(무료)이나 [머리 비율 검사]로 고칠 수 있어요.</>}
                </p>
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
            {profilePreview && (
              <div className="zc" role="dialog" aria-label="프로필 세트 미리보기">
                <div className="zc-bar"><b>프로필 세트 미리보기 — 저장될 모양 그대로</b><button type="button" onClick={closeProfilePreview}>닫기</button></div>
                <div className="chips" role="radiogroup" aria-label="원형 프로필 바깥 색">
                  <small className="muted">원형 바깥:</small>
                  {(["transparent", "white"] as const).map((v) => (
                    <Chip key={v} on={profileCircleBg === v} onClick={() => { if (profileCircleBg !== v) void openProfilePreview(v); }} title={v === "white" ? "투명 부분을 검게 보여 주는 메신저용" : "배경에 자연스럽게 얹히는 투명 PNG"}>{v === "transparent" ? "투명" : "흰색"}</Chip>
                  ))}
                </div>
                <div className="zc-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", alignItems: "end" }}>
                  {profilePreview.items.map((it) => (
                    <figure key={it.name} className="zc-pane" style={{ margin: 0, textAlign: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.url} alt={`${it.label} 미리보기`} style={{ width: "100%", display: "block", borderRadius: it.circle ? "50%" : 8 }} />
                      <figcaption><small>{it.label}</small></figcaption>
                    </figure>
                  ))}
                </div>
                {!profilePreview.measured && <p className="notice warning" style={{ marginTop: 8 }}>머리 위치를 몰라 위쪽 가운데로 잘랐습니다. <button type="button" className="mini" onClick={() => { closeProfilePreview(); gotoCrop(active, true); }}>얼굴 위치 직접 지정 (무료)</button> 후 다시 미리보면 얼굴 기준으로 잘립니다.</p>}
                <div className="actions" style={{ marginTop: 8 }}>
                  <button type="button" className="primary" onClick={saveProfileSet} disabled={!!saving}>{saving === "profile" ? <Loader2 size={14} className="ls-spin" /> : <Download size={14} />}ZIP으로 저장 ({profilePreview.items.length}장)</button>
                </div>
              </div>
            )}
            <button type="button" className="primary st-generate" onClick={generate} disabled={busy || !file} aria-describedby="st-generate-why">
              {busy ? <><Loader2 size={16} className="ls-spin" />만드는 중</> : <><Sparkles size={16} />인물 사진 만들기</>}
            </button>
            {!busy && (!file || !confirmOwn) && (
              <p id="st-generate-why" className="st-generate-why">{!file ? "① 인물 사진 칸에 사진을 먼저 올려 주세요." : "위 「본인 사진·사용 동의」에 체크해야 만들 수 있어요."}</p>
            )}
            {shown && sizePresetById(sizeId).headRange && sizedRecommendation().rec.mode === "none" && faceDetecting && (
              <p className="notice" role="status"><Loader2 size={14} className="ls-spin" /> 얼굴 위치를 이 브라우저 안에서 자동으로 찾는 중입니다(사진은 서버로 보내지 않아요)…</p>
            )}
            {shown && sizePresetById(sizeId).headRange && sizedRecommendation().rec.mode === "none" && !headBusy && !faceDetecting && (
              <p className="notice warning" role="status">
                머리 위치를 아직 모릅니다. 지금 [규격 저장]은 가운데를 자릅니다 — <b>[머리 비율 검사 (AI 1회)]</b> 또는 <b>[얼굴 위치 직접 지정 (무료)]</b>을 먼저 하면 공식 머리 기준에 맞춘 추천 영역으로 저장됩니다.
              </p>
            )}
            {shown && (
              <div className="actions st-save" id="st-save">
                {batchMode && results.length > 1 && sizePresetById(sizeId).headRange && (
                  <button type="button" onClick={() => (autoConfirm ? void autoCropBatch() : setAutoConfirm(true))} disabled={!!saving || autoBusy}
                    title="사진마다 머리 비율을 AI로 검사하고 작게 나온 사진은 자동으로 확대 자르기를 지정합니다">
                    {autoBusy ? <Loader2 size={14} className="ls-spin" /> : <Sparkles size={14} />}
                    {autoBusy ? `검사 중… ${autoProgress}` : autoConfirm ? `확인하고 시작 (AI ${results.length - skip.filter(Boolean).length}회 호출)` : "일괄 머리 비율 검사 + 자동 확대 자르기"}
                  </button>
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
                <button type="button" onClick={() => void openProfilePreview()} disabled={!!saving} title="같은 사진으로 정사각 1:1 · 세로 4:5 · 원형 프로필을 미리 보고 한 번에 저장합니다(AI 호출 없음)">{saving === "profile" ? <Loader2 size={14} className="ls-spin" /> : <ImageIcon size={14} />}프로필 세트 미리보기·저장 (1:1·4:5·원형)</button>
                {(() => {
                  // v1.24: 머리 위치를 모르면 검사·직접 지정을 눈에 띄게(측정값이 생기면 원래 모양)
                  const needMeasure = !!sizePresetById(sizeId).headRange && sizedRecommendation().rec.mode === "none";
                  return (
                    <>
                      <button type="button" className={needMeasure ? "primary" : undefined} onClick={checkHead} disabled={headBusy || !!saving} title="선택한 규격의 공식 머리 높이 기준과 견줍니다(본인 키 1회 호출)">{headBusy ? <Loader2 size={14} className="ls-spin" /> : <Sparkles size={14} />}머리 비율 검사 (AI 1회)</button>
                      {needMeasure && <button type="button" className="primary" onClick={() => gotoCrop(active, true)} disabled={!!saving} title="자르기 패널에서 정수리·턱 끝을 차례로 클릭합니다(AI 호출 없음)">얼굴 위치 직접 지정 (무료)</button>}
                    </>
                  );
                })()}
                <button type="button" onClick={openCrop} disabled={!!saving} title="저장될 영역을 미리 보고 위치·확대를 직접 조정합니다">자르기 영역 조정</button>
                <select value={sizeId} onChange={(e) => changePreset(e.target.value)} aria-label="증명사진 규격" className="size-select">
                  {SIZE_PRESETS.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
                <button type="button" onClick={saveSized} disabled={!!saving}>{saving === "lic" ? <Loader2 size={14} className="ls-spin" /> : <Download size={14} />}규격 저장 ({sizePresetById(sizeId).note}){sizedRecommendation().rec.mode !== "none" ? " · 추천 영역" : ""}</button>
              </div>
            )}
            {shown && (
              <div className="bundle-box">
                <b>📦 목적별 묶음 저장</b> <small className="muted">— 이 사진 한 장을 여러 규격으로 한 번에 ZIP 저장(AI 호출 없음)</small>
                <div className="chips" role="group" aria-label="기본 묶음">
                  {BUNDLES.map((b) => (
                    <Chip key={b.id} on={b.items.length === bundleKeys.length && b.items.every((k) => bundleKeys.includes(k))} onClick={() => setBundleKeys(b.items)} title={b.desc}>{b.label}</Chip>
                  ))}
                </div>
                <details className="bundle-pick">
                  <summary>직접 고르기 ({bundleKeys.length}개 선택)</summary>
                  <div className="bundle-grid">
                    {[...SIZE_PRESETS.map((z) => `size:${z.id}` as BundleKey), ...PROFILE_FORMATS.map((f) => `profile:${f.id}` as BundleKey)].map((k) => (
                      <label key={k} className="bundle-item">
                        <input type="checkbox" checked={bundleKeys.includes(k)} onChange={(e) => setBundleKeys((cur) => cleanBundle(e.target.checked ? [...cur, k] : cur.filter((x) => x !== k)))} />
                        <span>{bundleItemLabel(k)}</span>
                      </label>
                    ))}
                  </div>
                </details>
                {/* v1.36: 받기 전에 어떤 파일이 생기는지 미리 보기 */}
                {bundleKeys.length > 0 && (
                  <div className="bundle-preview" aria-label="묶음에 들어갈 파일">
                    <p>들어갈 파일 {bundleKeys.length}장 · ZIP 1개</p>
                    <ul>
                      {bundlePreview(bundleKeys).map((f) => (
                        <li key={f.key}><span>{f.label}</span><span className="bundle-size">{f.size} · {f.ext.toUpperCase()}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                <button type="button" className="primary" onClick={() => void saveBundle()} disabled={!!saving || bundleKeys.length === 0}>{saving === "bundle" ? <Loader2 size={14} className="ls-spin" /> : <Download size={14} />}묶음 저장 ({bundleKeys.length}종, ZIP)</button>
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
