"use client";

// v1.15 최종 뮤직비디오 만들기 — 장면 영상(없으면 장면 이미지) + 이 뮤직비디오의 곡 + 장면별 가사 자막을 회원 PC 브라우저에서 MP4 한 편으로 렌더한다(서버 비용 0).
// 그리기·시간 계산은 공용 기준 코드 사본(video-edit-composition·video-edit-timeline, 기준 ai-video-studio). 장면 영상은 업체 서버에서 만든 파일이라 R1 시험을 하지 않는다.
import { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { renderMediaOnWeb } from "@remotion/web-renderer";
import { Download, Film, Loader2 } from "lucide-react";
import { EditComposition } from "@/components/edit/Composition";
import { CAPTION_SIZE_NAMES, CAPTION_STYLE_NAMES, FPS, dimensions, layout, splitEvenly, validate, type CaptionSize, type CaptionStyle, type EditClip, type EditProject, type EditQuality } from "@/lib/edit/timeline";
import { loadLocalSong } from "@/lib/music/localSong";
import { sceneLengthsFromLyrics } from "@/lib/music/sceneTiming";
import { detectBeat, snapLengths, type BeatInfo } from "@/lib/music/beat";
import { useStudio } from "@/components/studio/ProjectProvider";
import { BTN_GHOST, BTN_PRIMARY, Card } from "@/components/studio/ui";

const MAX_TOTAL_S = 420; // 곡 최대 7분
const FALLBACK_SCENE_S = 5;

/** v1.19 곡 소리를 풀어 박자를 찾는다(회원 브라우저에서, 비용 없음). 못 찾으면 null */
async function analyzeBeat(blob: Blob): Promise<BeatInfo | null> {
  try {
    const buf = await blob.arrayBuffer();
    const audio = await new OfflineAudioContext(1, 1, 22050).decodeAudioData(buf);
    const len = audio.length;
    const mono = new Float32Array(len);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const ch = audio.getChannelData(c);
      for (let i = 0; i < len; i++) mono[i] += ch[i] / audio.numberOfChannels;
    }
    return detectBeat(mono, audio.sampleRate);
  } catch {
    return null;
  }
}

function mediaDuration(src: string): Promise<number | null> {
  return new Promise((resolve) => {
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) && a.duration > 0 ? a.duration : null);
    a.onerror = () => resolve(null);
    a.src = src;
  });
}

export function FinalRender() {
  const { project, media } = useStudio();
  const { scenes, song } = project;
  const [songSrc, setSongSrc] = useState<string | null>(null);
  const [songSec, setSongSec] = useState<number | null>(null);
  const [songNote, setSongNote] = useState("");
  const [beat, setBeat] = useState<BeatInfo | null | "busy">(null);
  const [beatSnap, setBeatSnap] = useState(true);
  const [quality, setQuality] = useState<EditQuality>("720p");
  const [captions, setCaptions] = useState(true);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("yellow");
  const [captionSize, setCaptionSize] = useState<CaptionSize>("m");
  const [render, setRender] = useState<{ progress: number; ctrl: AbortController } | null>(null);
  const [result, setResult] = useState<{ url: string; mb: number; seconds: number } | null>(null);
  const [error, setError] = useState("");
  const [canRender, setCanRender] = useState(true);

  useEffect(() => {
    const check = () => setCanRender(window.innerWidth >= 768 && "VideoEncoder" in window);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 곡 소리를 브라우저 안 주소(blob)로 준비 — AI 음악 스튜디오 곡은 서명 주소에서 받아 오고, 내 PC 파일은 이 브라우저 보관함에서 꺼낸다
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    setSongSrc(null); setSongSec(null); setSongNote(""); setBeat(null);
    (async () => {
      if (!song) return;
      try {
        let blob: Blob | null = null;
        if (song.source === "ams" && song.ref) {
          const r = await fetch(`/api/music/ams?ref=${encodeURIComponent(song.ref)}`, { cache: "no-store" });
          const d = await r.json();
          if (!r.ok || !d.audioUrl) throw new Error(d.error || "곡을 불러오지 못했습니다.");
          blob = await (await fetch(d.audioUrl)).blob();
        } else if (song.source === "file") {
          blob = await loadLocalSong();
          if (!blob) throw new Error("이 브라우저에 보관된 곡 파일이 없습니다. 3단계(음악)에서 곡을 다시 올려 주세요.");
        }
        if (!blob || !alive) return;
        made = URL.createObjectURL(blob);
        const sec = await mediaDuration(made);
        if (!alive) return;
        setSongSrc(made); setSongSec(sec);
        setBeat("busy");
        const b = await analyzeBeat(blob);
        if (alive) setBeat(b);
      } catch (e) {
        if (alive) setSongNote(e instanceof Error ? e.message : "곡을 불러오지 못했습니다.");
      }
    })();
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [song?.source, song?.ref, song?.fileName]); // eslint-disable-line react-hooks/exhaustive-deps

  const usable = scenes.filter((s) => media[s.id]?.videoUrl || media[s.id]?.imageUrl);
  // v1.18 곡이 시간 가사(AI 음악 스튜디오 Lyria)면 장면 가사가 나오는 시각에 장면을 바꾸고, 못 맞추면 곡 길이를 고르게 나눈다
  const timed = songSec ? sceneLengthsFromLyrics(project.lyrics, usable.map((s) => s.lyric), songSec) : null;
  const base = timed ?? (songSec ? splitEvenly(songSec, usable.length) : usable.map(() => FALLBACK_SCENE_S));
  // v1.19 전환을 박자에 맞춤 — 가사 시각이면 가까운 박(조금만 옮김), 고르게 나눴으면 마디(4박) 시작
  const beatInfo = beat && beat !== "busy" ? beat : null;
  const lengths = songSec && beatSnap && beatInfo ? snapLengths(base, beatInfo, timed ? "beat" : "bar") : base;

  const editProject: EditProject = useMemo(() => {
    const clips: EditClip[] = usable.map((s, i) => {
      const m = media[s.id];
      const isVideo = Boolean(m?.videoUrl);
      return {
        id: s.id,
        src: (isVideo ? m?.videoUrl : m?.imageUrl) as string,
        name: `장면 ${i + 1}`,
        duration: lengths[i] ?? FALLBACK_SCENE_S,
        trimStart: 0,
        trimEnd: 0,
        // 「[Verse 1]」「(Chorus)」 같은 구간 표시는 자막에서 뺀다
        caption: captions ? s.lyric.replace(/\[[^\]]*\]|\((?:intro|verse|pre-?chorus|chorus|bridge|outro|hook)[^)]*\)/gi, " ").replace(/\s+/g, " ").trim().slice(0, 60) : "",
        kind: isVideo ? "video" : "image",
        loop: isVideo,
      };
    });
    return {
      clips,
      aspect: project.video.ratio === "9:16" ? "9:16" : "16:9",
      quality,
      transition: "fade",
      captionPosition: "bottom",
      captionStyle,
      captionSize,
      clipAudio: false,
      music: songSrc ? { src: songSrc, name: song?.title ?? "곡", volume: 1, fadeOut: true } : null,
    };
  }, [usable.map((s) => `${s.id}:${media[s.id]?.videoUrl ?? ""}:${media[s.id]?.imageUrl?.length ?? 0}:${s.lyric}`).join("|"), lengths.join(","), captions, captionStyle, captionSize, quality, songSrc, project.video.ratio]); // eslint-disable-line react-hooks/exhaustive-deps

  const { width, height } = dimensions(editProject.aspect, editProject.quality);
  const { totalFrames } = layout(editProject);
  const videoCount = usable.filter((s) => media[s.id]?.videoUrl).length;
  const busy = Boolean(render);

  async function start() {
    const problem = validate(editProject, MAX_TOTAL_S);
    if (problem) { setError(problem.replace("영상을 1개 이상 넣어 주세요", "장면 이미지나 영상을 1개 이상 먼저 만들어 주세요")); return; }
    setError("");
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    const ctrl = new AbortController();
    setRender({ progress: 0, ctrl });
    try {
      const out = await renderMediaOnWeb({
        composition: { component: EditComposition, id: "music-video", width, height, fps: FPS, durationInFrames: totalFrames, defaultProps: { project: editProject } },
        inputProps: { project: editProject },
        signal: ctrl.signal,
        onProgress: (p) => setRender((cur) => (cur ? { ...cur, progress: p.progress } : cur)),
        videoBitrate: "high",
        delayRenderTimeoutInMilliseconds: 60_000,
        logLevel: "error",
      });
      const blob = await out.getBlob();
      setResult({ url: URL.createObjectURL(blob), mb: Math.round(blob.size / 104857.6) / 10, seconds: totalFrames / FPS });
    } catch {
      setError(ctrl.signal.aborted ? "렌더를 멈췄습니다." : "뮤직비디오를 만들지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요. 계속되면 720p로 바꿔 주세요.");
    } finally {
      setRender(null);
    }
  }

  const chip = (on: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${on ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100" : "border-slate-700 text-slate-400 hover:text-slate-200"}`;
  const fileBase = (project.title || "music-video").replace(/[^A-Za-z0-9가-힣_-]+/g, "-").slice(0, 40) || "music-video";

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-extrabold text-white"><Film className="h-5 w-5 text-cyan-300" aria-hidden="true" /> 🎬 최종 뮤직비디오 만들기</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          장면 영상(없으면 장면 이미지)에 이 뮤직비디오의 곡과 가사 자막을 얹어 MP4 한 편으로 만듭니다. 내 PC 브라우저에서 만들어 비용이 들지 않습니다.
          곡에 시간 가사가 있으면 그 장면의 가사가 나오는 시각에 장면을 바꾸고, 없으면 곡 길이를 장면 수로 고르게 나눕니다. 곡의 박자를 찾으면 전환을 박자에 맞춥니다. 장면보다 짧은 영상은 반복 재생합니다.
        </p>
      </div>

      <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
        <p>장면 <b className="text-white">{usable.length}</b>/{scenes.length}개 (영상 {videoCount} · 이미지 {usable.length - videoCount})</p>
        <p>곡 {song ? (songSrc ? <b className="text-white">{song.title} · {songSec ? `${Math.round(songSec)}초` : "길이 확인 중"}</b> : songNote ? <span className="text-amber-200">{songNote}</span> : "불러오는 중…") : <span className="text-amber-200">없음 — 3단계에서 곡을 고르면 곡 길이에 맞춰집니다(지금은 장면마다 {FALLBACK_SCENE_S}초)</span>}</p>
        <p>완성 길이 <b className="text-white">{Math.round(totalFrames / FPS)}초</b> · {width}×{height}{songSec ? <> · 장면 길이 <b className={timed ? "text-emerald-300" : "text-white"}>{timed ? "가사 시각에 맞춤" : "고르게 나눔"}</b></> : null}</p>
        {songSrc && (
          <p className="sm:col-span-3">
            박자 {beat === "busy" ? "찾는 중…" : beatInfo ? <><b className="text-white">약 {Math.round(beatInfo.bpm)} BPM</b> · </> : <span className="text-slate-400">찾지 못해 장면 전환을 그대로 둡니다 · </span>}
            {beatInfo && (
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={beatSnap} disabled={busy} onChange={(e) => setBeatSnap(e.target.checked)} />
                장면 전환을 박자에 맞추기{timed ? "(가까운 박)" : "(마디 시작)"}
              </label>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["720p", "1080p"] as EditQuality[]).map((q) => <button key={q} type="button" disabled={busy} className={chip(quality === q)} onClick={() => setQuality(q)}>{q}{q === "720p" ? " (빠름)" : ""}</button>)}
        <span className="mx-1 text-slate-600">|</span>
        <button type="button" disabled={busy} className={chip(captions)} onClick={() => setCaptions((v) => !v)}>가사 자막 {captions ? "켜짐" : "꺼짐"}</button>
        {captions && (Object.keys(CAPTION_STYLE_NAMES) as CaptionStyle[]).map((s) => <button key={s} type="button" disabled={busy} className={chip(captionStyle === s)} onClick={() => setCaptionStyle(s)}>{CAPTION_STYLE_NAMES[s]}</button>)}
        {captions && (Object.keys(CAPTION_SIZE_NAMES) as CaptionSize[]).map((s) => <button key={s} type="button" disabled={busy} className={chip(captionSize === s)} onClick={() => setCaptionSize(s)}>글자 {CAPTION_SIZE_NAMES[s]}</button>)}
      </div>

      {usable.length > 0 && (
        <div className={`mx-auto w-full overflow-hidden rounded-xl border border-slate-800 bg-black ${editProject.aspect === "9:16" ? "max-w-[280px]" : "max-w-[640px]"}`}>
          <Player component={EditComposition} inputProps={{ project: editProject }} durationInFrames={totalFrames} fps={FPS}
            compositionWidth={width} compositionHeight={height} controls acknowledgeRemotionLicense style={{ width: "100%" }} />
        </div>
      )}

      {error && <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {!canRender ? (
          <p className="text-xs text-amber-200">렌더는 PC(크롬·엣지 최신 버전)에서 해 주세요. 휴대폰에서는 미리보기만 됩니다.</p>
        ) : render ? (
          <>
            <span className="flex items-center gap-2 text-sm text-cyan-100"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> 만드는 중 {Math.round(render.progress * 100)}%</span>
            <button type="button" className={BTN_GHOST} onClick={() => render.ctrl.abort()}>멈추기</button>
          </>
        ) : (
          <button type="button" className={BTN_PRIMARY} disabled={usable.length === 0} onClick={() => void start()}>
            <Film className="h-4 w-4" aria-hidden="true" /> <span>최종 뮤직비디오 만들기 (무료)</span>
          </button>
        )}
      </div>
      {render && <p className="text-[11px] text-slate-500">렌더하는 동안 이 탭을 닫지 마세요. 곡 길이와 PC 성능에 따라 몇 분 걸릴 수 있습니다(대략 곡 길이 안팎).</p>}

      {result && (
        <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
          <p className="text-sm font-bold text-emerald-200">완성했습니다 · {Math.round(result.seconds)}초 · {result.mb}MB</p>
          <video src={result.url} controls playsInline className={`mx-auto w-full rounded-lg bg-black ${editProject.aspect === "9:16" ? "max-w-[280px]" : "max-w-[640px]"}`} />
          <a href={result.url} download={`${fileBase}.mp4`} className={BTN_PRIMARY}><Download className="h-4 w-4" aria-hidden="true" /> <span>MP4 내려받기</span></a>
          <p className="text-[11px] text-slate-500">완성 영상은 서버에 저장되지 않습니다. 이 화면을 닫기 전에 내려받아 주세요.</p>
        </div>
      )}
    </Card>
  );
}
