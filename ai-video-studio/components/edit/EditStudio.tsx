"use client";

// 영상 합치기 작업실 — 갤러리 클립·내 PC 영상 + 음악 + 자막·내레이션을 회원 브라우저에서 한 편의 MP4로 렌더한다(서버 비용 0).
// 플랜: docs/PLAN_20261023_EDIT_STUDIO.md(2-가 v1.04, 2-나·화면 편의 v1.05). 시간 계산은 lib/edit/timeline.ts, 그리기는 Composition.tsx, R1 대책은 probe.tsx.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Player } from "@remotion/player";
import { renderMediaOnWeb } from "@remotion/web-renderer";
import { ArrowDown, ArrowUp, Download, Film, FolderOpen, GripVertical, ImagePlus, Layers, Loader2, Mic, Music, Save, Trash2, Upload } from "lucide-react";
import { EditComposition } from "@/components/edit/Composition";
import { probeClip, readDuration, reencodeSoftware } from "@/components/edit/probe";
import { createClient } from "@/lib/supabase/client";
import type { ClientGeneration } from "@/lib/generationTypes";
import { TTS_MODELS, TTS_VOICES, type TtsProvider } from "@/lib/edit/voice";
import {
  CAPTION_SIZE_NAMES, CAPTION_STYLE_NAMES, FPS, MAX_CLIPS, clipSeconds, dimensions, fitAllToVoice, fitToVoice, layout, sceneSeconds, outputFileName, toSaved, totalSeconds, validate, voiceOverflow,
  type CaptionPosition, type CaptionSize, type CaptionStyle, type ClipSource, type EditAspect, type EditClip, type EditProject, type EditQuality, type MusicSource, type SavedProject, type Transition,
} from "@/lib/edit/timeline";

type Song = { ref: string; title: string; model: string; durationS: number | null; instrumental: boolean; url: string | null; tooBig: boolean };
type Busy = { name: string; msg: string } | null;
type RenderState = { progress: number; ctrl: AbortController } | null;
type EditItem = { id: string; title: string; clips: number; updatedAt: string };
type VoiceSettings = { model: string; voice: string; speed: number };

const BUCKET = "ai-video-studio";
const INITIAL: EditProject = { clips: [], aspect: "9:16", quality: "720p", transition: "fade", captionPosition: "bottom", captionStyle: "band", captionSize: "m", clipAudio: false, music: null };
const ASPECTS: { id: EditAspect; label: string }[] = [{ id: "9:16", label: "9:16 세로(쇼츠·릴스)" }, { id: "16:9", label: "16:9 가로" }, { id: "1:1", label: "1:1 정사각" }];
const POSITIONS: { id: CaptionPosition; label: string }[] = [{ id: "top", label: "위" }, { id: "middle", label: "가운데" }, { id: "bottom", label: "아래" }];
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_GALLERY_BYTES = 50 * 1024 * 1024;

const sec = (n: number) => `${Math.round(n * 10) / 10}초`;
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("파일을 받지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요(받기 주소는 1시간 동안만 유효합니다).");
  return res.blob();
}

function b64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function EditStudio() {
  const params = useSearchParams();
  const [project, setProject] = useState<EditProject>(INITIAL);
  const [gallery, setGallery] = useState<ClientGeneration[] | null>(null);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [songAppUrl, setSongAppUrl] = useState("https://ai-music-studio.buylife.xyz");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [render, setRender] = useState<RenderState>(null);
  const [result, setResult] = useState<{ url: string; mb: number; seconds: number } | null>(null);
  const [canRender, setCanRender] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [voiceSet, setVoiceSet] = useState<VoiceSettings>({ model: TTS_MODELS[0].id, voice: TTS_VOICES.openai[0].id, speed: 1 });
  const [elVoices, setElVoices] = useState<{ id: string; name: string; mine: boolean }[] | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [edits, setEdits] = useState<EditItem[] | null>(null);
  const [showLoad, setShowLoad] = useState(false);
  const autoAdded = useRef(false);
  const autoLoaded = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  /** 아직 저장소에 올리지 않은 내레이션 음성(장면 번호 → 파일) */
  const voiceBlobs = useRef(new Map<string, Blob>());
  const resultBlob = useRef<Blob | null>(null);

  const patch = (p: Partial<EditProject>) => setProject((cur) => ({ ...cur, ...p }));
  const patchClip = (id: string, p: Partial<EditClip>) => setProject((cur) => ({ ...cur, clips: cur.clips.map((c) => (c.id === id ? { ...c, ...p } : c)) }));
  const provider: TtsProvider = (TTS_MODELS.find((m) => m.id === voiceSet.model) ?? TTS_MODELS[0]).provider;

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

  /** 영상 하나 넣기 — 길이 읽기 → (내 PC 영상만) 앞부분 시험 렌더(R1) → 멈추면 소프트웨어로 다시 인코딩 */
  const addVideo = useCallback(async (getBlob: () => Promise<Blob>, name: string, opts: { caption?: string; source: ClipSource; trusted: boolean; base?: Partial<EditClip> }) => {
    setError("");
    setBusy({ name, msg: "영상 받는 중" });
    let url = "";
    try {
      let blob = await getBlob();
      if (blob.size > MAX_VIDEO_BYTES) throw new Error("200MB가 넘는 영상은 넣을 수 없습니다.");
      const duration = await readDuration(blob);
      if (!Number.isFinite(duration) || duration <= 0) throw new Error("영상 길이를 읽지 못했습니다. MP4 영상을 넣어 주세요.");
      url = URL.createObjectURL(blob);
      // 갤러리 영상은 업체 서버에서 인코딩된 파일이라 R1이 생기지 않는다(v1.04 운영 확인) → 시험을 건너뛴다
      if (!opts.trusted) {
        setBusy({ name, msg: "영상 형식 확인 중" });
        if (!(await probeClip(url))) {
          URL.revokeObjectURL(url);
          url = "";
          setBusy({ name, msg: "형식 맞추는 중 0%" });
          blob = await reencodeSoftware(blob, (p) => setBusy({ name, msg: `형식 맞추는 중 ${Math.round(p * 100)}%` }));
          url = URL.createObjectURL(blob);
          if (!(await probeClip(url))) throw new Error("이 영상은 형식을 맞춰도 합치기에 쓸 수 없습니다. 다른 영상을 넣어 주세요.");
        }
      }
      const clip: EditClip = { id: newId(), src: url, name, duration, trimStart: 0, trimEnd: 0, caption: opts.caption ?? "", narration: "", voice: null, source: opts.source, ...opts.base };
      setProject((cur) => (cur.clips.length >= MAX_CLIPS ? cur : { ...cur, clips: [...cur.clips, clip] }));
      setResult(null);
      return true;
    } catch (e) {
      if (url) URL.revokeObjectURL(url);
      setError(e instanceof Error ? e.message : "영상을 넣지 못했습니다.");
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  const addGallery = useCallback((g: ClientGeneration) => {
    const url = g.outputs[0]?.url;
    if (!url) return;
    void addVideo(() => fetchBlob(url), `${g.modelName} · ${g.prompt.slice(0, 24)}`, { source: { kind: "gallery", id: g.id }, trusted: true });
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
    void (async () => { for (const f of list) await addVideo(async () => f, f.name, { source: { kind: "local" }, trusted: false }); })();
  }

  function removeClip(id: string) {
    setProject((cur) => {
      const c = cur.clips.find((x) => x.id === id);
      if (c) { URL.revokeObjectURL(c.src); if (c.voice) URL.revokeObjectURL(c.voice.src); }
      return { ...cur, clips: cur.clips.filter((x) => x.id !== id) };
    });
    voiceBlobs.current.delete(id);
    setResult(null);
  }

  function moveClip(id: string, toIndex: number) {
    setProject((cur) => {
      const i = cur.clips.findIndex((x) => x.id === id);
      if (i < 0 || toIndex < 0 || toIndex >= cur.clips.length || i === toIndex) return cur;
      const clips = [...cur.clips];
      const [c] = clips.splice(i, 1);
      clips.splice(toIndex, 0, c);
      return { ...cur, clips };
    });
  }

  async function setMusic(getBlob: () => Promise<Blob>, name: string, source: MusicSource) {
    setError("");
    setBusy({ name, msg: "음악 받는 중" });
    try {
      const blob = await getBlob();
      if (project.music) URL.revokeObjectURL(project.music.src);
      patch({ music: { src: URL.createObjectURL(blob), name, volume: 0.8, fadeOut: true, source } });
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "음악을 넣지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  // ── 내레이션 ──
  function pickModel(id: string) {
    const m = TTS_MODELS.find((x) => x.id === id) ?? TTS_MODELS[0];
    const voices = TTS_VOICES[m.provider];
    setVoiceSet((cur) => ({ ...cur, model: m.id, voice: m.provider === "elevenlabs" ? (elVoices?.[0]?.id ?? "") : voices[0].id }));
    if (m.provider === "elevenlabs" && elVoices === null) void loadElVoices();
  }

  async function loadElVoices() {
    setError("");
    const res = await fetch("/api/edit/voices", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error ?? "ElevenLabs 목소리를 불러오지 못했습니다."); setElVoices([]); return; }
    setElVoices(j.voices ?? []);
    setVoiceSet((cur) => ({ ...cur, voice: cur.voice || j.voices?.[0]?.id || "" }));
  }

  async function makeVoice(clipId: string): Promise<boolean> {
    const clip = project.clips.find((c) => c.id === clipId);
    if (!clip) return false;
    const text = (clip.narration?.trim() || clip.caption.trim());
    if (!text) { setError("내레이션 문장(또는 자막)을 먼저 적어 주세요."); return false; }
    setError("");
    setBusy({ name: clip.name, msg: "내레이션 음성 만드는 중(본인 키)" });
    try {
      const res = await fetch("/api/edit/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, model: voiceSet.model, voice: voiceSet.voice, speed: voiceSet.speed }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "음성을 만들지 못했습니다.");
      const blob = b64ToBlob(j.audio, j.mime);
      const duration = await readDuration(blob);
      if (clip.voice) URL.revokeObjectURL(clip.voice.src);
      voiceBlobs.current.set(clipId, blob);
      patchClip(clipId, { narration: text, voice: { src: URL.createObjectURL(blob), duration, starts: Array.isArray(j.starts) ? j.starts : null, mime: j.mime } });
      setResult(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "음성을 만들지 못했습니다.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function makeAllVoices() {
    for (const c of project.clips) {
      if ((c.narration?.trim() || c.caption.trim()) && !c.voice) {
        if (!(await makeVoice(c.id))) break;
      }
    }
  }

  function removeVoice(clipId: string) {
    const c = project.clips.find((x) => x.id === clipId);
    if (c?.voice) URL.revokeObjectURL(c.voice.src);
    voiceBlobs.current.delete(clipId);
    patchClip(clipId, { voice: null });
    setResult(null);
  }

  // ── 저장·불러오기 ──
  /** 편집 저장. video를 주면 완성본도 갤러리에 저장 */
  async function saveEdit(video?: Blob, seconds?: number) {
    setError(""); setNotice("");
    if (!project.clips.length) { setError("저장할 영상이 없습니다."); return; }
    if (video && video.size > MAX_GALLERY_BYTES) { setError("완성 영상이 50MB를 넘어 갤러리에 저장할 수 없습니다. 720p로 만들거나 길이를 줄여 주세요. 내려받기는 그대로 됩니다."); return; }
    setBusy({ name: title || "편집", msg: video ? "갤러리에 저장하는 중" : "편집 저장하는 중" });
    try {
      const pendingVoices = project.clips
        .filter((c) => c.voice && !c.voice.path && voiceBlobs.current.has(c.id))
        .map((c) => ({ clipId: c.id, duration: c.voice!.duration, starts: c.voice!.starts, mime: c.voice!.mime }));
      const res = await fetch("/api/edit/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, title, project: toSaved(project, {}), pendingVoices, ...(video ? { video: { bytes: video.size, seconds } } : {}) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "저장하지 못했습니다.");
      const supabase = createClient();
      const savedProject = j.project as SavedProject;
      for (const u of (j.uploads ?? []) as { key: string; path: string; token: string }[]) {
        const blob = u.key === "video" ? video : voiceBlobs.current.get(u.key.slice("voice:".length));
        if (!blob) continue;
        const { error: upErr } = await supabase.storage.from(BUCKET).uploadToSignedUrl(u.path, u.token, blob, { contentType: blob.type || (u.key === "video" ? "video/mp4" : "audio/mpeg") });
        if (upErr) throw new Error("파일을 올리지 못했습니다. 잠시 뒤 다시 저장해 주세요.");
      }
      // 올린 음성은 저장소 경로를 기억한다(다음 저장 때 다시 올리지 않음)
      const pathOf = new Map(savedProject.clips.filter((c) => c.voice).map((c) => [c.id, c.voice!.path]));
      setProject((cur) => ({ ...cur, clips: cur.clips.map((c) => (c.voice && pathOf.has(c.id) ? { ...c, voice: { ...c.voice, path: pathOf.get(c.id) } } : c)) }));
      for (const id of pathOf.keys()) voiceBlobs.current.delete(id);
      setEditId(j.id);
      setTitle(j.title);
      setEdits(null);
      setNotice(video ? "완성 영상을 갤러리 「편집본」에 저장했습니다(30일 보관)." : "편집을 저장했습니다. 30일 동안 「불러오기」로 이어서 작업할 수 있습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function openLoadList() {
    setShowLoad((v) => !v);
    if (edits) return;
    const res = await fetch("/api/edit/projects", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    setEdits(res.ok ? j.edits ?? [] : []);
  }

  const loadEdit = useCallback(async (id: string) => {
    setError(""); setNotice(""); setShowLoad(false);
    setBusy({ name: "저장된 편집", msg: "불러오는 중" });
    try {
      const res = await fetch(`/api/edit/projects/${id}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "편집을 불러오지 못했습니다.");
      const saved = j.project as SavedProject;
      const urls = j.urls as { clips: Record<string, string | null>; voices: Record<string, string | null>; music: string | null };
      const missing: string[] = [];
      const clips: EditClip[] = [];
      for (const s of saved.clips) {
        const url = urls.clips[s.id];
        if (!url) { missing.push(s.name); continue; }
        setBusy({ name: s.name, msg: "영상 받는 중" });
        const blob = await fetchBlob(url);
        let voice: EditClip["voice"] = null;
        const vurl = urls.voices[s.id];
        if (s.voice && vurl) {
          const vb = await fetchBlob(vurl);
          voice = { src: URL.createObjectURL(vb), duration: s.voice.duration, starts: s.voice.starts, mime: s.voice.mime, path: s.voice.path };
        }
        clips.push({ id: s.id, src: URL.createObjectURL(blob), name: s.name, duration: s.duration, trimStart: s.trimStart, trimEnd: s.trimEnd, hold: s.hold ?? 0, caption: s.caption, narration: s.narration, source: s.source, voice });
      }
      let music: EditProject["music"] = null;
      if (saved.music && urls.music) {
        const mb = await fetchBlob(urls.music);
        music = { src: URL.createObjectURL(mb), name: saved.music.name, volume: saved.music.volume, fadeOut: saved.music.fadeOut, source: saved.music.source, duck: saved.music.duck !== false };
      } else if (saved.music) missing.push(`배경음악 「${saved.music.name}」`);
      // 이전 화면의 파일 주소 정리
      setProject((cur) => { cur.clips.forEach((c) => { URL.revokeObjectURL(c.src); if (c.voice) URL.revokeObjectURL(c.voice.src); }); if (cur.music) URL.revokeObjectURL(cur.music.src); return cur; });
      voiceBlobs.current.clear();
      setProject({ clips, aspect: saved.aspect, quality: saved.quality, transition: saved.transition, captionPosition: saved.captionPosition, captionStyle: saved.captionStyle, captionSize: saved.captionSize, clipAudio: saved.clipAudio, music });
      setEditId(j.id);
      setTitle(j.title);
      setResult(null);
      setNotice(missing.length ? `불러왔습니다. 내 PC에서 넣은 파일은 서버에 저장하지 않아 다시 넣어 주세요: ${missing.join(", ")}` : "편집을 불러왔습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "편집을 불러오지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }, []);

  // 갤러리 「편집 열기」 → /edit?edit=<편집 번호>
  useEffect(() => {
    const id = params?.get("edit");
    if (!id || autoLoaded.current || !/^[0-9a-f-]{36}$/i.test(id)) return;
    autoLoaded.current = true;
    void loadEdit(id);
  }, [params, loadEdit]);

  function newEdit() {
    project.clips.forEach((c) => { URL.revokeObjectURL(c.src); if (c.voice) URL.revokeObjectURL(c.voice.src); });
    if (project.music) URL.revokeObjectURL(project.music.src);
    voiceBlobs.current.clear();
    setProject(INITIAL); setEditId(null); setTitle(""); setResult(null); setNotice(""); setError("");
  }

  async function startRender() {
    const problem = validate(project);
    if (problem) { setError(problem); return; }
    setError(""); setNotice("");
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    resultBlob.current = null;
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
      resultBlob.current = blob;
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
  const isBusy = Boolean(busy || render);
  const chip = (on: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${on ? "border-sky-500/50 bg-sky-500/15 text-sky-100" : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"}`;
  const card = "space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5";
  const smallBtn = "inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-500 disabled:opacity-40";
  const stepTitle = (n: number, text: string) => (
    <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-200"><span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-200">Step {n}</span> {text}</h2>
  );
  const previewWidth = project.aspect === "9:16" ? "max-w-[300px]" : project.aspect === "1:1" ? "max-w-[420px]" : "max-w-[640px]";
  const voicesForModel = provider === "elevenlabs" ? (elVoices ?? []).map((v) => ({ id: v.id, name: v.mine ? `★ ${v.name}` : v.name })) : TTS_VOICES[provider];
  const narrated = project.clips.filter((c) => c.narration?.trim() || c.caption.trim()).length;
  const overflowCount = project.clips.filter((c) => voiceOverflow(c) > 0).length;
  // 내레이션이 넘치는 장면을 모두 내레이션 길이에 맞춰 늘린다(최대 길이를 넘으면 바꾸지 않고 안내)
  function fitAll() {
    const next = fitAllToVoice(project);
    if (!next) { setError("모든 장면을 늘리면 3분을 넘습니다. 장면을 줄이거나 내레이션 문장을 줄여 주세요."); return; }
    setError(""); setProject(next);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><Layers className="h-6 w-6 text-sky-300" aria-hidden="true" /> 영상 합치기</h1>
        <p className="text-sm text-zinc-400">만든 영상 여러 개에 음악·자막·내레이션을 얹어 한 편으로 만듭니다. 렌더는 내 PC 브라우저에서 해서 비용이 들지 않습니다.</p>
      </header>

      {/* 저장·불러오기 */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
        <input type="text" value={title} maxLength={80} disabled={isBusy} onChange={(e) => setTitle(e.target.value)} placeholder="편집 제목(예: 홈 스튜디오 쇼츠)"
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/60 focus:outline-none" />
        <button type="button" className={smallBtn} disabled={isBusy || !project.clips.length} onClick={() => void saveEdit()}><Save className="h-3.5 w-3.5" aria-hidden="true" /> 편집 저장</button>
        <button type="button" className={smallBtn} disabled={isBusy} onClick={() => void openLoadList()}><FolderOpen className="h-3.5 w-3.5" aria-hidden="true" /> 불러오기</button>
        <button type="button" className={smallBtn} disabled={isBusy || (!project.clips.length && !editId)} onClick={newEdit}>새로 시작</button>
        {editId && <span className="text-[11px] text-zinc-500">저장된 편집을 고치는 중</span>}
        {showLoad && (
          <div className="w-full">
            {edits === null ? <p className="text-xs text-zinc-500">불러오는 중…</p> : edits.length === 0 ? <p className="text-xs text-zinc-500">저장된 편집이 없습니다.</p> : (
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {edits.map((e) => (
                  <li key={e.id}>
                    <button type="button" disabled={isBusy} onClick={() => void loadEdit(e.id)} className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-left text-xs text-zinc-200 hover:border-sky-500/50">
                      <span className="min-w-0 flex-1 truncate">{e.title}</span>
                      <span className="text-[11px] text-zinc-500">영상 {e.clips}개 · {new Date(e.updatedAt).toLocaleDateString("ko-KR")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{notice}</p>}
      {busy && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {busy.name} — {busy.msg}
        </p>
      )}

      {/* 1단계: 영상 넣기 */}
      <section className={card}>
        {stepTitle(1, "합칠 영상 넣기")}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={isBusy || project.clips.length >= MAX_CLIPS} onClick={() => fileInput.current?.click()}
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
                <button key={g.id} type="button" disabled={isBusy || project.clips.length >= MAX_CLIPS} onClick={() => addGallery(g)}
                  className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 text-left hover:border-sky-500/50 disabled:opacity-40">
                  <video src={g.outputs[0]?.url ?? undefined} muted playsInline preload="metadata" className="aspect-video w-full bg-black object-cover" />
                  <span className="block truncate px-2 py-1.5 text-[11px] text-zinc-300">+ {g.modelName} · {g.duration_s}초</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2단계: 순서·자르기·자막·내레이션 */}
      <section className={card}>
        {stepTitle(2, `순서·자르기·자막·내레이션 (${project.clips.length}개 · 총 ${sec(total)})`)}
        {overflowCount > 1 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <p className="text-xs text-amber-100">내레이션이 장면보다 긴 장면이 {overflowCount}개 있습니다.</p>
            <button type="button" className={smallBtn} disabled={isBusy} onClick={fitAll}>모두 내레이션에 맞추기</button>
          </div>
        )}
        {project.clips.length === 0 ? (
          <p className="text-sm text-zinc-500">Step 1에서 영상을 넣으면 여기에 순서대로 놓입니다. 줄을 끌어서 순서를 바꿀 수 있습니다.</p>
        ) : (
          <ol className="space-y-2">
            {project.clips.map((c, i) => {
              const keep = clipSeconds(c);
              const left = c.duration > 0 ? (Math.min(c.trimStart, c.duration) / c.duration) * 100 : 0;
              const width = c.duration > 0 ? (keep / c.duration) * 100 : 100;
              const over = voiceOverflow(c);
              return (
                <li key={c.id} draggable={!isBusy}
                  onDragStart={(e) => { setDragId(c.id); e.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={(e) => { if (dragId) e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); if (dragId) moveClip(dragId, i); setDragId(null); }}
                  onDragEnd={() => setDragId(null)}
                  className={`space-y-2 rounded-xl border bg-zinc-950/50 p-3 ${dragId === c.id ? "border-sky-500/60 opacity-60" : "border-zinc-800"}`}>
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-zinc-500" aria-label="끌어서 순서 바꾸기" />
                    <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">{i + 1}</span>
                    <p className="min-w-0 flex-1 truncate text-sm text-zinc-200" title={c.name}>{c.name}</p>
                    <span className="text-[11px] text-zinc-500">{sec(sceneSeconds(c))}{(c.hold ?? 0) > 0 ? ` (늘림 +${sec(c.hold ?? 0)})` : ""} / 원본 {sec(c.duration)}</span>
                    <button type="button" aria-label="앞으로" disabled={isBusy || i === 0} onClick={() => moveClip(c.id, i - 1)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" aria-label="뒤로" disabled={isBusy || i === project.clips.length - 1} onClick={() => moveClip(c.id, i + 1)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" aria-label="빼기" disabled={isBusy} onClick={() => removeClip(c.id)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {/* 자르기 구간 그림: 색칠된 부분이 남는 구간 */}
                  <div className="relative h-2 overflow-hidden rounded-full bg-zinc-800" title={`남는 구간 ${sec(keep)}`}>
                    <div className="absolute inset-y-0 rounded-full bg-sky-500/70" style={{ left: `${left}%`, width: `${width}%` }} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[auto_auto_1fr]">
                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">앞 자르기
                      <input type="number" min={0} step={0.1} value={c.trimStart} disabled={isBusy} onChange={(e) => patchClip(c.id, { trimStart: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100" />초
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">뒤 자르기
                      <input type="number" min={0} step={0.1} value={c.trimEnd} disabled={isBusy} onChange={(e) => patchClip(c.id, { trimEnd: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100" />초
                    </label>
                    <input type="text" value={c.caption} maxLength={60} disabled={isBusy} placeholder="이 장면 자막(선택)" onChange={(e) => patchClip(c.id, { caption: e.target.value })}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/60 focus:outline-none" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="text" value={c.narration ?? ""} maxLength={500} disabled={isBusy} placeholder="내레이션 문장(선택, 비우면 자막을 읽음)"
                      onChange={(e) => patchClip(c.id, { narration: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/60 focus:outline-none" />
                    <button type="button" className={smallBtn} disabled={isBusy || !(c.narration?.trim() || c.caption.trim())} onClick={() => void makeVoice(c.id)}>
                      <Mic className="h-3.5 w-3.5" aria-hidden="true" /> {c.voice ? "다시 만들기" : "목소리 만들기"}
                    </button>
                    {c.voice && (
                      <>
                        <audio src={c.voice.src} controls className="h-7 max-w-[180px]" />
                        <span className="text-[11px] text-zinc-400">{sec(c.voice.duration)}{c.voice.starts ? " · 자막 시각 맞춤" : " · 자막 글자 비례"}</span>
                        <button type="button" aria-label="내레이션 빼기" disabled={isBusy} onClick={() => removeVoice(c.id)} className="rounded-lg p-1 text-zinc-400 hover:text-rose-300 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>
                      </>
                    )}
                  </div>
                  {over > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] text-amber-200">내레이션이 장면보다 {over}초 깁니다 — 넘치는 부분은 잘립니다.</p>
                      <button type="button" className={smallBtn} disabled={isBusy} onClick={() => patchClip(c.id, { hold: fitToVoice(c).hold })}>장면을 내레이션에 맞추기</button>
                    </div>
                  )}
                  {(c.hold ?? 0) > 0 && over === 0 && (
                    <p className="text-[11px] text-zinc-400">내레이션에 맞춰 {sec(c.hold ?? 0)} 늘렸습니다(영상은 반복 재생).{" "}
                      <button type="button" disabled={isBusy} onClick={() => patchClip(c.id, { hold: 0 })} className="text-sky-300 underline-offset-2 hover:underline disabled:opacity-40">되돌리기</button>
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* 3단계: 내레이션 목소리 */}
      <section className={card}>
        {stepTitle(3, "내레이션 목소리 (선택 · 본인 키)")}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[11px] text-zinc-400">음성 모델
            <select value={voiceSet.model} disabled={isBusy} onChange={(e) => pickModel(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100">
              {TTS_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-zinc-400">목소리
            <select value={voiceSet.voice} disabled={isBusy || !voicesForModel.length} onChange={(e) => setVoiceSet((cur) => ({ ...cur, voice: e.target.value }))} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100">
              {voicesForModel.length ? voicesForModel.map((v) => <option key={v.id} value={v.id}>{v.name}</option>) : <option value="">목소리 없음</option>}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-zinc-400">빠르기
            <input type="range" min={0.8} max={1.3} step={0.05} value={voiceSet.speed} disabled={isBusy} onChange={(e) => setVoiceSet((cur) => ({ ...cur, speed: Number(e.target.value) }))} />
            {voiceSet.speed.toFixed(2)}배
          </label>
          <button type="button" className={smallBtn} disabled={isBusy || narrated === 0} onClick={() => void makeAllVoices()}>
            <Mic className="h-3.5 w-3.5" aria-hidden="true" /> 아직 없는 장면 모두 만들기
          </button>
        </div>
        <p className="text-[11px] text-zinc-500">
          OpenAI·Gemini·ElevenLabs 중 본인 키가 등록된 모델을 고르세요(API키등록·플랫폼연동). 내레이션이 있는 장면은 말하는 속도에 맞춰 자막이 바뀝니다 —
          OpenAI 키가 있으면 받아쓰기로 시각을 맞추고, 없으면 글자 수 비례로 나눕니다. 비용은 본인 계정에 청구됩니다(문장 하나 약 몇 원 수준).
        </p>
      </section>

      {/* 4단계: 배경음악 */}
      <section className={card}>
        {stepTitle(4, "배경음악 (선택)")}
        {project.music ? (
          <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-sky-300" aria-hidden="true" />
              <p className="min-w-0 flex-1 truncate text-sm text-zinc-200">{project.music.name}</p>
              <button type="button" disabled={isBusy} onClick={() => { if (project.music) URL.revokeObjectURL(project.music.src); patch({ music: null }); }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30" aria-label="음악 빼기"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-[11px] text-zinc-400">음량
                <input type="range" min={0} max={1} step={0.05} value={project.music.volume} disabled={isBusy}
                  onChange={(e) => project.music && patch({ music: { ...project.music, volume: Number(e.target.value) } })} />
                {Math.round(project.music.volume * 100)}%
              </label>
              <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={project.music.fadeOut} disabled={isBusy} onChange={(e) => project.music && patch({ music: { ...project.music, fadeOut: e.target.checked } })} />
                끝 1초 서서히 줄이기
              </label>
              <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={project.music.duck !== false} disabled={isBusy} onChange={(e) => project.music && patch({ music: { ...project.music, duck: e.target.checked } })} />
                내레이션 나올 때 음악 줄이기(35%)
              </label>
            </div>
            <p className="text-[11px] text-zinc-500">음악이 영상보다 길면 영상 길이에 맞춰 잘립니다. 내레이션이 나오는 동안에는 음악이 자동으로 줄어 목소리가 잘 들립니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={isBusy} onClick={() => musicInput.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-40">
                <Upload className="h-4 w-4" aria-hidden="true" /> 내 PC 음악 파일
              </button>
              <input ref={musicInput} type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void setMusic(async () => f, f.name, { kind: "local" }); }} />
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
                      <button type="button" disabled={isBusy || !s.url || s.tooBig} onClick={() => s.url && void setMusic(() => fetchBlob(s.url as string), `${s.title} (AI 음악 스튜디오)`, { kind: "ams", ref: s.ref })}
                        className="rounded-lg border border-sky-500/40 px-2 py-1 text-[11px] text-sky-200 hover:bg-sky-500/10 disabled:opacity-40">고르기</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 5단계: 화면·자막 모양 + 미리보기 + 만들기 */}
      <section className={card}>
        {stepTitle(5, "화면 설정 · 미리보기 · 만들기")}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">화면 비율</p>
            <div className="flex flex-wrap gap-2">{ASPECTS.map((a) => <button key={a.id} type="button" disabled={isBusy} className={chip(project.aspect === a.id)} onClick={() => patch({ aspect: a.id })}>{a.label}</button>)}</div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">화질</p>
            <div className="flex flex-wrap gap-2">{(["720p", "1080p"] as EditQuality[]).map((q) => <button key={q} type="button" disabled={isBusy} className={chip(project.quality === q)} onClick={() => patch({ quality: q })}>{q}{q === "720p" ? " (빠름)" : ""}</button>)}</div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">장면 전환</p>
            <div className="flex flex-wrap gap-2">{([["fade", "부드럽게(페이드)"], ["crossfade", "겹쳐 바꾸기"], ["none", "바로 넘김"]] as [Transition, string][]).map(([id, label]) => <button key={id} type="button" disabled={isBusy} className={chip(project.transition === id)} onClick={() => patch({ transition: id })}>{label}</button>)}</div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">영상 원래 소리</p>
            <div className="flex flex-wrap gap-2">{([[false, "끄기"], [true, "켜기"]] as [boolean, string][]).map(([on, label]) => <button key={label} type="button" disabled={isBusy} className={chip(project.clipAudio === on)} onClick={() => patch({ clipAudio: on })}>{label}</button>)}</div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">자막 위치</p>
            <div className="flex flex-wrap gap-2">{POSITIONS.map((p) => <button key={p.id} type="button" disabled={isBusy} className={chip(project.captionPosition === p.id)} onClick={() => patch({ captionPosition: p.id })}>{p.label}</button>)}</div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">자막 모양</p>
            <div className="flex flex-wrap gap-2">{(Object.keys(CAPTION_STYLE_NAMES) as CaptionStyle[]).map((s) => <button key={s} type="button" disabled={isBusy} className={chip(project.captionStyle === s)} onClick={() => patch({ captionStyle: s })}>{CAPTION_STYLE_NAMES[s]}</button>)}</div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">자막 글자 크기</p>
            <div className="flex flex-wrap gap-2">{(Object.keys(CAPTION_SIZE_NAMES) as CaptionSize[]).map((s) => <button key={s} type="button" disabled={isBusy} className={chip((project.captionSize ?? "m") === s)} onClick={() => patch({ captionSize: s })}>{CAPTION_SIZE_NAMES[s]}</button>)}</div>
          </div>
        </div>

        {project.clips.length > 0 && (
          <div className={`mx-auto w-full ${previewWidth} overflow-hidden rounded-xl border border-zinc-800 bg-black`}>
            <Player component={EditComposition} inputProps={{ project }} durationInFrames={totalFrames} fps={FPS}
              compositionWidth={width} compositionHeight={height} controls acknowledgeRemotionLicense style={{ width: "100%" }} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <p className="text-sm text-zinc-300">완성 길이 <b className="text-white">{sec(total)}</b> · {width}×{height} · 렌더 비용 <b className="text-white">0원</b>(내 PC)</p>
          {!canRender ? (
            <p className="text-xs text-amber-200">렌더는 PC(크롬·엣지 최신 버전)에서 해 주세요. 휴대폰에서는 미리보기만 됩니다.</p>
          ) : render ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-sm text-sky-100"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> 만드는 중 {Math.round(render.progress * 100)}%</span>
              <button type="button" onClick={() => render.ctrl.abort()} className="text-sm text-zinc-400 hover:text-zinc-200">멈추기</button>
            </div>
          ) : (
            <button type="button" disabled={isBusy || project.clips.length === 0} onClick={() => void startRender()}
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
            <div className="flex flex-wrap items-center gap-2">
              <a href={result.url} download={outputFileName()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-500/10">
                <Download className="h-4 w-4" aria-hidden="true" /> MP4 내려받기
              </a>
              <button type="button" disabled={isBusy || !resultBlob.current} onClick={() => resultBlob.current && void saveEdit(resultBlob.current, result.seconds)}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-500/40 px-3 py-2 text-sm text-sky-100 hover:bg-sky-500/10 disabled:opacity-40">
                <ImagePlus className="h-4 w-4" aria-hidden="true" /> 갤러리에 저장(30일)
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">「갤러리에 저장」을 누르면 편집 내용과 함께 작업 결과 갤러리 「편집본」에 30일 보관됩니다(50MB까지).</p>
          </div>
        )}
      </section>
    </div>
  );
}
