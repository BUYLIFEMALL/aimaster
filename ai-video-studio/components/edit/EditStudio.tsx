"use client";

// 2차 영상 합치기 작업실 — 갤러리 클립·내 PC 영상 + 음악 + 자막을 회원 브라우저에서 한 편의 MP4로 렌더한다(서버 비용 0).
// 플랜: docs/PLAN_20261023_EDIT_STUDIO.md. 시간 계산은 lib/edit/timeline.ts, 그리기는 Composition.tsx, R1 대책은 probe.tsx.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Player } from "@remotion/player";
import { renderMediaOnWeb } from "@remotion/web-renderer";
import { ArrowDown, ArrowUp, Download, Film, Layers, Loader2, Music, Trash2, Upload } from "lucide-react";
import { EditComposition } from "@/components/edit/Composition";
import { probeClip, readDuration, reencodeSoftware } from "@/components/edit/probe";
import type { ClientGeneration } from "@/lib/generationTypes";
import {
  CAPTION_STYLE_NAMES, FPS, MAX_CLIPS, clipSeconds, dimensions, layout, outputFileName, totalSeconds, validate,
  type CaptionPosition, type CaptionStyle, type EditAspect, type EditClip, type EditProject, type EditQuality, type Transition,
} from "@/lib/edit/timeline";

type Song = { ref: string; title: string; model: string; durationS: number | null; instrumental: boolean; url: string | null; tooBig: boolean };
type Adding = { name: string; msg: string } | null;
type RenderState = { progress: number; ctrl: AbortController } | null;

const INITIAL: EditProject = { clips: [], aspect: "9:16", quality: "720p", transition: "fade", captionPosition: "bottom", captionStyle: "band", clipAudio: false, music: null };
const ASPECTS: { id: EditAspect; label: string }[] = [{ id: "9:16", label: "9:16 세로(쇼츠·릴스)" }, { id: "16:9", label: "16:9 가로" }, { id: "1:1", label: "1:1 정사각" }];
const POSITIONS: { id: CaptionPosition; label: string }[] = [{ id: "top", label: "위" }, { id: "middle", label: "가운데" }, { id: "bottom", label: "아래" }];
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const sec = (n: number) => `${Math.round(n * 10) / 10}초`;
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("파일을 받지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요(받기 주소는 1시간 동안만 유효합니다).");
  return res.blob();
}

export function EditStudio() {
  const params = useSearchParams();
  const [project, setProject] = useState<EditProject>(INITIAL);
  const [gallery, setGallery] = useState<ClientGeneration[] | null>(null);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [songAppUrl, setSongAppUrl] = useState("https://ai-music-studio.buylife.xyz");
  const [adding, setAdding] = useState<Adding>(null);
  const [error, setError] = useState("");
  const [render, setRender] = useState<RenderState>(null);
  const [result, setResult] = useState<{ url: string; mb: number; seconds: number } | null>(null);
  const [canRender, setCanRender] = useState(true);
  const autoAdded = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const musicInput = useRef<HTMLInputElement>(null);

  const patch = (p: Partial<EditProject>) => setProject((cur) => ({ ...cur, ...p }));
  const patchClip = (id: string, p: Partial<EditClip>) => setProject((cur) => ({ ...cur, clips: cur.clips.map((c) => (c.id === id ? { ...c, ...p } : c)) }));

  useEffect(() => {
    const check = () => setCanRender(window.innerWidth >= 768 && "VideoEncoder" in window);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    fetch("/api/generations", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setGallery(((j.generations ?? []) as ClientGeneration[]).filter((g) => g.status === "completed" && g.outputs[0]?.url)))
      .catch(() => setGallery([]));
    fetch("/api/edit/songs", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setSongs(j.songs ?? []); if (j.appUrl) setSongAppUrl(j.appUrl); })
      .catch(() => setSongs([]));
  }, []);

  /** 영상 하나 넣기 — 길이 읽기 → 앞부분 시험 렌더(R1) → 멈추면 소프트웨어로 다시 인코딩 */
  const addVideo = useCallback(async (getBlob: () => Promise<Blob>, name: string, caption = "") => {
    setError("");
    setAdding({ name, msg: "영상 받는 중" });
    let url = "";
    try {
      let blob = await getBlob();
      if (blob.size > MAX_VIDEO_BYTES) throw new Error("200MB가 넘는 영상은 넣을 수 없습니다.");
      const duration = await readDuration(blob);
      if (!Number.isFinite(duration) || duration <= 0) throw new Error("영상 길이를 읽지 못했습니다. MP4 영상을 넣어 주세요.");
      setAdding({ name, msg: "영상 형식 확인 중" });
      url = URL.createObjectURL(blob);
      if (!(await probeClip(url))) {
        URL.revokeObjectURL(url);
        url = "";
        setAdding({ name, msg: "형식 맞추는 중 0%" });
        blob = await reencodeSoftware(blob, (p) => setAdding({ name, msg: `형식 맞추는 중 ${Math.round(p * 100)}%` }));
        url = URL.createObjectURL(blob);
        if (!(await probeClip(url))) throw new Error("이 영상은 형식을 맞춰도 합치기에 쓸 수 없습니다. 다른 영상을 넣어 주세요.");
      }
      const clip: EditClip = { id: newId(), src: url, name, duration, trimStart: 0, trimEnd: 0, caption };
      setProject((cur) => (cur.clips.length >= MAX_CLIPS ? cur : { ...cur, clips: [...cur.clips, clip] }));
      setResult(null);
    } catch (e) {
      if (url) URL.revokeObjectURL(url);
      setError(e instanceof Error ? e.message : "영상을 넣지 못했습니다.");
    } finally {
      setAdding(null);
    }
  }, []);

  const addGallery = useCallback((g: ClientGeneration) => {
    const url = g.outputs[0]?.url;
    if (!url) return;
    void addVideo(() => fetchBlob(url), `${g.modelName} · ${g.prompt.slice(0, 24)}`);
  }, [addVideo]);

  // 갤러리 카드 「합치기에 넣기」 → /edit?add=<생성 번호>
  useEffect(() => {
    const id = params?.get("add");
    if (!id || !gallery || autoAdded.current) return;
    autoAdded.current = true;
    const g = gallery.find((x) => x.id === id);
    if (g) addGallery(g);
  }, [params, gallery, addGallery]);

  function onFiles(files: FileList | null) {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("video/"));
    if (fileInput.current) fileInput.current.value = "";
    void (async () => { for (const f of list) await addVideo(async () => f, f.name); })();
  }

  function removeClip(id: string) {
    setProject((cur) => {
      const c = cur.clips.find((x) => x.id === id);
      if (c) URL.revokeObjectURL(c.src);
      return { ...cur, clips: cur.clips.filter((x) => x.id !== id) };
    });
    setResult(null);
  }

  function moveClip(id: string, dir: -1 | 1) {
    setProject((cur) => {
      const i = cur.clips.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cur.clips.length) return cur;
      const clips = [...cur.clips];
      [clips[i], clips[j]] = [clips[j], clips[i]];
      return { ...cur, clips };
    });
  }

  async function setMusic(getBlob: () => Promise<Blob>, name: string) {
    setError("");
    setAdding({ name, msg: "음악 받는 중" });
    try {
      const blob = await getBlob();
      if (project.music) URL.revokeObjectURL(project.music.src);
      patch({ music: { src: URL.createObjectURL(blob), name, volume: 0.8, fadeOut: true } });
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "음악을 넣지 못했습니다.");
    } finally {
      setAdding(null);
    }
  }

  async function startRender() {
    const problem = validate(project);
    if (problem) { setError(problem); return; }
    setError("");
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    const ctrl = new AbortController();
    setRender({ progress: 0, ctrl });
    try {
      const { width, height } = dimensions(project.aspect, project.quality);
      const { totalFrames } = layout(project);
      const out = await renderMediaOnWeb({
        composition: { component: EditComposition, id: "ai-video-edit", width, height, fps: FPS, durationInFrames: totalFrames, defaultProps: { project } },
        inputProps: { project },
        signal: ctrl.signal,
        onProgress: (p) => setRender((cur) => (cur ? { ...cur, progress: p.progress } : cur)),
        videoBitrate: "high",
        delayRenderTimeoutInMilliseconds: 60_000,
        logLevel: "error",
      });
      const blob = await out.getBlob();
      setResult({ url: URL.createObjectURL(blob), mb: Math.round(blob.size / 104857.6) / 10, seconds: totalFrames / FPS });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (ctrl.signal.aborted) setError("렌더를 멈췄습니다.");
      else if (/delayRender|timeout|Extracting frame/i.test(msg)) setError("영상 한 개의 형식 때문에 렌더가 멈췄습니다. 그 영상을 빼고 다시 넣은 뒤(형식 자동 맞추기) 다시 시도해 주세요.");
      else setError("렌더하지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요. 계속되면 클립 수를 줄이거나 720p로 바꿔 주세요.");
    } finally {
      setRender(null);
    }
  }

  const { width, height } = dimensions(project.aspect, project.quality);
  const { totalFrames } = useMemo(() => layout(project), [project]);
  const total = totalSeconds(project);
  const busy = Boolean(adding || render);
  const chip = (on: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${on ? "border-sky-500/50 bg-sky-500/15 text-sky-100" : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"}`;
  const card = "space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5";
  const stepTitle = (n: number, text: string) => (
    <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-200"><span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-200">Step {n}</span> {text}</h2>
  );
  const previewWidth = project.aspect === "9:16" ? "max-w-[300px]" : project.aspect === "1:1" ? "max-w-[420px]" : "max-w-[640px]";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><Layers className="h-6 w-6 text-sky-300" aria-hidden="true" /> 영상 합치기</h1>
        <p className="text-sm text-zinc-400">만든 영상 여러 개에 음악과 자막을 얹어 한 편으로 만듭니다. 렌더는 내 PC 브라우저에서 해서 비용이 들지 않습니다.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {adding && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {adding.name} — {adding.msg}
        </p>
      )}

      {/* 1단계: 영상 넣기 */}
      <section className={card}>
        {stepTitle(1, "합칠 영상 넣기")}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy || project.clips.length >= MAX_CLIPS} onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-40">
            <Upload className="h-4 w-4" aria-hidden="true" /> 내 PC 영상 올리기
          </button>
          <input ref={fileInput} type="file" accept="video/mp4,video/quicktime,video/webm" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
          <span className="text-[11px] text-zinc-500">영상은 서버에 올라가지 않고 이 브라우저 안에서만 씁니다 · 최대 {MAX_CLIPS}개 · 총 3분</span>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-300">내 작업 결과 갤러리</p>
          {gallery === null ? (
            <p className="text-xs text-zinc-500">불러오는 중…</p>
          ) : gallery.length === 0 ? (
            <p className="text-xs text-zinc-500">아직 완성된 영상이 없습니다. 영상 생성 작업실에서 먼저 만들어 주세요.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {gallery.map((g) => (
                <button key={g.id} type="button" disabled={busy || project.clips.length >= MAX_CLIPS} onClick={() => addGallery(g)}
                  className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 text-left hover:border-sky-500/50 disabled:opacity-40">
                  <video src={g.outputs[0]?.url ?? undefined} muted playsInline preload="metadata" className="aspect-video w-full bg-black object-cover" />
                  <span className="block truncate px-2 py-1.5 text-[11px] text-zinc-300">+ {g.modelName} · {g.duration_s}초</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2단계: 순서·자르기·자막 */}
      <section className={card}>
        {stepTitle(2, `순서·자르기·자막 (${project.clips.length}개 · 총 ${sec(total)})`)}
        {project.clips.length === 0 ? (
          <p className="text-sm text-zinc-500">Step 1에서 영상을 넣으면 여기에 순서대로 놓입니다.</p>
        ) : (
          <ol className="space-y-2">
            {project.clips.map((c, i) => (
              <li key={c.id} className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">{i + 1}</span>
                  <p className="min-w-0 flex-1 truncate text-sm text-zinc-200" title={c.name}>{c.name}</p>
                  <span className="text-[11px] text-zinc-500">{sec(clipSeconds(c))} / 원본 {sec(c.duration)}</span>
                  <button type="button" aria-label="앞으로" disabled={busy || i === 0} onClick={() => moveClip(c.id, -1)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label="뒤로" disabled={busy || i === project.clips.length - 1} onClick={() => moveClip(c.id, 1)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" aria-label="빼기" disabled={busy} onClick={() => removeClip(c.id)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="grid gap-2 sm:grid-cols-[auto_auto_1fr]">
                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">앞 자르기
                    <input type="number" min={0} step={0.1} value={c.trimStart} disabled={busy} onChange={(e) => patchClip(c.id, { trimStart: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100" />초
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">뒤 자르기
                    <input type="number" min={0} step={0.1} value={c.trimEnd} disabled={busy} onChange={(e) => patchClip(c.id, { trimEnd: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100" />초
                  </label>
                  <input type="text" value={c.caption} maxLength={60} disabled={busy} placeholder="이 장면 자막(선택)" onChange={(e) => patchClip(c.id, { caption: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/60 focus:outline-none" />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 3단계: 배경음악 */}
      <section className={card}>
        {stepTitle(3, "배경음악 (선택)")}
        {project.music ? (
          <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-sky-300" aria-hidden="true" />
              <p className="min-w-0 flex-1 truncate text-sm text-zinc-200">{project.music.name}</p>
              <button type="button" disabled={busy} onClick={() => { if (project.music) URL.revokeObjectURL(project.music.src); patch({ music: null }); }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30" aria-label="음악 빼기"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-[11px] text-zinc-400">음량
                <input type="range" min={0} max={1} step={0.05} value={project.music.volume} disabled={busy}
                  onChange={(e) => project.music && patch({ music: { ...project.music, volume: Number(e.target.value) } })} />
                {Math.round(project.music.volume * 100)}%
              </label>
              <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={project.music.fadeOut} disabled={busy} onChange={(e) => project.music && patch({ music: { ...project.music, fadeOut: e.target.checked } })} />
                끝 1초 서서히 줄이기
              </label>
            </div>
            <p className="text-[11px] text-zinc-500">음악이 영상보다 길면 영상 길이에 맞춰 잘립니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={busy} onClick={() => musicInput.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-40">
                <Upload className="h-4 w-4" aria-hidden="true" /> 내 PC 음악 파일
              </button>
              <input ref={musicInput} type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void setMusic(async () => f, f.name); }} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-300">🎧 AI 음악 스튜디오 내 곡</p>
              {songs === null ? (
                <p className="text-xs text-zinc-500">불러오는 중…</p>
              ) : songs.length === 0 ? (
                <p className="text-xs text-zinc-500">아직 만든 곡이 없습니다. <a href={songAppUrl} target="_blank" rel="noreferrer" className="text-sky-300 underline">AI 음악 스튜디오</a>에서 곡을 만들면 여기서 바로 고를 수 있습니다.</p>
              ) : (
                <ul className="max-h-56 space-y-1 overflow-y-auto">
                  {songs.map((s) => (
                    <li key={s.ref} className="flex items-center gap-2 rounded-lg border border-zinc-800 px-2.5 py-1.5">
                      <p className="min-w-0 flex-1 truncate text-xs text-zinc-200" title={s.title}>{s.title}</p>
                      <span className="text-[11px] text-zinc-500">{s.instrumental ? "연주곡" : "노래"}{s.durationS ? ` · ${s.durationS}초` : ""}</span>
                      <button type="button" disabled={busy || !s.url || s.tooBig} onClick={() => s.url && void setMusic(() => fetchBlob(s.url as string), `${s.title} (AI 음악 스튜디오)`)}
                        className="rounded-lg border border-sky-500/40 px-2 py-1 text-[11px] text-sky-200 hover:bg-sky-500/10 disabled:opacity-40">고르기</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 4단계: 화면·자막 모양 + 미리보기 + 만들기 */}
      <section className={card}>
        {stepTitle(4, "화면 설정 · 미리보기 · 만들기")}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">화면 비율</p>
            <div className="flex flex-wrap gap-2">{ASPECTS.map((a) => <button key={a.id} type="button" disabled={busy} className={chip(project.aspect === a.id)} onClick={() => patch({ aspect: a.id })}>{a.label}</button>)}</div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">화질</p>
            <div className="flex flex-wrap gap-2">{(["720p", "1080p"] as EditQuality[]).map((q) => <button key={q} type="button" disabled={busy} className={chip(project.quality === q)} onClick={() => patch({ quality: q })}>{q}{q === "720p" ? " (빠름)" : ""}</button>)}</div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">장면 전환</p>
            <div className="flex flex-wrap gap-2">{([["fade", "부드럽게(페이드)"], ["none", "바로 넘김"]] as [Transition, string][]).map(([id, label]) => <button key={id} type="button" disabled={busy} className={chip(project.transition === id)} onClick={() => patch({ transition: id })}>{label}</button>)}</div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">영상 원래 소리</p>
            <div className="flex flex-wrap gap-2">{([[false, "끄기"], [true, "켜기"]] as [boolean, string][]).map(([on, label]) => <button key={label} type="button" disabled={busy} className={chip(project.clipAudio === on)} onClick={() => patch({ clipAudio: on })}>{label}</button>)}</div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">자막 위치</p>
            <div className="flex flex-wrap gap-2">{POSITIONS.map((p) => <button key={p.id} type="button" disabled={busy} className={chip(project.captionPosition === p.id)} onClick={() => patch({ captionPosition: p.id })}>{p.label}</button>)}</div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">자막 모양</p>
            <div className="flex flex-wrap gap-2">{(Object.keys(CAPTION_STYLE_NAMES) as CaptionStyle[]).map((s) => <button key={s} type="button" disabled={busy} className={chip(project.captionStyle === s)} onClick={() => patch({ captionStyle: s })}>{CAPTION_STYLE_NAMES[s]}</button>)}</div>
          </div>
        </div>

        {project.clips.length > 0 && (
          <div className={`mx-auto w-full ${previewWidth} overflow-hidden rounded-xl border border-zinc-800 bg-black`}>
            <Player component={EditComposition} inputProps={{ project }} durationInFrames={totalFrames} fps={FPS}
              compositionWidth={width} compositionHeight={height} controls acknowledgeRemotionLicense style={{ width: "100%" }} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <p className="text-sm text-zinc-300">완성 길이 <b className="text-white">{sec(total)}</b> · {width}×{height} · 비용 <b className="text-white">0원</b>(내 PC에서 렌더)</p>
          {!canRender ? (
            <p className="text-xs text-amber-200">렌더는 PC(크롬·엣지 최신 버전)에서 해 주세요. 휴대폰에서는 미리보기만 됩니다.</p>
          ) : render ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-sm text-sky-100"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> 만드는 중 {Math.round(render.progress * 100)}%</span>
              <button type="button" onClick={() => render.ctrl.abort()} className="text-sm text-zinc-400 hover:text-zinc-200">멈추기</button>
            </div>
          ) : (
            <button type="button" disabled={busy || project.clips.length === 0} onClick={() => void startRender()}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-40">
              <Film className="h-4 w-4" aria-hidden="true" /> 영상 만들기
            </button>
          )}
        </div>
        {render && <p className="text-[11px] text-zinc-500">렌더하는 동안 이 탭을 닫거나 다른 탭으로 오래 옮기지 마세요. 영상 길이와 PC 성능에 따라 수십 초~몇 분 걸립니다.</p>}

        {result && (
          <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-bold text-emerald-200">완성했습니다 · {sec(result.seconds)} · {result.mb}MB</p>
            <video src={result.url} controls playsInline className={`mx-auto w-full ${previewWidth} rounded-lg bg-black`} />
            <a href={result.url} download={outputFileName()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-500/10">
              <Download className="h-4 w-4" aria-hidden="true" /> MP4 내려받기
            </a>
            <p className="text-[11px] text-zinc-500">완성 영상은 서버에 저장되지 않습니다. 이 화면을 닫기 전에 내려받아 주세요.</p>
          </div>
        )}
      </section>
    </div>
  );
}
