"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Clapperboard, ImagePlus, Loader2, Plus, Search, X } from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import { TrackOrderList } from "@/components/library/TrackOrderList";
import { TemplatePicker, type TemplateSample } from "@/components/video/TemplatePicker";
import { VideoPreview, type PreviewTrack } from "@/components/video/VideoPreview";
import { VideoLibrary } from "@/components/video/VideoLibrary";
import { EngineError, cancelVideo, fetchLibraryArt, fetchLibraryAudio, getVideoSession, hasVideo, listLibraryFormats, startVideo, type VideoSession } from "@/lib/engine";
import { isInstrumental } from "@/lib/trackFilters";
import type { Track } from "@/lib/tracks";
import { canRenderVideo, renderSessionVideo } from "@/lib/video/renderVideo";
import {
  COLOR_LABEL,
  DEFAULT_VIDEO_OPTIONS,
  FPS_LIST,
  MODE_LABEL,
  RESOLUTIONS,
  SPECTRUM_STYLES,
  VIDEO_TEMPLATES,
  fitToTemplate,
  templateModes,
  templateOf,
  validateVideoOptions,
  type VideoMode,
  type VideoOptions,
} from "@/lib/video/videoOptions";

// 플레이리스트 영상 만들기 — 원본 boks-music 「영상 만들기」(MIT)를 옮김(2026-11-06, 9번 묶음).
// 곡 고르기·순서 → 템플릿(37개) → 설정 → 미리보기 → [영상 만들기]: 내 PC 엔진이 음원을 분석하고,
// 이 화면이 장면을 그려 H.264로 인코딩해 엔진에 올리면, 엔진이 음악과 합쳐 「영상」 폴더에 저장한다.
const OPTIONS_KEY = "fms.video.options";
const SAMPLE_CUES = [
  { start: 4, end: 7, text: "노을이 번지는 창가에 앉아" },
  { start: 7, end: 10, text: "오늘의 노래를 틀어 봐요" },
  { start: 10, end: 13, text: "천천히 흐르는 이 밤에" },
];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Cue = { start: number; end: number | null; text: string };

/** 가사 영상에 쓸 줄(시간이 있는 줄만) */
const cuesOf = (t: Track): Cue[] => (t.lyric_timing?.cues ?? []).filter((c) => typeof c.start === "number").map((c) => ({ start: c.start as number, end: c.end, text: c.text }));

type Job = { stage: string; percent: number; hardware: boolean | null; done?: VideoSession };

export default function VideoPage() {
  const engine = useEngine();
  const canEngine = engine.paired && hasVideo(engine.status);
  const [browserOk, setBrowserOk] = useState(true);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [onPc, setOnPc] = useState<Set<string>>(new Set());
  const [arts, setArts] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<VideoOptions>(DEFAULT_VIDEO_OPTIONS);
  const [background, setBackground] = useState<File | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ artUrl: string | null; audioUrl: string | null }>({ artUrl: null, audioUrl: null });
  const [sampleImages, setSampleImages] = useState<{ art: ImageBitmap | null; background: ImageBitmap | null }>({ art: null, background: null });
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef("");

  // 브라우저 확인·지난 설정 불러오기
  useEffect(() => {
    setBrowserOk(canRenderVideo());
    try {
      const saved = JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? "null");
      if (saved && typeof saved === "object") {
        const merged = { ...DEFAULT_VIDEO_OPTIONS, ...saved };
        const t = templateOf(merged.template);
        if (t) setOptions(fitToTemplate(merged, t));
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
    } catch {}
  }, [options]);

  // 곡 기록(서버)과 이 PC 보관함(엔진)
  useEffect(() => {
    fetch("/api/tracks")
      .then((r) => (r.ok ? r.json() : { tracks: [] }))
      .then((d) => setTracks(Array.isArray(d.tracks) ? d.tracks : []))
      .catch(() => setTracks([]));
  }, []);
  useEffect(() => {
    if (!canEngine) return;
    listLibraryFormats()
      .then((r) => {
        setOnPc(r.ids);
        setArts(r.arts);
      })
      .catch(() => {});
  }, [canEngine]);

  const byId = useMemo(() => new Map((tracks ?? []).map((t) => [t.id, t])), [tracks]);
  const available = useMemo(() => (tracks ?? []).filter((t) => onPc.has(t.id)), [tracks, onPc]);
  const pickedTracks = useMemo(() => picked.map((id) => byId.get(id)).filter((t): t is Track => !!t), [picked, byId]);
  const template = templateOf(options.template) ?? VIDEO_TEMPLATES[0];
  const resolved = useMemo(() => {
    try {
      return { ok: true as const, value: validateVideoOptions(options) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "설정이 올바르지 않습니다." };
    }
  }, [options]);
  const shownTemplates = VIDEO_TEMPLATES.filter((t) => templateModes(t).includes(options.mode));
  const needTiming = options.mode === "vocal" ? pickedTracks.filter((t) => !isInstrumental(t) && cuesOf(t).length === 0) : [];
  const first = pickedTracks[0];

  // 미리보기·썸네일용: 첫 곡 표지와 소리(첫 곡만 실제 스펙트럼)
  useEffect(() => {
    let alive = true;
    const made: string[] = [];
    (async () => {
      if (!first || !canEngine) return setPreviewMedia({ artUrl: null, audioUrl: null });
      const artUrl = arts.has(first.id) ? await fetchLibraryArt(first.id).catch(() => null) : null;
      if (artUrl) made.push(artUrl);
      const audioUrl = await fetchLibraryAudio(first.id).catch(() => null);
      if (audioUrl) made.push(audioUrl);
      if (alive) setPreviewMedia({ artUrl, audioUrl });
    })();
    return () => {
      alive = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [first?.id, canEngine, arts]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let alive = true;
    const toBitmap = async (url: string | null) => (url ? createImageBitmap(await (await fetch(url)).blob()).catch(() => null) : null);
    Promise.all([toBitmap(previewMedia.artUrl), toBitmap(bgUrl)]).then(([art, bg]) => {
      if (alive) setSampleImages({ art, background: bg });
      else [art, bg].forEach((b) => b?.close());
    });
    return () => {
      alive = false;
    };
  }, [previewMedia.artUrl, bgUrl]);
  useEffect(() => {
    if (!background) return setBgUrl(null);
    const u = URL.createObjectURL(background);
    setBgUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [background]);

  const sample: TemplateSample = useMemo(
    () => ({ title: first?.title ?? "나의 플레이리스트", cues: first && cuesOf(first).length ? cuesOf(first) : SAMPLE_CUES, art: sampleImages.art, background: sampleImages.background }),
    [first, sampleImages]
  );
  const previewTracks: PreviewTrack[] = useMemo(
    () =>
      pickedTracks.slice(0, 3).map((t, i) => ({
        title: t.title,
        duration: t.lyric_timing?.duration || t.duration_sec,
        cues: options.mode === "vocal" ? cuesOf(t) : [],
        artUrl: i === 0 ? previewMedia.artUrl : null,
        audioUrl: i === 0 ? previewMedia.audioUrl : null,
      })),
    [pickedTracks, options.mode, previewMedia]
  );

  // 만드는 중에 창을 닫지 않게
  useEffect(() => {
    if (!job || job.done) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [job]);

  const set = <K extends keyof VideoOptions>(k: K, v: VideoOptions[K]) => setOptions((o) => ({ ...o, [k]: v }));
  const setMode = (mode: VideoMode) =>
    setOptions((o) => {
      const t = templateOf(o.template);
      if (t && templateModes(t).includes(mode)) return { ...o, mode };
      const next = VIDEO_TEMPLATES.find((x) => templateModes(x).includes(mode));
      return next ? fitToTemplate({ ...o, mode }, next) : o;
    });
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const start = useCallback(async () => {
    if (!resolved.ok) return setError(resolved.error);
    if (!pickedTracks.length) return setError("영상에 넣을 곡을 골라 주세요.");
    if (template.requiresBackground && !background) return setError(`「${template.name}」 템플릿은 배경 사진이 필요합니다.`);
    if (needTiming.length) return setError("가사 시간이 없는 곡이 있습니다. 아래 안내를 확인해 주세요.");
    setError("");
    const ac = new AbortController();
    abortRef.current = ac;
    setJob({ stage: "음원 분석 시작", percent: 0, hardware: null });
    try {
      const o = resolved.value;
      let s = await startVideo({
        title: o.playlistTitle || "플레이리스트 영상",
        template: template.id,
        tracks: pickedTracks.map((t) => ({ id: t.id, title: t.title })),
        options: { aspect: o.aspect, resolution: o.resolution, fps: o.fps, format: o.format, repeat: o.repeat, normalize: o.normalize },
      });
      sessionRef.current = s.id;
      while (s.status === "analyzing") {
        await sleep(800);
        ac.signal.throwIfAborted();
        s = await getVideoSession(s.id);
        setJob({ stage: s.stage, percent: s.progress, hardware: null });
      }
      if (s.status !== "rendering") throw new Error(s.error ?? "음원 분석에 실패했습니다.");
      const artBlobs = await Promise.all(
        pickedTracks.map(async (t) => {
          if (!arts.has(t.id)) return null;
          const u = await fetchLibraryArt(t.id).catch(() => null);
          if (!u) return null;
          try {
            return await (await fetch(u)).blob();
          } finally {
            URL.revokeObjectURL(u);
          }
        })
      );
      s = await renderSessionVideo(
        s,
        { scene: template.scene, options: o, tracks: pickedTracks.map((t, i) => ({ title: t.title, cues: o.mode === "vocal" ? cuesOf(t) : [], art: artBlobs[i] })), background },
        { signal: ac.signal, onProgress: (p) => setJob({ stage: p.stage, percent: 8 + (p.framesRendered / Math.max(1, p.totalFrames)) * 80, hardware: p.hardware }) }
      );
      while (s.status === "finishing") {
        await sleep(1000);
        s = await getVideoSession(s.id);
        setJob((j) => ({ stage: s.stage, percent: s.progress, hardware: j?.hardware ?? null }));
      }
      if (s.status !== "done") throw new Error(s.error ?? "영상을 마무리하지 못했습니다.");
      setJob({ stage: "완성", percent: 100, hardware: s.video?.encoder.hardware ?? null, done: s });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      if (sessionRef.current) await cancelVideo(sessionRef.current).catch(() => {});
      setError(ac.signal.aborted ? "영상 만들기를 취소했습니다." : e instanceof EngineError || e instanceof Error ? e.message : "영상을 만들지 못했습니다.");
      setJob(null);
    } finally {
      abortRef.current = null;
      sessionRef.current = "";
    }
  }, [resolved, pickedTracks, template, background, needTiming.length, arts]);

  const busy = !!job && !job.done;
  const field = "rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-hidden focus:border-emerald-400";
  const label = "space-y-1 text-[11px] font-semibold text-slate-400";
  const query2 = query.trim().toLowerCase();
  const listed = available.filter((t) => !query2 || t.title.toLowerCase().includes(query2));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#0b1a18] to-[#070b14] p-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
            <Clapperboard className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">🎬 플레이리스트 영상</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              고른 곡을 순서대로 이어 유튜브용 영상(MP4)을 만듭니다. 템플릿 37가지 · 실제 소리로 움직이는 스펙트럼 · 가사 영상 · 1~20번 반복 · 챕터 자동. 영상은 내 PC에서만 만들고 저장합니다(서버로 올리지 않음).
            </p>
          </div>
        </div>
      </div>

      {!canEngine ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {engine.checking
              ? "엔진을 확인하는 중…"
              : !engine.online
                ? "내 PC 엔진이 꺼져 있습니다. 엔진을 켜면 영상을 만들 수 있습니다."
                : !engine.paired
                  ? "이 브라우저를 엔진과 연결해야 합니다."
                  : "지금 엔진은 영상 만들기가 없는 옛 버전이거나 ffmpeg가 없습니다. 엔진 0.6.9 이상으로 바꿔 주세요."}{" "}
            <Link href="/engine" className="font-semibold underline underline-offset-2">
              내 PC 엔진 화면
            </Link>
          </p>
        </div>
      ) : (
        <>
          {!browserOk && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> 이 브라우저는 영상 인코더(WebCodecs)가 없어 영상을 만들 수 없습니다. Chrome·Edge·ego 최신 버전에서 열어 주세요.
            </p>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            {/* 1. 곡 고르기·순서 */}
            <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <h2 className="text-sm font-bold text-slate-100">1. 곡 고르기 · 순서</h2>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목으로 찾기" className={`${field} w-full pl-8`} />
              </div>
              <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {tracks === null ? (
                  <li className="text-xs text-slate-500">불러오는 중…</li>
                ) : listed.length === 0 ? (
                  <li className="text-xs text-slate-500">이 PC 보관함에 있는 곡이 없습니다. 곡을 만든 뒤 다시 와 주세요.</li>
                ) : (
                  listed.map((t) => {
                    const on = picked.includes(t.id);
                    return (
                      <li key={t.id}>
                        <button type="button" onClick={() => toggle(t.id)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs ${on ? "bg-emerald-950/40 text-emerald-200" : "text-slate-300 hover:bg-slate-900"}`}>
                          {on ? <X className="h-3.5 w-3.5 shrink-0" /> : <Plus className="h-3.5 w-3.5 shrink-0" />}
                          <span className="truncate">{t.title}</span>
                          <span className="ml-auto shrink-0 text-[10px] text-slate-500">{isInstrumental(t) ? "연주곡" : cuesOf(t).length ? "가사 시간 있음" : "노래"}</span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
              {pickedTracks.length > 0 && (
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <p className="text-[11px] font-semibold text-slate-400">고른 곡 {pickedTracks.length}개 — 이 순서로 이어집니다</p>
                  <TrackOrderList
                    items={pickedTracks}
                    editable={!busy}
                    onOrder={async (ids) => {
                      setPicked(ids);
                      return true;
                    }}
                    rowClassName="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs"
                    renderRow={(t, _i, { badge, grip }) => (
                      <>
                        {grip}
                        {badge}
                        <span className="truncate text-slate-200">{t.title}</span>
                        <button type="button" aria-label={`${t.title} 빼기`} disabled={busy} onClick={() => toggle(t.id)} className="ml-auto rounded p-1 text-slate-500 hover:text-rose-300 disabled:opacity-40">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  />
                </div>
              )}
              {needTiming.length > 0 && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-2.5 text-[11px] text-amber-200">
                  가사 영상에는 줄마다 시간이 필요합니다. 「모든 음악」 곡 상세의 「가사 시간」에서 맞춰 주세요: {needTiming.map((t) => t.title).join(", ")}
                </p>
              )}
            </section>

            {/* 미리보기·설정 */}
            <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <h2 className="text-sm font-bold text-slate-100">3. 미리보기 · 설정</h2>
              {resolved.ok && previewTracks.length > 0 ? (
                <VideoPreview scene={template.scene} options={resolved.value} tracks={previewTracks} backgroundUrl={bgUrl} />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-500">{resolved.ok ? "곡을 고르면 미리보기가 나옵니다" : resolved.error}</div>
              )}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <label className={label}>
                  영상 이름(파일 이름)
                  <input value={options.playlistTitle ?? ""} maxLength={180} onChange={(e) => set("playlistTitle", e.target.value)} placeholder="플레이리스트 영상" className={`${field} w-full`} />
                </label>
                <label className={label}>
                  왼쪽 위 타이틀 문구
                  <input value={options.brand ?? ""} maxLength={40} onChange={(e) => set("brand", e.target.value)} className={`${field} w-full`} />
                </label>
                <label className={label}>
                  영상 종류
                  <select value={options.mode} onChange={(e) => setMode(e.target.value as VideoMode)} className={`${field} w-full`}>
                    {(["instrumental", "vocal"] as VideoMode[]).map((m) => (
                      <option key={m} value={m}>
                        {MODE_LABEL[m]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  화면 비율
                  <select value={options.aspect} onChange={(e) => set("aspect", e.target.value as VideoOptions["aspect"])} className={`${field} w-full`}>
                    {template.aspects.map((a) => (
                      <option key={a} value={a}>
                        {a === "16:9" ? "가로 16:9 (유튜브)" : "세로 9:16 (쇼츠·릴스)"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  해상도
                  <select value={options.resolution} onChange={(e) => set("resolution", Number(e.target.value) as VideoOptions["resolution"])} className={`${field} w-full`}>
                    {RESOLUTIONS.filter((r) => !template.maxResolution || r <= template.maxResolution).map((r) => (
                      <option key={r} value={r}>
                        {r === 2160 ? "4K (2160p)" : r === 1440 ? "2K (1440p)" : `${r}p`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  초당 프레임
                  <select value={options.fps} onChange={(e) => set("fps", Number(e.target.value) as VideoOptions["fps"])} className={`${field} w-full`}>
                    {FPS_LIST.map((f) => (
                      <option key={f} value={f}>
                        {f}fps
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  스펙트럼 모양
                  <select value={options.spectrum} onChange={(e) => set("spectrum", e.target.value)} className={`${field} w-full`}>
                    {SPECTRUM_STYLES.filter((s) => template.spectra.includes(s.id)).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                        {s.id === template.recommendedSpectrum ? " (추천)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  스펙트럼 색
                  <select value={options.color} onChange={(e) => set("color", e.target.value as VideoOptions["color"])} className={`${field} w-full`}>
                    {(Object.keys(COLOR_LABEL) as VideoOptions["color"][]).map((c) => (
                      <option key={c} value={c}>
                        {COLOR_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  플레이리스트 반복
                  <select value={options.repeat} onChange={(e) => set("repeat", Number(e.target.value))} className={`${field} w-full`}>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? "1번(반복 없음)" : `${n}번`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <label className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={options.normalize} onChange={(e) => set("normalize", e.target.checked)} className="accent-emerald-500" />
                  곡마다 음량 맞추기(-14 LUFS, 유튜브 기준)
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={options.format === "mov"} onChange={(e) => set("format", e.target.checked ? "mov" : "mp4")} className="accent-emerald-500" />
                  MOV로 저장(기본 MP4)
                </label>
                <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${template.requiresBackground && !background ? "border-amber-500/50 text-amber-200" : "border-slate-700 text-slate-300"} hover:bg-slate-900`}>
                  <ImagePlus className="h-3.5 w-3.5" />
                  {background ? `배경: ${background.name.slice(0, 24)}` : template.requiresBackground ? "배경 사진 고르기(필요)" : "배경 사진 고르기(선택)"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setBackground(e.target.files?.[0] ?? null)} />
                </label>
                {background && (
                  <button type="button" onClick={() => setBackground(null)} className="text-[11px] text-slate-500 underline underline-offset-2 hover:text-slate-300">
                    배경 빼기
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* 2. 템플릿 */}
          <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100">
              2. 템플릿 <span className="text-[11px] font-normal text-slate-400">{MODE_LABEL[options.mode]}에 쓸 수 있는 {shownTemplates.length}가지 · 지금: {template.name} — {template.description}</span>
            </h2>
            <TemplatePicker templates={shownTemplates} value={template.id} options={options} sample={sample} onPick={(t) => setOptions((o) => fitToTemplate(o, t))} />
          </section>

          {/* 만들기 */}
          <section className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4">
            {error && (
              <p className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}
            {job && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-200">
                  {!job.done && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300" />}
                  <span className="font-semibold">{job.stage}</span>
                  <span className="text-slate-400">{Math.round(job.percent)}%</span>
                  {job.hardware !== null && <span className="text-[11px] text-slate-500">{job.hardware ? "그래픽카드 인코딩" : "CPU 인코딩(조금 느림)"}</span>}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all" style={{ width: `${Math.min(100, job.percent)}%` }} />
                </div>
                {!job.done && <p className="text-[11px] text-amber-200/80">만드는 동안 이 창을 닫거나 다른 화면으로 옮기지 마세요(이 화면이 영상을 그립니다).</p>}
                {job.done?.video && <p className="text-[11px] text-emerald-300">✔ 완성 — {job.done.video.file}</p>}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy || !browserOk || !pickedTracks.length || !resolved.ok}
                onClick={start}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-emerald-500/20 hover:brightness-110 disabled:opacity-40"
              >
                <Clapperboard className="h-4 w-4" /> 영상 만들기
              </button>
              {busy && (
                <button type="button" onClick={() => abortRef.current?.abort()} className="inline-flex items-center gap-1 rounded-xl border border-slate-600 px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-900">
                  <X className="h-3.5 w-3.5" /> 취소
                </button>
              )}
              <span className="text-[11px] text-slate-500">
                {pickedTracks.length ? `${pickedTracks.length}곡` : "곡을 골라 주세요"}
                {resolved.ok ? ` · ${resolved.value.width}×${resolved.value.height} ${resolved.value.fps}fps` : ""}
              </span>
            </div>
          </section>

          <VideoLibrary refreshKey={refreshKey} />
        </>
      )}
    </div>
  );
}
