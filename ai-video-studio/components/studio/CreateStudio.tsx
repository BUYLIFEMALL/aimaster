"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookmarkPlus, Clapperboard, ImagePlus, KeyRound, Loader2, Sparkles, Wand2, X } from "lucide-react";
import { MODELS, PROVIDERS, clampSeconds, estCostUsd, pickResolution, type AspectRatio, type ProviderId, type StudioModel } from "@/lib/providers/catalog";
import type { ClientGeneration } from "@/lib/generationTypes";
import { SAFETY } from "@/lib/promptPolish";
import { CAMERAS, STYLES } from "@/lib/presets";
import { reuseFromGeneration } from "@/lib/reuse";
import { findPreset, type BoardPreset, type MinePrompt } from "@/lib/promptBoard";
import { GenerationCard } from "./GenerationCard";

const IDEAS = [
  "비 오는 서울 밤거리를 걷는 우산 쓴 여성",
  "한옥 마당에 내리는 첫눈",
  "바다 위로 떠오르는 일출과 갈매기",
  "카페 창가에서 김이 오르는 라떼",
  "벚꽃길을 달리는 자전거"
];

function composePrompt(idea: string, styleId: string | null, cameraId: string | null): string {
  const style = STYLES.find((s) => s.id === styleId);
  const camera = CAMERAS.find((c) => c.id === cameraId);
  // 인물은 한국인으로(루트 CLAUDE.md 핵심 원칙 3), 글자·로고는 넣지 않는다
  return [idea.trim(), style?.text, camera?.text, SAFETY].filter(Boolean).join(". ");
}

/** 사진을 긴 변 1280px JPG로 줄여 data 주소로 만든다(서버 한도 2.5MB 안쪽) */
async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 초기화하지 못했습니다.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function chip(active: boolean) {
  return `rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
    active
      ? "border-red-500 bg-red-600 text-white shadow-md shadow-red-600/30"
      : "border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600 hover:text-white"
  }`;
}

function ImageSlot({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  required?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-1">
      <span className="text-xs font-bold text-slate-300">
        {label} {required && <b className="text-red-400">*필수</b>}
      </span>
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-28 rounded-xl border border-slate-700 object-cover shadow-sm" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`${label} 지우기`}
            className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-1 text-slate-300 hover:text-white border border-slate-600 shadow-md"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label className="flex h-28 w-44 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-700 text-xs text-slate-400 hover:border-red-500/60 hover:text-red-300 bg-slate-900/40 transition-colors">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-5 w-5" aria-hidden="true" />}
          사진 고르기(JPG·PNG·WEBP)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setBusy(true);
              try {
                onChange(await shrinkImage(f));
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      )}
    </div>
  );
}

export function CreateStudio({
  fromId = null,
  presetId = null,
  mineId = null,
}: {
  fromId?: string | null;
  presetId?: string | null;
  mineId?: string | null;
}) {
  const [idea, setIdea] = useState("");
  const [saveMine, setSaveMine] = useState<{ busy: boolean; text: string; ok: boolean } | null>(null);
  const [styleId, setStyleId] = useState<string | null>("cinematic");
  const [cameraId, setCameraId] = useState<string | null>("push");
  const [providerId, setProviderId] = useState<ProviderId>("gemini");
  const [modelId, setModelId] = useState<string>(MODELS.find((m) => m.provider === "gemini")?.id ?? MODELS[0].id);
  const [seconds, setSeconds] = useState<number>(5);
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [resolution, setResolution] = useState<string | null>(null);
  const [audio, setAudio] = useState(false);
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Set<string> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ text: string; keys?: boolean } | null>(null);
  const [results, setResults] = useState<ClientGeneration[]>([]);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const [polished, setPolished] = useState<{
    prompt: string;
    note: string;
    basis: string;
    options: { prompt: string; note: string }[];
    pick: number;
  } | null>(null);
  const [reuseNotice, setReuseNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [usePolished, setUsePolished] = useState(true);
  const [polishing, setPolishing] = useState(false);
  const [polishError, setPolishError] = useState<{ text: string; keys?: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/keys", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRegistered(new Set<string>(d.registered ?? [])))
      .catch(() => setRegistered(new Set()));
  }, []);

  const model: StudioModel = useMemo(() => MODELS.find((m) => m.id === modelId) ?? MODELS[0], [modelId]);
  const sec = clampSeconds(model, seconds);
  const withEnd = !!endImage && !!startImage && model.endFrame;
  const pickedRes = pickResolution(model, resolution);
  const withAudio = model.audioOption && audio;
  const cost = estCostUsd(model, sec, withEnd, pickedRes, withAudio);
  const hasKey = registered ? registered.has(PROVIDERS[model.provider].keyProvider) : null;
  const basis = `${idea.trim()}|${styleId ?? ""}|${cameraId ?? ""}`;
  const polishedOn = !!polished && usePolished && polished.prompt.trim().length > 0;
  const finalPrompt = polishedOn && polished ? `${polished.prompt.trim().replace(/[.\s]+$/, "")}. ${SAFETY}` : composePrompt(idea, styleId, cameraId);

  async function polish() {
    if (idea.trim().length < 2) {
      setPolishError({ text: "다듬을 영상 설명을 먼저 입력해 주세요." });
      return;
    }
    setPolishing(true);
    setPolishError(null);
    try {
      const res = await fetch("/api/prompt/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          style: STYLES.find((s) => s.id === styleId)?.text ?? null,
          camera: CAMERAS.find((c) => c.id === cameraId)?.text ?? null,
          seconds: sec,
          hasImage: !!startImage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.error || "설명을 다듬지 못했습니다."), { keys: !!data.needKey });
      const options: { prompt: string; note: string }[] =
        Array.isArray(data.options) && data.options.length ? data.options : [{ prompt: data.prompt, note: data.note ?? "" }];
      setPolished({ prompt: options[0].prompt, note: options[0].note, basis, options, pick: 0 });
      setUsePolished(true);
    } catch (e) {
      setPolishError({ text: e instanceof Error ? e.message : "설명을 다듬지 못했습니다.", keys: (e as { keys?: boolean }).keys });
    } finally {
      setPolishing(false);
    }
  }

  function pickProvider(p: ProviderId) {
    setProviderId(p);
    const first = MODELS.find((m) => m.provider === p);
    if (first) setModelId(first.id);
    setConfirming(false);
  }

  const poll = useCallback((ids: string[]) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/generations?ids=${ids.join(",")}`, { cache: "no-store" });
        const data = await res.json();
        if (res.ok && Array.isArray(data.generations)) {
          const fresh = data.generations as ClientGeneration[];
          setResults((prev) => prev.map((r) => fresh.find((f) => f.id === r.id) ?? r));
          if (fresh.some((g) => g.status === "running")) poll(ids);
          return;
        }
      } catch {
        /* 일시 오류는 다음 확인 때 다시 */
      }
      poll(ids);
    }, 8000);
  }, []);

  useEffect(() => () => {
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);

  useEffect(() => {
    if (!presetId && !mineId) return;
    let cancelled = false;
    (async () => {
      if (mineId) {
        try {
          const r = await fetch("/api/prompts/mine", { cache: "no-store" });
          const d = await r.json();
          const target = (d.prompts as MinePrompt[] | undefined)?.find((p) => p.id === mineId);
          if (target && !cancelled) {
            setIdea(target.idea || target.title);
            if (target.styleId) setStyleId(target.styleId);
            if (target.cameraId) setCameraId(target.cameraId);
            setReuseNotice({ text: `내 프롬프트 「${target.title}」의 설정을 적용했습니다.`, ok: true });
            return;
          }
        } catch {}
      }
      if (presetId) {
        try {
          const r = await fetch("/api/prompts/presets", { cache: "no-store" });
          const d = await r.json();
          const target = (d.presets as BoardPreset[] | undefined)?.find((p) => p.id === presetId) ?? findPreset(presetId);
          if (target && !cancelled) {
            setIdea(target.title);
            if (target.styleId) setStyleId(target.styleId);
            if (target.cameraId) setCameraId(target.cameraId);
            setReuseNotice({ text: `프롬프트 「${target.title}」의 설정을 적용했습니다.`, ok: true });
          }
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [presetId, mineId]);

  useEffect(() => {
    if (!fromId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/generations/${fromId}`, { cache: "no-store" });
        const d = await res.json();
        if (!res.ok || !d.generation || cancelled) return;
        const g = d.generation as ClientGeneration;
        const f = reuseFromGeneration(g);
        const m = MODELS.find((x) => x.id === f.model);
        const st = STYLES.some((x) => x.id === f.styleId) ? f.styleId : null;
        const cam = CAMERAS.some((x) => x.id === f.cameraId) ? f.cameraId : null;
        setIdea(f.idea);
        setStyleId(st);
        setCameraId(cam);
        if (m) {
          setProviderId(m.provider);
          setModelId(m.id);
          setSeconds(f.seconds);
        }
        if (f.aspect === "16:9" || f.aspect === "9:16") setAspect(f.aspect);
        setResolution(f.resolution);
        setAudio(f.audio);
        setPolished(
          f.polishedPrompt
            ? { prompt: f.polishedPrompt, note: "이전에 다듬어 쓴 설명입니다.", basis: `${f.idea.trim()}|${st ?? ""}|${cam ?? ""}`, options: [], pick: -1 }
            : null
        );
        setUsePolished(true);
        setReuseNotice({ text: `「${g.prompt.slice(0, 24)}…」 설정을 불러왔습니다.${m ? "" : " (지금은 없는 모델이라 모델은 다시 골라 주세요)"} 사진은 다시 넣어 주세요.`, ok: true });
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [fromId]);

  function check(): string | null {
    if (!finalPrompt.trim()) return "영상에 들어갈 설명을 적어 주세요.";
    if (model.needsImage && !startImage) return `${model.name} 모델은 시작 장면 사진이 꼭 필요합니다.`;
    return null;
  }

  async function submit() {
    const why = check();
    if (why) {
      setError({ text: why });
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // v1.34: 서버(app/api/generations)가 읽는 이름으로 — v1.28 리뉴얼 때 이름이 바뀌어 사진·비율이 전달되지 않던 것 복구(시험 catalog.test.mjs)
        body: JSON.stringify({
          model: model.id,
          prompt: finalPrompt,
          seconds: sec,
          aspectRatio: aspect,
          resolution: pickedRes,
          audio: withAudio,
          startImage,
          endImage: withEnd ? endImage : null,
          reuse: { idea, styleId, cameraId },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || "영상 생성을 시작하지 못했습니다."), { keys: !!data.missingKeys });
      const gens = (Array.isArray(data.generations) ? data.generations : []) as ClientGeneration[];
      setConfirming(false);
      setResults((prev) => [...gens, ...prev]);
      if (gens.length) poll(gens.map((g) => g.id));
    } catch (e) {
      setError({ text: e instanceof Error ? e.message : "영상 생성을 시작하지 못했습니다.", keys: (e as { keys?: boolean }).keys });
    } finally {
      setSubmitting(false);
    }
  }

  async function saveToMine() {
    if (idea.trim().length < 2) return;
    setSaveMine({ busy: true, text: "저장 중…", ok: false });
    try {
      const res = await fetch("/api/prompts/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: idea.slice(0, 40), prompt: finalPrompt, styleId, cameraId, modelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장하지 못했습니다.");
      setSaveMine({ busy: false, text: "내 프롬프트로 저장되었습니다.", ok: true });
    } catch (e) {
      setSaveMine({ busy: false, text: e instanceof Error ? e.message : "저장하지 못했습니다.", ok: false });
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6">
      
      {/* 1. 상단 4단계 시네마틱 파이프라인 인디케이터 배너 */}
      <div className="bg-[#141C2E] rounded-2xl p-5 border border-slate-700/80 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs sm:text-sm font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            유튜브 쇼츠 & 시네마틱 4단계 비디오 파이프라인
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">Google Veo 2 / Runway Gen-3 연동</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-red-400">STEP 01</span>
              <span className="text-xs">💡</span>
            </div>
            <h3 className="text-xs font-bold text-white">아이디어 프롬프트</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">장면·상황·인물 입력</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-slate-400">STEP 02</span>
              <span className="text-xs">🎥</span>
            </div>
            <h3 className="text-xs font-bold text-slate-200">화풍 & 카메라 앵글</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">시네마틱, 푸시인 지정</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-slate-400">STEP 03</span>
              <span className="text-xs">⚙️</span>
            </div>
            <h3 className="text-xs font-bold text-slate-200">AI 모델 & 렌더링</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Veo 2 초고화질 연산</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-slate-400">STEP 04</span>
              <span className="text-xs">🚀</span>
            </div>
            <h3 className="text-xs font-bold text-slate-200">MP4 다운로드 & 쇼츠</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">4K 무손실 보관</p>
          </div>
        </div>
      </div>

      {/* 안내 알림 (이전 설정 복원 등) */}
      {reuseNotice && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-2.5 text-xs text-red-300 flex items-center justify-between">
          <span>{reuseNotice.text}</span>
          <button type="button" onClick={() => setReuseNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 2단 구성 (좌측 뷰파인더 덱 목업 + 우측 컨트롤러 덱) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 좌측: 실물 뷰파인더 덱 목업 (4컬럼) */}
        <div className="lg:col-span-4 bg-[#141C2E] rounded-2xl border border-slate-700/80 p-5 flex flex-col items-center justify-center relative shadow-lg">
          <div className="w-full flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-red-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              9:16 쇼츠 뷰파인더 모니터
            </span>
            <span className="text-[10px] font-mono text-slate-400">60 FPS · 4K UHD</span>
          </div>

          {/* 스마트폰 뷰파인더 프레임 */}
          <div className="w-full max-w-[260px] aspect-[9/16] bg-slate-950 rounded-[32px] p-2 border-4 border-slate-700 relative overflow-hidden flex flex-col shadow-2xl">
            {/* 상단 타임코드 HUD */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 text-[9px] font-mono text-white/90">
              <span className="px-1.5 py-0.5 rounded bg-red-600 font-black animate-pulse">REC 🔴</span>
              <span>00:00:0{sec}:00</span>
              <span className="text-slate-300 font-bold">{aspect}</span>
            </div>

            {/* 프리뷰 화면 캔버스 */}
            <div
              className="w-full h-full rounded-[24px] overflow-hidden bg-slate-900 bg-cover bg-center relative flex flex-col justify-end p-3"
              style={{
                backgroundImage: startImage
                  ? `url(${startImage})`
                  : "url('https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800')",
              }}
            >
              {/* 포커스 그리드 라인 */}
              <div className="absolute inset-4 border border-white/20 rounded-lg pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-red-500/80 rounded-full flex items-center justify-center pointer-events-none">
                <div className="w-1 h-1 rounded-full bg-red-500"></div>
              </div>

              {/* 하단 프롬프트 자막 프리뷰 */}
              <div className="bg-black/75 backdrop-blur-md p-2.5 rounded-xl border border-white/10 z-10 text-white">
                <span className="text-[8px] font-bold text-red-400 uppercase block">ACTIVE PROMPT</span>
                <p className="text-[10px] font-medium leading-tight mt-0.5 line-clamp-2">
                  {idea.trim() || "비 오는 서울 밤거리, 우산 쓴 여성과 네온사인 반사"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 1단계 프롬프트 작성 및 2단계 옵션 콘솔 (8컬럼) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1단계: 아이디어 작성 */}
          <section className="space-y-4 rounded-2xl border border-slate-700/80 bg-[#141C2E] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-black text-white">
                <span className="rounded-lg bg-red-600/20 px-2 py-0.5 text-xs text-red-400 border border-red-500/30">Step 1</span>
                영상 장면 설명 (프롬프트 아이디어)
              </h2>
            </div>

            <textarea
              id="video-idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={3}
              maxLength={1200}
              placeholder="예) 비 오는 서울 밤거리를 우산을 쓰고 천천히 걷는 여성, 네온 불빛이 젖은 바닥에 반사된다"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-xs text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none transition-all font-medium"
            />

            {/* 빠른 추천 칩 */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-red-400" /> 원클릭 추천 아이디어:
              </span>
              <div className="flex flex-wrap gap-2">
                {IDEAS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setIdea(t)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 hover:text-white hover:bg-red-950/40 border border-slate-700 hover:border-red-500/40 transition-colors"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>

            {/* 화풍 및 카메라 무빙 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-300">영상 화풍 (비주얼 스타일)</p>
                <div className="flex flex-wrap gap-1.5">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={styleId === s.id}
                      onClick={() => setStyleId(styleId === s.id ? null : s.id)}
                      className={chip(styleId === s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-300">카메라 움직임 (무빙 효과)</p>
                <div className="flex flex-wrap gap-1.5">
                  {CAMERAS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={cameraId === c.id}
                      onClick={() => setCameraId(cameraId === c.id ? null : c.id)}
                      className={chip(cameraId === c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI 설명 다듬기 패널 */}
            <div className="pt-2 border-t border-slate-700/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={polish}
                  disabled={polishing || idea.trim().length < 2}
                  className="btn-3d-red py-2 px-3.5 text-xs font-bold text-white flex items-center gap-1.5"
                >
                  {polishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {polishing ? "다듬는 중…" : polished ? "AI로 다시 다듬기" : "AI 프롬프트 자동 다듬기"}
                </button>
                <button
                  type="button"
                  onClick={() => void saveToMine()}
                  disabled={saveMine?.busy || idea.trim().length < 2}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" /> 내 프롬프트로 저장
                </button>
              </div>

              {polishError && (
                <p className="mt-2 text-xs text-rose-400 font-bold">{polishError.text}</p>
              )}

              {polished && (
                <div className="mt-3 space-y-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-bold text-red-300">
                      <input
                        type="checkbox"
                        checked={usePolished}
                        onChange={(e) => setUsePolished(e.target.checked)}
                      />
                      다듬은 영문 설명으로 만들기
                    </label>
                    <button
                      type="button"
                      onClick={() => setPolished(null)}
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      지우기
                    </button>
                  </div>
                  <textarea
                    value={polished.prompt}
                    onChange={(e) => setPolished({ ...polished, prompt: e.target.value, pick: -1 })}
                    rows={3}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200 focus:border-red-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </section>

          {/* 2단계: AI 플랫폼 & 모델 옵션 */}
          <section className="space-y-4 rounded-2xl border border-slate-700/80 bg-[#141C2E] p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-white">
              <span className="rounded-lg bg-red-600/20 px-2 py-0.5 text-xs text-red-400 border border-red-500/30">Step 2</span>
              AI 플랫폼 & 생성 옵션
            </h2>

            {/* 프로바이더 선택 */}
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PROVIDERS) as ProviderId[]).map((p) => {
                const on = providerId === p;
                const keyOk = registered ? registered.has(PROVIDERS[p].keyProvider) : null;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => pickProvider(p)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      on
                        ? "border-red-500 bg-red-950/30 shadow-sm"
                        : "border-slate-700 bg-slate-900/60 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">{PROVIDERS[p].name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${keyOk ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500"}`}>
                        {keyOk ? "연동됨" : "키 필요"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 모델 선택(v1.34 — v1.28 리뉴얼 때 빠져 업체마다 첫 모델만 쓰이던 것을 되살림) */}
            <div className="grid gap-2 sm:grid-cols-2">
              {MODELS.filter((m) => m.provider === providerId).map((m) => {
                const on = modelId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={on}
                    data-model={m.id}
                    onClick={() => { setModelId(m.id); setConfirming(false); }}
                    className={`rounded-xl border p-2.5 text-left transition-all ${on ? "border-red-500 bg-red-950/30 shadow-sm" : "border-slate-700 bg-slate-900/60 hover:border-slate-600"}`}
                  >
                    <span className="block text-xs font-black text-white">{m.name}</span>
                    <span className="block text-[11px] leading-snug text-slate-400">
                      {m.note} · 초당 약 ${m.perSec}{m.needsImage ? " · 시작 사진 필요" : " · 글만으로도 생성"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 비율 및 길이 설정 */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {model.aspects.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300">화면 비율</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAspect("9:16")}
                    className={chip(aspect === "9:16")}
                  >
                    9:16 세로 쇼츠
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspect("16:9")}
                    className={chip(aspect === "16:9")}
                  >
                    16:9 가로 와이드
                  </button>
                </div>
              </div>
              ) : (
                <p className="self-end text-[11px] leading-snug text-slate-400">이 모델은 넣은 시작 사진의 비율을 그대로 따릅니다(세로 영상은 세로 사진).</p>
              )}

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300">영상 길이</span>
                <div className="flex gap-2">
                  {model.durations.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSeconds(d)}
                      className={chip(sec === d)}
                    >
                      {d}초
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 시작/끝 사진 슬롯 */}
            <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-700/60">
              <ImageSlot label="시작 장면 사진" value={startImage} onChange={setStartImage} required={model.needsImage} />
              {model.endFrame && <ImageSlot label="끝 장면 사진(루프 영상)" value={endImage} onChange={setEndImage} />}
            </div>
          </section>

          {hasKey === false && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-amber-300">
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> {PROVIDERS[model.provider].name} 키가 아직 없습니다.
              <Link href="/settings" className="font-bold underline">API키등록·플랫폼연동</Link>에서 본인 키를 등록해 주세요.
            </p>
          )}

          {/* 3단계: 예상 비용 & 3D 엠보싱 생성 실행 버튼 */}
          <section className="p-5 rounded-2xl border border-slate-700 bg-[#141C2E] flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div>
              <p className="text-sm font-black text-white">
                예상 제작 비용: <span className="text-red-400 font-mono text-base">${cost.toFixed(2)}</span>
                <span className="text-xs text-slate-400 ml-1.5">(약 {Math.round((cost * 1400) / 10) * 10}원 · {model.name} {sec}초)</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">회원 본인의 API 키로 호출되어 비용이 투명하게 차감됩니다.</p>
            </div>

            <div>
              {confirming ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="btn-3d-red px-5 py-2.5 rounded-xl text-xs font-black text-white flex items-center gap-1.5"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    ${cost.toFixed(2)} 결제하고 생성 시작
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const why = check();
                    setError(why ? { text: why } : null);
                    if (!why) setConfirming(true);
                  }}
                  className="btn-3d-red px-6 py-3 rounded-xl text-xs font-black text-white flex items-center gap-2 shadow-xl"
                >
                  <Clapperboard className="h-4 w-4" />
                  <span>AI 비디오 생성 시작 →</span>
                </button>
              )}
            </div>
          </section>

          {hasKey === false && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-amber-300">
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> {PROVIDERS[model.provider].name} 키가 아직 없습니다.
              <Link href="/settings" className="font-bold underline">API키등록·플랫폼연동</Link>에서 본인 키를 등록해 주세요.
            </p>
          )}

          {error && (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error.text}</span>
            </div>
          )}

        </div>

      </div>

      {/* 4. 작업 결과 리스트 */}
      {results.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-slate-700/80">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>🎬</span>
              <span>방금 생성된 AI 비디오</span>
            </h2>
            <Link href="/library" className="text-xs font-bold text-red-400 hover:underline">
              내 갤러리 전체보기 →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((g) => (
              <GenerationCard key={g.id} gen={g} onDeleted={(id) => setResults((prev) => prev.filter((r) => r.id !== id))} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
