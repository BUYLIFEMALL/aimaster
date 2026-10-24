"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookmarkPlus, Check, Clapperboard, History, ImagePlus, KeyRound, Loader2, Sparkles, Wand2, X } from "lucide-react";
import { MODELS, MODEL_EXAMPLES, PROVIDERS, clampSeconds, estCostUsd, exampleSlug, pickResolution, type AspectRatio, type ProviderId, type StudioModel } from "@/lib/providers/catalog";
import type { ClientGeneration } from "@/lib/generationTypes";
import { SAFETY } from "@/lib/promptPolish";
import { CAMERAS, STYLES } from "@/lib/presets";
import { reuseFromGeneration } from "@/lib/reuse";
import { findPreset, type BoardPreset, type MinePrompt } from "@/lib/promptBoard";
import { GenerationCard } from "./GenerationCard";

const IDEAS = ["비 오는 서울 밤거리를 걷는 우산 쓴 여성", "한옥 마당에 내리는 첫눈", "바다 위로 떠오르는 일출과 갈매기", "카페 창가에서 김이 오르는 라떼", "벚꽃길을 달리는 자전거"];

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
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.9);
}

/** 모델 카드 예시 영상(v1.13) — 첫 화면 사진만 먼저 보이고, 카드에 마우스를 올리거나 그 모델을 고르면 그때 영상을 불러와 소리 없이 반복 재생 */
function ModelExample({ slug, play }: { slug: string; play: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (play) v.play().catch(() => {});
    else { v.pause(); v.currentTime = 0; }
  }, [play]);
  return (
    <video ref={ref} src={`/examples/${slug}.mp4`} poster={`/examples/${slug}.jpg`} muted loop playsInline preload="none" aria-hidden="true"
      className="aspect-video w-full rounded-lg bg-black object-cover" />
  );
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

export function CreateStudio({ fromId = null, presetId = null, mineId = null }: { fromId?: string | null; presetId?: string | null; mineId?: string | null }) {
  const [idea, setIdea] = useState("");
  // v1.19 「내 프롬프트로 저장」(본인만·30일) — 저장 상태 표시
  const [saveMine, setSaveMine] = useState<{ busy: boolean; text: string; ok: boolean } | null>(null);
  const [styleId, setStyleId] = useState<string | null>("cinematic");
  const [cameraId, setCameraId] = useState<string | null>("push");
  const [providerId, setProviderId] = useState<ProviderId>("gemini");
  const [modelId, setModelId] = useState<string>(MODELS.find((m) => m.provider === "gemini")?.id ?? MODELS[0].id);
  const [seconds, setSeconds] = useState<number>(5);
  const [aspect, setAspect] = useState<AspectRatio>("16:9");
  const [resolution, setResolution] = useState<string | null>(null);
  const [audio, setAudio] = useState(false);
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Set<string> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ text: string; keys?: boolean } | null>(null);
  const [results, setResults] = useState<ClientGeneration[]>([]);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // v1.10 영상 설명 AI 다듬기 — basis: 다듬을 때의 설명·화풍·카메라(바뀌면 「다시 다듬기」 표시)
  // options: 다듬기 3안(v1.11) · pick: 고른 안 번호(직접 고치면 그대로 둠)
  const [polished, setPolished] = useState<{ prompt: string; note: string; basis: string; options: { prompt: string; note: string }[]; pick: number } | null>(null);
  const [reuseNotice, setReuseNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [hoverModel, setHoverModel] = useState<string | null>(null);
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
  const hasGemini = registered ? registered.has("gemini") : null;

  async function polish() {
    if (idea.trim().length < 2) { setPolishError({ text: "다듬을 영상 설명을 먼저 입력해 주세요." }); return; }
    setPolishing(true);
    setPolishError(null);
    try {
      const res = await fetch("/api/prompt/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, style: STYLES.find((s) => s.id === styleId)?.text ?? null, camera: CAMERAS.find((c) => c.id === cameraId)?.text ?? null, seconds: sec, hasImage: !!startImage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.error || "설명을 다듬지 못했습니다."), { keys: !!data.needKey });
      const options: { prompt: string; note: string }[] = Array.isArray(data.options) && data.options.length ? data.options : [{ prompt: data.prompt, note: data.note ?? "" }];
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

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  // 영상 프롬프트 게시판 「이 설명으로 만들기」(v1.14) — 설명·화풍·카메라만 채우고 모델·옵션은 그대로
  // v1.19 예시는 DB(관리자 편집)에서 먼저 찾고, 못 읽으면 코드 속 예비 목록. ?mine=은 내 프롬프트(본인만)
  useEffect(() => {
    if ((!presetId && !mineId) || fromId) return;
    let alive = true;
    const apply = (p: { title: string; idea: string; styleId: string | null; cameraId: string | null }, label: string, photo: boolean) => {
      setIdea(p.idea);
      setStyleId(p.styleId && STYLES.some((s) => s.id === p.styleId) ? p.styleId : null);
      setCameraId(p.cameraId && CAMERAS.some((c) => c.id === p.cameraId) ? p.cameraId : null);
      setReuseNotice({ text: `${label} 「${p.title}」을(를) 불러왔습니다.${photo ? " 내 제품 사진을 시작 장면으로 넣으면 더 잘 나옵니다." : ""} 그대로 만들거나 「AI로 설명 다듬기」로 다듬어 보세요.`, ok: true });
    };
    fetch("/api/prompts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((j: { presets?: BoardPreset[]; mine?: MinePrompt[] } | null) => {
        if (!alive) return;
        if (mineId) {
          const m = j?.mine?.find((x) => x.id === mineId);
          if (m) apply(m, "내 프롬프트", false);
          else setReuseNotice({ text: "내 프롬프트를 찾지 못했습니다(30일이 지나 지워졌을 수 있습니다). 게시판에서 다시 골라 주세요.", ok: false });
          return;
        }
        const p = j?.presets?.find((x) => x.id === presetId) ?? findPreset(presetId);
        if (p) apply(p, "게시판 장면", p.input === "photo");
        else setReuseNotice({ text: "게시판 장면을 찾지 못했습니다. 게시판에서 다시 골라 주세요.", ok: false });
      });
    return () => { alive = false; };
  }, [presetId, mineId, fromId]);

  async function saveToMine() {
    if (idea.trim().length < 2) { setSaveMine({ busy: false, text: "저장할 영상 설명을 먼저 입력해 주세요.", ok: false }); return; }
    setSaveMine({ busy: true, text: "", ok: true });
    try {
      const res = await fetch("/api/prompts/mine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea, styleId, cameraId }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "저장하지 못했습니다.");
      setSaveMine({ busy: false, text: "내 프롬프트에 저장했습니다(30일 보관, 나만 보임).", ok: true });
    } catch (e) {
      setSaveMine({ busy: false, text: e instanceof Error ? e.message : "저장하지 못했습니다.", ok: false });
    }
  }

  // 갤러리 「이 설정으로 다시 만들기」(v1.11) — 내 기록만 불러온다(서버가 user_id로 거름). 사진은 다시 넣게 한다
  useEffect(() => {
    if (!fromId) return;
    let alive = true;
    fetch(`/api/generations?ids=${fromId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const g = (d.generations as ClientGeneration[] | undefined)?.find((x) => x.id === fromId);
        if (!g) { setReuseNotice({ text: "이전 기록을 찾지 못했습니다(30일이 지나 지워졌을 수 있습니다).", ok: false }); return; }
        const f = reuseFromGeneration(g);
        const m = MODELS.find((x) => x.id === f.model);
        const st = STYLES.some((x) => x.id === f.styleId) ? f.styleId : null;
        const cam = CAMERAS.some((x) => x.id === f.cameraId) ? f.cameraId : null;
        setIdea(f.idea);
        setStyleId(st);
        setCameraId(cam);
        if (m) { setProviderId(m.provider); setModelId(m.id); setSeconds(f.seconds); }
        if (f.aspect === "16:9" || f.aspect === "9:16") setAspect(f.aspect);
        setResolution(f.resolution);
        setAudio(f.audio);
        setPolished(f.polishedPrompt ? { prompt: f.polishedPrompt, note: "이전에 다듬어 쓴 설명입니다.", basis: `${f.idea.trim()}|${st ?? ""}|${cam ?? ""}`, options: [], pick: -1 } : null);
        setUsePolished(true);
        setReuseNotice({ text: `「${g.prompt.slice(0, 24)}…」 설정을 불러왔습니다.${m ? "" : " (지금은 없는 모델이라 모델은 다시 골라 주세요)"} 사진은 다시 넣어 주세요.`, ok: true });
      })
      .catch(() => alive && setReuseNotice({ text: "이전 기록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.", ok: false }));
    return () => { alive = false; };
  }, [fromId]);

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
        body: JSON.stringify({
          model: model.id, prompt: finalPrompt, seconds: sec, aspectRatio: aspect, resolution: pickedRes, audio: withAudio, startImage, endImage: model.endFrame ? endImage : null,
          reuse: { idea, styleId, cameraId, polishedPrompt: polishedOn && polished ? polished.prompt : undefined },
        }),
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
        {reuseNotice && (
          <p role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${reuseNotice.ok ? "border-sky-500/30 bg-sky-500/5 text-sky-100" : "border-amber-500/30 bg-amber-500/5 text-amber-200"}`}>
            <History className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {reuseNotice.text}
          </p>
        )}
        <textarea id="video-idea" value={idea} onChange={(e) => setIdea(e.target.value)} rows={3} maxLength={1200}
          placeholder="예) 비 오는 서울 밤거리를 우산을 쓰고 천천히 걷는 여성, 네온 불빛이 젖은 바닥에 비친다"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/60 focus:outline-none" />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void saveToMine()} disabled={saveMine?.busy || idea.trim().length < 2}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-200 hover:border-sky-500/50 disabled:opacity-40">
            {saveMine?.busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <BookmarkPlus className="h-3 w-3" aria-hidden="true" />} 내 프롬프트로 저장
          </button>
          {saveMine?.text && <span role="status" className={`text-[11px] ${saveMine.ok ? "text-emerald-300" : "text-amber-300"}`}>{saveMine.text}{saveMine.ok && <> · <Link href="/prompts" className="underline">게시판에서 보기</Link></>}</span>}
        </div>
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
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={polish} disabled={polishing || idea.trim().length < 2}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-100 hover:bg-sky-500/20 disabled:opacity-50">
              {polishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {polishing ? "다듬는 중…" : polished ? "AI로 다시 다듬기" : "AI로 설명 다듬기"}
            </button>
            <span className="text-[11px] text-zinc-500">본인 Gemini 키로 장면·동작·빛을 구체적인 영어 설명으로 바꿉니다(1회 1원 미만, 무료 등급 키도 가능)</span>
          </div>
          {hasGemini === false && !polishError && (
            <p className="text-[11px] text-amber-300">Gemini 키가 없습니다. <Link href="/settings" className="font-bold underline">API키등록·플랫폼연동</Link>에서 등록하면 쓸 수 있습니다.</p>
          )}
          {polishError && (
            <p role="alert" className="text-[11px] text-red-300">
              {polishError.text} {polishError.keys && <Link href="/settings" className="font-bold text-sky-200 underline">키 등록하러 가기</Link>}
            </p>
          )}
          {polished && (
            <div className="space-y-2 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-sky-100">
                  <input type="checkbox" checked={usePolished} onChange={(e) => setUsePolished(e.target.checked)} />
                  다듬은 설명으로 만들기
                </label>
                <button type="button" onClick={() => setPolished(null)} className="text-[11px] text-zinc-400 hover:text-zinc-200">지우기</button>
              </div>
              {polished.options.length > 1 && (
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="다듬은 안 고르기">
                  <span className="text-[11px] text-zinc-400">다듬은 안:</span>
                  {polished.options.map((o, i) => (
                    <button key={i} type="button" aria-pressed={polished.pick === i} onClick={() => setPolished({ ...polished, prompt: o.prompt, note: o.note, pick: i })} className={chip(polished.pick === i)}>안 {i + 1}</button>
                  ))}
                </div>
              )}
              {polished.note && <p className="text-[11px] text-sky-200/80">{polished.note}</p>}
              {polished.basis !== basis && <p className="text-[11px] text-amber-300">설명·화풍·카메라가 바뀌었습니다 — 「AI로 다시 다듬기」를 눌러 맞춰 주세요.</p>}
              <textarea aria-label="다듬은 영상 설명(영어)" value={polished.prompt} onChange={(e) => setPolished({ ...polished, prompt: e.target.value, pick: -1, note: "" })} rows={4} maxLength={1200}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 p-2.5 text-xs leading-relaxed text-zinc-100 focus:border-sky-500/60 focus:outline-none" />
            </div>
          )}
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
            const ex = exampleSlug(m.id);
            const hasEx = MODEL_EXAMPLES.has(ex);
            return (
              <button key={m.id} type="button" aria-pressed={on} data-model={m.id} onClick={() => { setModelId(m.id); setConfirming(false); }}
                onPointerEnter={() => setHoverModel(m.id)} onPointerLeave={() => setHoverModel((h) => (h === m.id ? null : h))}
                className={`flex flex-col gap-2 rounded-xl border p-3 text-left md:flex-row md:items-center md:gap-3 ${on ? "border-sky-500/60 bg-sky-500/10" : "border-zinc-800 hover:border-zinc-700"}`}>
                {/* v1.16: 데스크톱은 왼쪽 작은 썸네일(가로 128px), 휴대폰은 카드 폭 그대로 */}
                {hasEx && <span className="block w-full md:w-32 md:shrink-0"><ModelExample slug={ex} play={on || hoverModel === m.id} /></span>}
                <span className="flex w-full min-w-0 items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">{m.name}</span>
                  <span className="block text-[11px] text-zinc-500">{m.note} · 초당 약 ${m.perSec}{m.needsImage ? " · 시작 사진 필요" : " · 글만으로도 생성"}</span>
                </span>
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-sky-400 bg-sky-500 text-white" : "border-zinc-600"}`}>{on && <Check className="h-3 w-3" aria-hidden="true" />}</span>
                </span>
              </button>
            );
          })}
        </div>

        {MODELS.some((m) => m.provider === providerId && MODEL_EXAMPLES.has(exampleSlug(m.id))) && (
          <p className="text-[11px] text-zinc-500">미리보기는 모두 같은 장면(「한옥 마당에 내리는 첫눈」, 가장 짧은 길이·낮은 해상도)으로 만든 예시입니다. 실제 결과는 설명·사진·옵션에 따라 다릅니다.</p>
        )}

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
        {model.resolutions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">해상도(높을수록 비쌈)</p>
            <div className="flex flex-wrap gap-2">{model.resolutions.map((r) => <button key={r} type="button" aria-pressed={pickedRes === r} onClick={() => setResolution(r)} className={chip(pickedRes === r)}>{r}{model.perSecByRes?.[r] ? ` · 초당 $${model.perSecByRes[r]}` : ""}</button>)}</div>
          </div>
        )}
        {model.audioOption && (
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} />
            소리도 함께 만들기{model.perSecAudio ? ` (소리를 켜면 초당 ${model.perSecAudio})` : " (같은 가격)"}
          </label>
        )}
        {model.aspects.length === 0 && <p className="text-[11px] text-zinc-500">이 모델은 시작 장면 사진의 비율을 따릅니다.</p>}
        {model.fal?.t2v && !model.fal.aspect && <p className="text-[11px] text-zinc-500">시작 사진을 넣으면 사진 비율을 따르고, 사진 없이 만들 때는 고른 비율로 만듭니다.</p>}

        <div className="flex flex-wrap gap-4">
          <ImageSlot label="시작 장면 사진" value={startImage} onChange={setStartImage} required={model.needsImage} />
          {model.endFrame && <ImageSlot label="끝 장면 사진(이어지는 장면·루프)" value={endImage} onChange={setEndImage} />}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-sm text-zinc-300">
            예상 비용 <b className="text-white">약 ${cost.toFixed(2)}</b> <span className="text-zinc-500">(약 {Math.round((cost * 1400) / 10) * 10}원 · {model.name} {sec}초{pickedRes ? ` · ${pickedRes}` : ""}{withEnd ? " · 끝 장면 포함" : ""}{withAudio ? " · 소리 포함" : ""}{!startImage ? " · 글만으로" : ""})</span>
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
