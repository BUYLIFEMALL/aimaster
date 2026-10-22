"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Clapperboard, Copy, Download, ImagePlus, KeyRound, Loader2, RefreshCw, Scissors, Sparkles, Video, Wand2, X } from "lucide-react";
import { DURATION_OPTIONS, type Analysis, type DialogueMode, type EngineId, type Lang, type VideoPrompts } from "@/lib/storyboard/types";
import { safeName } from "@/lib/storyboard/plan";
import { STRINGS } from "./i18n";
import { importSourceOf } from "@/lib/importSource";
import { SplitEditor } from "./SplitEditor";
import { viaSource } from "@/lib/linkMark";

type Step = "upload" | "analyze" | "render" | "prompts" | null;
interface Project {
  id: string;
  title: string;
  status: "created" | "analyzed" | "rendered" | "prompts";
  analysis: Analysis | null;
  videoPrompts: VideoPrompts | null;
  videoSettings: { duration?: number; dialogue?: DialogueMode } | null;
  topic: string;
  lang: Lang;
  engine: EngineId;
  refUrl: string | null;
  masterUrl: string | null;
}

type ApiRes<T> = { ok: boolean; status: number; data: T & { error?: string; needKey?: boolean } };
async function api<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<ApiRes<T>> {
  try {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "네트워크 오류가 발생했습니다. 연결을 확인해 주세요." } as never };
  }
}
const post = (url: string, body: unknown) => api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** 브라우저에서 긴 변 1600px JPEG로 줄인다(서버 요청 용량 제한과 업로드 시간을 줄이기 위해) */
async function shrinkImage(file: File, maxDim = 1600): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c.toDataURL("image/jpeg", 0.85);
}

function download(name: string, content: string | Blob, type = "text/plain") {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function StudioWorkspace({ projectId }: { projectId?: string }) {
  const [lang, setLang] = useState<Lang>("ko");
  const t = STRINGS[lang];
  const [engine, setEngine] = useState<EngineId>("standard");
  const [topic, setTopic] = useState("");
  const [preview, setPreview] = useState<string | null>(null); // 줄인 업로드 이미지(data URL)
  const [project, setProject] = useState<Project | null>(null);
  const [step, setStep] = useState<Step>(null);
  const [error, setError] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [importVia, setImportVia] = useState<ReturnType<typeof viaSource>>(undefined);
  const [needKey, setNeedKey] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [duration, setDuration] = useState<number>(10);
  const [dialogue, setDialogue] = useState<DialogueMode>("none");
  const [splitOpen, setSplitOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const promptsRef = useRef<HTMLDivElement>(null);
  const busy = step !== null;

  const loadProject = useCallback(async (id: string) => {
    const r = await api<{ project: Project }>(`/api/projects/${id}`);
    if (r.ok) {
      const p = r.data.project;
      setProject(p);
      setLang(p.lang);
      setEngine(p.engine);
      setTopic(p.topic);
      if (p.videoSettings?.duration) setDuration(p.videoSettings.duration);
      if (p.videoSettings?.dialogue) setDialogue(p.videoSettings.dialogue);
      setPreview(p.refUrl);
    } else setError(r.data.error ?? "프로젝트를 불러오지 못했습니다.");
  }, []);

  useEffect(() => {
    if (projectId) void loadProject(projectId);
  }, [projectId, loadProject]);

  // 다른 프로그램(AI 바나나 캔버스) 결과를 참고 이미지로 받기(?src=서명 주소, v1.11) — 직접 고른 파일과 같은 pickFile 흐름
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const src = params.get("src");
    // v1.12: 보낸 프로그램(`?via=`, 공용 `link-mark` 이름표에 있는 것만) — 안내 옆 돌아가기 링크
    const via = viaSource(params.get("via"));
    if (!src) return;
    window.history.replaceState(null, "", window.location.pathname);
    const from = importSourceOf(src, process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (!from) { setError("가져올 수 없는 이미지 주소입니다. 보낸 프로그램에서 다시 「스토리보드로」를 눌러 주세요."); return; }
    (async () => {
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        if (!res.ok || !blob.type.startsWith("image/")) throw new Error();
        const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1] || "png";
        await pickFile(new File([blob], `reference.${ext}`, { type: blob.type }));
        setImportNote(`${from} 결과를 참고 이미지로 넣었습니다. 주제를 적고 스토리보드를 만들어 보세요.`);
        setImportVia(via);
      } catch {
        setError(`이미지를 불러오지 못했습니다(주소는 1시간 뒤 만료됩니다). ${from}에서 다시 보내 주세요.`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fail(r: ApiRes<unknown>) {
    if (r.data.needKey) setNeedKey(true);
    else setError(r.data.error ?? "처리에 실패했습니다.");
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError(t.notImage);
    if (file.size > 15 * 1024 * 1024) return setError(t.tooBig);
    setError(null);
    try {
      setPreview(await shrinkImage(file));
      setProject(null); // 새 이미지 = 새 프로젝트
    } catch {
      setError(lang === "ko" ? "이미지를 읽지 못했습니다. 다른 파일을 시도해 주세요." : "Could not read the image.");
    }
  }

  async function suggestTopic() {
    if (!preview || preview.startsWith("http")) return;
    setSuggesting(true);
    setError(null);
    const r = await post("/api/topic-suggest", { image: preview, topic, lang });
    setSuggesting(false);
    if (r.ok) setTopic(String((r.data as { topic?: string }).topic ?? ""));
    else fail(r);
  }

  /** 현재 상태부터 이어서: (프로젝트 만들기) → 분석 → 마스터 이미지 */
  async function run(force: "analyze" | "render" | null = null) {
    setError(null);
    let p = project;
    if (!p) {
      if (!preview || preview.startsWith("http")) return;
      setStep("upload");
      const c = await post("/api/projects", { image: preview, topic, lang, engine });
      if (!c.ok) {
        setStep(null);
        return fail(c);
      }
      p = { id: (c.data as { id: string }).id, title: "", status: "created", analysis: null, videoPrompts: null, videoSettings: null, topic, lang, engine, refUrl: preview, masterUrl: null };
      setProject(p);
    }
    const id = p.id;
    if (force === "analyze" || p.status === "created") {
      setStep("analyze");
      const a = await post(`/api/projects/${id}/analyze`, { topic, lang });
      if (!a.ok) {
        setStep(null);
        return fail(a);
      }
      p = { ...p, status: "analyzed", analysis: (a.data as { analysis: Analysis }).analysis, title: (a.data as { title: string }).title, masterUrl: null, videoPrompts: null };
      setProject(p);
    }
    if (force === "render" || force === "analyze" || p.status === "analyzed") {
      setStep("render");
      const r = await post(`/api/projects/${id}/render`, { engine });
      if (!r.ok) {
        setStep(null);
        return fail(r);
      }
      p = { ...p, status: "rendered", masterUrl: (r.data as { masterUrl: string }).masterUrl, videoPrompts: null, engine };
      setProject(p);
    }
    setStep(null);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
  }

  async function makePrompts() {
    if (!project) return;
    setError(null);
    setStep("prompts");
    const r = await post(`/api/projects/${project.id}/video-prompts`, { duration, dialogue });
    setStep(null);
    if (!r.ok) return fail(r);
    setProject({ ...project, status: "prompts", videoPrompts: (r.data as { videoPrompts: VideoPrompts }).videoPrompts, videoSettings: { duration, dialogue } });
    setTimeout(() => promptsRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setError(lang === "ko" ? "복사하지 못했습니다. 브라우저 권한을 확인해 주세요." : "Could not copy.");
    }
  }

  function reset() {
    setProject(null);
    setPreview(null);
    setTopic("");
    setError(null);
    if (projectId) window.history.replaceState(null, "", "/studio");
  }

  const stepLabel = step === "upload" ? t.stepUpload : step === "analyze" ? t.stepAnalyze : step === "render" ? t.stepRender : step === "prompts" ? t.stepPrompts : "";
  const analysis = project?.analysis ?? null;
  const card = "rounded-2xl border border-slate-800 bg-[#131926] p-5 shadow-xl";
  const h4 = "mb-1 text-xs font-bold uppercase tracking-wider text-slate-400";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-slate-100">
            <Clapperboard size={22} className="text-amber-500" />
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {project && (
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-slate-700 bg-[#182030] px-3.5 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-[#222c42]"
            >
              {t.newProject}
            </button>
          )}
          <div className="flex rounded-xl border border-slate-800 bg-[#0e131f] p-1 text-xs font-bold">
            {(["ko", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  lang === l ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {l === "ko" ? "한국어" : "English"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {importNote && !error && (
        <div role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {importNote}
          {importVia && <> <a href={importVia.url} data-via-back className="font-bold underline underline-offset-2 whitespace-nowrap">↩ {importVia.name}로 돌아가기</a></>}
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <span className="flex gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-400" />
            <span className="whitespace-pre-line">{error}</span>
          </span>
          <button type="button" onClick={() => setError(null)} aria-label={t.close} className="text-rose-400 hover:text-rose-200">
            <X size={16} />
          </button>
        </div>
      )}

      {/* 1) 업로드·주제·엔진 */}
      <section className={card}>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => !busy && fileRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!busy) void pickFile(e.dataTransfer.files?.[0]);
              }}
              className="relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-700 bg-[#0e131f] transition hover:border-amber-500/60"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="reference" className="h-full w-full object-contain" />
              ) : (
                <div className="px-4 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#182030] text-amber-400">
                    <ImagePlus size={20} />
                  </div>
                  <p className="text-sm font-bold text-slate-200">{t.uploadTitle}</p>
                  <p className="mt-1 text-xs text-slate-400">{t.uploadDesc}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{t.uploadHint}</p>
                </div>
              )}
              {preview && !busy && (
                <span className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-1 text-[11px] font-bold text-white backdrop-blur">
                  {t.changeImage}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-300">{t.topicLabel}</label>
              <div className="flex gap-2">
                <input
                  value={topic}
                  maxLength={300}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t.topicPlaceholder}
                  className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#182030] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-400 outline-none transition focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={suggestTopic}
                  disabled={suggesting || busy || !preview || preview.startsWith("http")}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-bold text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-40"
                >
                  {suggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {t.suggest}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-bold text-slate-300">{t.engineLabel}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["standard", t.engineStandard, t.engineStandardDesc],
                  ["pro", t.enginePro, t.engineProDesc],
                ] as const).map(([id, name, desc]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setEngine(id)}
                    disabled={busy}
                    className={`rounded-2xl border p-3.5 text-left transition ${
                      engine === id
                        ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                        : "border-slate-800 bg-[#0e131f] text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <p className="text-sm font-bold flex items-center justify-between">
                      <span>{name}</span>
                      {id === "pro" && (
                        <span className="rounded bg-gradient-to-r from-amber-500 to-amber-600 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                          PRO 2K
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => run(project && (project.status === "rendered" || project.status === "prompts") ? "render" : null)}
              disabled={busy || (!project && (!preview || preview.startsWith("http")))}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition hover:from-amber-400 hover:to-amber-500 disabled:bg-slate-800 disabled:text-slate-400 disabled:shadow-none"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
              {busy ? stepLabel : project && project.status !== "created" && project.status !== "analyzed" ? t.rerender : project?.status === "analyzed" ? t.retry : t.generate}
            </button>
            {busy && <p className="text-center text-xs text-amber-400">{stepLabel}</p>}
          </div>
        </div>
      </section>

      {/* 2) 결과 */}
      {(analysis || project?.masterUrl) && (
        <div ref={resultRef} className="space-y-6">
          {project?.masterUrl && (
            <section className={card}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-100">
                <ImagePlus size={16} className="text-amber-500" />
                {t.master}
              </h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={project.masterUrl} alt="master contact sheet" className="w-full rounded-2xl border border-slate-800 shadow-2xl" />
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    const b = await (await fetch(project.masterUrl!)).blob();
                    download(`${safeName(project.title)}_master.jpg`, b);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#182030] px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-[#222c42]"
                >
                  <Download size={14} className="text-amber-400" /> {t.saveImage}
                </button>
                <button
                  type="button"
                  onClick={() => setSplitOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#182030] px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-[#222c42]"
                >
                  <Scissors size={14} className="text-amber-400" /> {t.splitImage}
                </button>
                <button
                  type="button"
                  onClick={() => run("render")}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#182030] px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-[#222c42] disabled:opacity-50"
                >
                  <RefreshCw size={14} /> {t.rerender}
                </button>
              </div>

              {/* 비디오 프롬프트 설정 박스 */}
              <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0e131f] p-5">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-100">
                  <Video size={16} className="text-amber-500" />
                  {t.videoSettings}
                </p>
                <div className="flex flex-wrap items-end gap-5">
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase text-slate-400">{t.duration}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {DURATION_OPTIONS.map((d) => (
                        <button
                          key={d.seconds}
                          type="button"
                          onClick={() => setDuration(d.seconds)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                            duration === d.seconds
                              ? "border-amber-500 bg-amber-500 text-slate-950 font-black shadow"
                              : "border-slate-800 bg-[#182030] text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase text-slate-400">{t.dialogue}</p>
                    <div className="flex gap-1.5">
                      {([["none", t.dialogueNone], ["ko", "KR"], ["en", "EN"]] as const).map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setDialogue(v)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                            dialogue === v
                              ? "border-amber-500 bg-amber-500 text-slate-950 font-black shadow"
                              : "border-slate-800 bg-[#182030] text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={makePrompts}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50"
                  >
                    {step === "prompts" ? <Loader2 size={15} className="animate-spin" /> : <Video size={15} />}
                    {project.videoPrompts ? t.regenerate : t.videoPrompts}
                  </button>
                </div>
              </div>
            </section>
          )}

          {project?.videoPrompts && (
            <section ref={promptsRef} className={card}>
              <h2 className="mb-4 text-sm font-black text-slate-100">{t.promptsTitle}</h2>
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.masterPrompt}</h3>
                    <button
                      type="button"
                      onClick={() => copy(JSON.stringify(project.videoPrompts!.masterPrompt, null, 2), "master")}
                      className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                    >
                      {copied === "master" ? <Check size={13} /> : <Copy size={13} />} {copied === "master" ? t.copied : t.copy}
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {(["style", "character", "environment"] as const).map((k) => (
                      <div key={k} className="rounded-2xl border border-slate-800 bg-[#0e131f] p-3.5">
                        <p className={h4}>{k}</p>
                        <p className="text-xs leading-relaxed text-slate-300">{project.videoPrompts!.masterPrompt[k]}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{t.sceneList}</h3>
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="bg-[#0e131f] text-[11px] uppercase text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2.5">ID</th>
                          <th className="px-3 py-2.5">Duration</th>
                          <th className="px-3 py-2.5">Shot</th>
                          <th className="px-3 py-2.5">Prompt</th>
                          {project.videoPrompts.scenes.some((s) => s.dialogue) && <th className="px-3 py-2.5">Dialogue</th>}
                          <th className="px-3 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-[#131926]">
                        {project.videoPrompts.scenes.map((s, i) => (
                          <tr key={s.id + i} className="align-top hover:bg-[#182030]/50 transition">
                            <td className="px-3 py-2.5 font-mono text-xs font-bold text-amber-400">{s.id}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-400">{s.duration}</td>
                            <td className="px-3 py-2.5 font-bold text-slate-200">{s.shotType}</td>
                            <td className="px-3 py-2.5 leading-relaxed text-slate-300">{s.prompt}</td>
                            {project.videoPrompts!.scenes.some((x) => x.dialogue) && <td className="px-3 py-2.5 text-slate-400">{s.dialogue || "-"}</td>}
                            <td className="px-3 py-2.5">
                              <button
                                type="button"
                                onClick={() => copy(s.prompt, `s${i}`)}
                                aria-label={t.copy}
                                className="text-slate-400 hover:text-amber-400 transition"
                              >
                                {copied === `s${i}` ? <Check size={15} className="text-amber-400" /> : <Copy size={15} />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.jsonData}</h3>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => download(`${safeName(project.title)}_video_prompts.json`, JSON.stringify(project.videoPrompts, null, 2), "application/json")}
                        className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                      >
                        <Download size={13} /> {t.downloadJson}
                      </button>
                      <button
                        type="button"
                        onClick={() => copy(JSON.stringify(project.videoPrompts, null, 2), "json")}
                        className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                      >
                        {copied === "json" ? <Check size={13} /> : <Copy size={13} />} {copied === "json" ? t.copied : t.copy}
                      </button>
                    </div>
                  </div>
                  <pre className="max-h-72 overflow-auto rounded-2xl border border-slate-800 bg-[#070a0f] p-4 font-mono text-xs leading-relaxed text-emerald-400">{JSON.stringify(project.videoPrompts, null, 2)}</pre>
                </div>
              </div>
            </section>
          )}

          {analysis && (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className={card}>
                <h2 className="mb-3 text-sm font-black text-slate-100">{t.breakdown}</h2>
                <div className="space-y-4">
                  <div>
                    <p className={h4}>{t.environment}</p>
                    <p className="text-xs leading-relaxed text-slate-300">{analysis.sceneBreakdown.environment}</p>
                  </div>
                  <div>
                    <p className={h4}>{t.subjects}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.sceneBreakdown.subjects.map((s, i) => (
                        <span key={i} className="rounded-lg border border-slate-800 bg-[#0e131f] px-2 py-1 text-xs text-slate-300">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={h4}>{t.anchors}</p>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-slate-300">
                      {analysis.sceneBreakdown.visualAnchors.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </div>
              </section>

              <section className={card}>
                <h2 className="mb-3 text-sm font-black text-slate-100">{t.storyTitle}</h2>
                <div className="space-y-4">
                  <div>
                    <p className={h4}>{t.logline}</p>
                    <p className="text-sm font-bold leading-snug text-amber-400">“{analysis.story.logline}”</p>
                  </div>
                  <div>
                    <p className={h4}>{t.theme}</p>
                    <p className="text-xs text-slate-300">{analysis.story.theme}</p>
                  </div>
                  <div>
                    <p className={h4}>{t.arc}</p>
                    <ol className="space-y-1.5 text-xs text-slate-300">
                      {analysis.story.emotionalArc.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </section>

              <section className={`${card} lg:col-span-2`}>
                <h2 className="mb-3 text-sm font-black text-slate-100">{t.approach}</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {([[t.shotProg, analysis.cinematicApproach.shotProgression], [t.cameraMove, analysis.cinematicApproach.cameraMovement], [t.lens, analysis.cinematicApproach.lensAndExposure], [t.lightColor, analysis.cinematicApproach.lightAndColor]] as const).map(([label, v]) => (
                    <div key={label} className="rounded-xl border border-slate-800 bg-[#0e131f] p-3">
                      <p className={h4}>{label}</p>
                      <p className="text-xs leading-relaxed text-slate-300">{v}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className={`${card} lg:col-span-2`}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-100">{t.keyframes}</h2>
                  <button type="button" onClick={() => run("analyze")} disabled={busy} className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 disabled:opacity-50">
                    <RefreshCw size={13} /> {t.reanalyze}
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {analysis.keyframes.map((k, i) => (
                    <div key={i} className="rounded-2xl border border-slate-800 bg-[#0e131f] p-3.5 transition hover:border-slate-700">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-amber-400">{k.number}</span>
                        <span className="rounded bg-[#182030] px-1.5 py-0.5 text-[10px] font-bold text-slate-300">{k.duration} · {k.shotType}</span>
                      </div>
                      <p className="mb-1 text-xs font-bold leading-snug text-slate-100">{k.action}</p>
                      <p className="mb-2 text-[11px] leading-relaxed text-slate-400">{k.composition}</p>
                      <p className="text-[11px] leading-relaxed text-slate-400">{k.camera}</p>
                      <p className="text-[11px] leading-relaxed text-slate-400">{k.lighting}</p>
                      {k.sound && <p className="text-[11px] leading-relaxed text-amber-400/80">♪ {k.sound}</p>}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {splitOpen && project?.masterUrl && <SplitEditor imageUrl={project.masterUrl} title={project.title} lang={lang} onClose={() => setSplitOpen(false)} />}

      {needKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setNeedKey(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#131926] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2 text-base font-bold text-slate-100">
              <KeyRound size={18} className="text-amber-400" />
              {t.needKeyTitle}
            </div>
            <p className="mb-5 text-xs leading-relaxed text-slate-400">{t.needKeyBody}</p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setNeedKey(false)}
                className="rounded-xl border border-slate-700 bg-[#182030] px-4 py-2 text-xs font-bold text-slate-300 hover:bg-[#202b40]"
              >
                {t.close}
              </button>
              <Link
                href="/settings"
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
              >
                {t.goSettings}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
