"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Clapperboard, ImagePlus, KeyRound, Loader2, Sparkles, X } from "lucide-react";
import { MODELS, PROVIDERS, clampSeconds, estCostUsd, type AspectRatio, type ProviderId, type StudioModel } from "@/lib/providers/catalog";
import type { ClientGeneration } from "@/lib/generationTypes";
import { GenerationCard } from "./GenerationCard";

// 1단계 프리셋 — 영상 설명에 덧붙는 영문 지시(이 프로그램 고유 문구, 다른 프로그램과 공유하지 않음)
const STYLES = [
  { id: "cinematic", label: "시네마틱 실사", text: "cinematic live-action footage, natural light, shallow depth of field, film grain" },
  { id: "anime", label: "2D 애니메이션", text: "2D anime style animation, clean line art, vivid colors" },
  { id: "pixar", label: "3D 애니메이션", text: "3D animated film style, soft global illumination, expressive characters" },
  { id: "documentary", label: "다큐멘터리", text: "documentary style handheld footage, realistic and candid" },
  { id: "product", label: "제품 광고", text: "premium product commercial, studio lighting, clean background, slow reveal" },
  { id: "drone", label: "드론 풍경", text: "aerial drone footage, sweeping landscape, golden hour" },
];
const CAMERAS = [
  { id: "push", label: "천천히 다가가기", text: "slow push-in camera move" },
  { id: "pan", label: "좌우 팬", text: "smooth horizontal pan" },
  { id: "orbit", label: "주위 돌기", text: "slow orbit around the subject" },
  { id: "static", label: "고정 카메라", text: "static locked-off camera" },
  { id: "tracking", label: "따라가기", text: "tracking shot following the subject" },
];
const IDEAS = ["비 오는 서울 밤거리를 걷는 우산 쓴 여성", "한옥 마당에 내리는 첫눈", "바다 위로 떠오르는 일출과 갈매기", "카페 창가에서 김이 오르는 라떼", "벚꽃길을 달리는 자전거"];

function composePrompt(idea: string, styleId: string | null, cameraId: string | null): string {
  const style = STYLES.find((s) => s.id === styleId);
  const camera = CAMERAS.find((c) => c.id === cameraId);
  // 인물은 한국인으로(루트 CLAUDE.md 핵심 원칙 3), 글자·로고는 넣지 않는다
  return [idea.trim(), style?.text, camera?.text, "If people appear, depict them as Korean. No on-screen text, no subtitles, no logos."].filter(Boolean).join(". ");
}

/** 사진을 긴 변 1280px JPG로 줄여 data 주소로 만든다(서버 한도 2.5MB 안쪽) */
async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.9);
}

function ImageSlot({ label, value, onChange, required }: { label: string; value: string | null; onChange: (v: string | null) => void; required?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-zinc-300">{label}{required ? <span className="ml-1 text-amber-300">(필수)</span> : <span className="ml-1 text-zinc-500">(선택)</span>}</p>
      {value ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-28 rounded-xl border border-zinc-700 object-cover" />
          <button type="button" onClick={() => onChange(null)} aria-label={`${label} 지우기`} className="absolute -right-2 -top-2 rounded-full bg-zinc-800 p-1 text-zinc-300 hover:text-white">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label className="flex h-28 w-44 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-700 text-xs text-zinc-400 hover:border-sky-500/50 hover:text-sky-200">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-5 w-5" aria-hidden="true" />}
          사진 고르기(JPG·PNG·WEBP)
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            try { onChange(await shrinkImage(f)); } finally { setBusy(false); }
          }} />
        </label>
      )}
    </div>
  );
}

export function CreateStudio() {
  const [idea, setIdea] = useState("");
  const [styleId, setStyleId] = useState<string | null>("cinematic");
  const [cameraId, setCameraId] = useState<string | null>("push");
  const [providerId, setProviderId] = useState<ProviderId>("gemini");
  const [modelId, setModelId] = useState<string>(MODELS.find((m) => m.provider === "gemini")?.id ?? MODELS[0].id);
  const [seconds, setSeconds] = useState<number>(5);
  const [aspect, setAspect] = useState<AspectRatio>("16:9");
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Set<string> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ text: string; keys?: boolean } | null>(null);
  const [results, setResults] = useState<ClientGeneration[]>([]);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/keys", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRegistered(new Set<string>(d.registered ?? [])))
      .catch(() => setRegistered(new Set()));
  }, []);

  const model: StudioModel = useMemo(() => MODELS.find((m) => m.id === modelId) ?? MODELS[0], [modelId]);
  const sec = clampSeconds(model, seconds);
  const withEnd = !!endImage && !!startImage && model.endFrame;
  const cost = estCostUsd(model, sec, withEnd);
  const hasKey = registered ? registered.has(PROVIDERS[model.provider].keyProvider) : null;
  const finalPrompt = composePrompt(idea, styleId, cameraId);

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

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  function check(): string | null {
    if (idea.trim().length < 2) return "1단계에서 만들 영상을 설명해 주세요.";
    if (model.needsImage && !startImage) return `${model.name}은(는) 시작 장면 사진이 필요합니다.`;
    if (endImage && !startImage) return "끝 장면 사진은 시작 장면 사진과 함께 넣어 주세요.";
    return null;
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: model.id, prompt: finalPrompt, seconds: sec, aspectRatio: aspect, startImage, endImage: model.endFrame ? endImage : null }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || "생성을 시작하지 못했습니다."), { keys: !!data.missingKeys });
      const gens = data.generations as ClientGeneration[];
      setResults((prev) => [...gens, ...prev]);
      const running = gens.filter((g) => g.status === "running").map((g) => g.id);
      if (running.length) poll([...running, ...results.filter((r) => r.status === "running").map((r) => r.id)].slice(0, 12));
      setTimeout(() => document.getElementById("studio-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setError({ text: e instanceof Error ? e.message : "생성을 시작하지 못했습니다.", keys: (e as { keys?: boolean }).keys });
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  const chip = (on: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${on ? "border-sky-500/50 bg-sky-500/15 text-sky-100" : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"}`;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><Clapperboard className="h-6 w-6 text-sky-300" aria-hidden="true" /> 영상 생성 작업실</h1>
        <p className="text-sm text-zinc-400">Gemini Omni Flash·Kling·Seedance 등 여러 AI 영상 모델을 본인 키로 골라 영상을 만듭니다. 비용은 본인 계정에 직접 청구됩니다.</p>
      </header>

      {/* 1단계 */}
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-200"><span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-200">Step 1</span> 어떤 영상을 만들까요?</h2>
        <textarea id="video-idea" value={idea} onChange={(e) => setIdea(e.target.value)} rows={3} maxLength={1200}
          placeholder="예) 비 오는 서울 밤거리를 우산을 쓰고 천천히 걷는 여성, 네온 불빛이 젖은 바닥에 비친다"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/60 focus:outline-none" />
        <div className="flex flex-wrap gap-2">
          <span className="text-[11px] text-zinc-500">추천:</span>
          {IDEAS.map((t) => <button key={t} type="button" onClick={() => setIdea(t)} className="text-[11px] text-sky-300 hover:underline">#{t}</button>)}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400">화풍</p>
          <div className="flex flex-wrap gap-2">{STYLES.map((s) => <button key={s.id} type="button" aria-pressed={styleId === s.id} onClick={() => setStyleId(styleId === s.id ? null : s.id)} className={chip(styleId === s.id)}>{s.label}</button>)}</div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400">카메라 움직임</p>
          <div className="flex flex-wrap gap-2">{CAMERAS.map((c) => <button key={c.id} type="button" aria-pressed={cameraId === c.id} onClick={() => setCameraId(cameraId === c.id ? null : c.id)} className={chip(cameraId === c.id)}>{c.label}</button>)}</div>
        </div>
        {idea.trim() && <p className="rounded-xl bg-zinc-950/60 p-3 text-[11px] leading-relaxed text-zinc-500"><Sparkles className="mr-1 inline h-3 w-3 text-sky-300" aria-hidden="true" />AI에 보낼 설명: {finalPrompt}</p>}
      </section>

      {/* 2단계 */}
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-200"><span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-200">Step 2</span> 플랫폼 · 모델 · 옵션</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(PROVIDERS) as ProviderId[]).map((p) => {
            const on = providerId === p;
            const keyOk = registered ? registered.has(PROVIDERS[p].keyProvider) : null;
            return (
              <button key={p} type="button" aria-pressed={on} onClick={() => pickProvider(p)}
                className={`rounded-2xl border p-3 text-left transition-colors ${on ? "border-sky-500/60 bg-sky-500/10" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"}`}>
                <span className="flex items-center justify-between gap-2 text-sm font-bold text-white">
                  {PROVIDERS[p].name}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${keyOk ? "bg-emerald-500/15 text-emerald-300" : keyOk === false ? "bg-amber-500/15 text-amber-300" : "text-zinc-500"}`}>{keyOk ? "연동됨" : keyOk === false ? "키 필요" : ""}</span>
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-zinc-500">{PROVIDERS[p].description}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {MODELS.filter((m) => m.provider === providerId).map((m) => {
            const on = modelId === m.id;
            return (
              <button key={m.id} type="button" aria-pressed={on} data-model={m.id} onClick={() => { setModelId(m.id); setConfirming(false); }}
                className={`flex items-start justify-between gap-2 rounded-xl border p-3 text-left ${on ? "border-sky-500/60 bg-sky-500/10" : "border-zinc-800 hover:border-zinc-700"}`}>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">{m.name}</span>
                  <span className="block text-[11px] text-zinc-500">{m.note} · 초당 약 ${m.perSec}{m.needsImage ? " · 시작 사진 필요" : " · 글만으로도 생성"}</span>
                </span>
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-sky-400 bg-sky-500 text-white" : "border-zinc-600"}`}>{on && <Check className="h-3 w-3" aria-hidden="true" />}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">길이(대략 — 실제 길이는 AI가 정해 조금 다를 수 있습니다)</p>
            <div className="flex flex-wrap gap-2">{model.durations.map((d) => <button key={d} type="button" aria-pressed={sec === d} onClick={() => setSeconds(d)} className={chip(sec === d)}>{d}초</button>)}</div>
          </div>
          {model.aspects.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-300">화면 비율</p>
              <div className="flex flex-wrap gap-2">{model.aspects.map((a) => <button key={a} type="button" aria-pressed={aspect === a} onClick={() => setAspect(a)} className={chip(aspect === a)}>{a === "16:9" ? "16:9 가로" : "9:16 세로"}</button>)}</div>
            </div>
          )}
        </div>
        {model.aspects.length === 0 && <p className="text-[11px] text-zinc-500">이 모델은 시작 장면 사진의 비율을 따릅니다.</p>}

        <div className="flex flex-wrap gap-4">
          <ImageSlot label="시작 장면 사진" value={startImage} onChange={setStartImage} required={model.needsImage} />
          {model.endFrame && <ImageSlot label="끝 장면 사진(이어지는 장면·루프)" value={endImage} onChange={setEndImage} />}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-sm text-zinc-300">
            예상 비용 <b className="text-white">약 ${cost.toFixed(2)}</b> <span className="text-zinc-500">(약 {Math.round((cost * 1400) / 10) * 10}원 · {model.name} {sec}초{withEnd ? " · 끝 장면 포함" : ""})</span>
          </p>
          {confirming ? (
            <span className="flex items-center gap-2">
              <button type="button" onClick={submit} disabled={submitting} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-sky-400 disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null} 약 ${cost.toFixed(2)} 내고 만들기
              </button>
              <button type="button" disabled={submitting} onClick={() => setConfirming(false)} className="whitespace-nowrap text-sm text-zinc-400 hover:text-zinc-200">취소</button>
            </span>
          ) : (
            <button type="button" onClick={() => { const why = check(); setError(why ? { text: why } : null); if (!why) setConfirming(true); }}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-sky-400">
              <Clapperboard className="h-4 w-4" aria-hidden="true" /> 영상 만들기
            </button>
          )}
        </div>
        {hasKey === false && (
          <p className="flex flex-wrap items-center gap-2 text-xs text-amber-300">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> {PROVIDERS[model.provider].name} 키가 아직 없습니다.
            <Link href="/settings" className="font-bold underline">API키등록·플랫폼연동</Link>에서 본인 키를 등록해 주세요.
          </p>
        )}
        {error && (
          <p role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {error.text}
            {error.keys && <Link href="/settings" className="whitespace-nowrap font-bold text-sky-200 underline">키 등록하러 가기</Link>}
          </p>
        )}
      </section>

      {results.length > 0 && (
        <section id="studio-results" className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200">결과</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((g) => <GenerationCard key={g.id} gen={g} onDeleted={(id) => setResults((prev) => prev.filter((r) => r.id !== id))} />)}
          </div>
          <p className="text-xs text-zinc-500">완성된 영상은 <Link href="/library" className="text-sky-300 underline">작업 결과 갤러리</Link>에 30일 동안 보관됩니다.</p>
        </section>
      )}
    </div>
  );
}
