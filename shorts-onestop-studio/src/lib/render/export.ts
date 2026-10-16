"use client";
import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { sceneVoices, type Bg, type ShortsScript } from "@/lib/script";
import { normalizeAudio } from "@/lib/voice";
import { FPS, H, LEAD, W, bgFor, loadFontsFor, normalizeDesign, renderFrame, segmentAt, timeline } from "@/lib/render/scene";

// 브라우저 안에서 MP4(1080×1920·30fps, H.264 + AAC/Opus) 만들기 — 서버 렌더 비용 없음.
// 화면은 미리보기와 같은 renderFrame으로 한 장씩 그리고, 소리는 내레이션·배경음악을 OfflineAudioContext로 미리 섞는다.
// 참고: yt-playlist-studio video-exporter(mp4-muxer + WebCodecs). 그쪽은 오디오 인코더를 만들고 데이터를 넣지 않아 소리가 빠진다 — 여기서는 실제로 넣는다.
export interface ExportProgress { pct: number; status: string }
const RATE = 48000, DUCK = 0.35;

async function pick<T>(list: T[], ok: (c: T) => Promise<boolean>): Promise<T | null> {
  for (const c of list) if (await ok(c).catch(() => false)) return c;
  return null;
}

/** 내레이션(장면 시작+LEAD)과 배경음악(반복·목소리 구간 자동 볼륨)을 한 트랙으로 섞는다 */
async function mixAudio(s: ShortsScript, total: number, urls: Record<string, string>, onStatus: (t: string) => void): Promise<AudioBuffer | null> {
  const { segs } = timeline(s); const vs = sceneVoices(s); const bgm = normalizeAudio(s.audio).bgm;
  const voices = vs.map((v, i) => (v.voice && urls[v.voice.path] ? { src: urls[v.voice.path], at: segs[i].start + LEAD, dur: v.voice.dur } : null)).filter((x): x is { src: string; at: number; dur: number } => !!x);
  if (!voices.length && !(bgm && urls[bgm.path])) return null;
  const ctx = new OfflineAudioContext(2, Math.ceil(total * RATE), RATE);
  const decode = async (src: string) => ctx.decodeAudioData(await (await fetch(src)).arrayBuffer());
  for (let i = 0; i < voices.length; i++) {
    onStatus(`목소리 불러오는 중… (${i + 1}/${voices.length})`);
    const n = ctx.createBufferSource(); n.buffer = await decode(voices[i].src); n.connect(ctx.destination); n.start(voices[i].at);
  }
  if (bgm && urls[bgm.path]) {
    onStatus("배경음악 불러오는 중…");
    const n = ctx.createBufferSource(); n.buffer = await decode(urls[bgm.path]); n.loop = true;
    const g = ctx.createGain(); const full = bgm.volume, low = bgm.volume * DUCK;
    g.gain.setValueAtTime(full, 0);
    for (const v of voices) { // 목소리 앞뒤로 0.15초에 걸쳐 줄였다 키운다
      g.gain.setValueAtTime(full, Math.max(0, v.at - 0.15)); g.gain.linearRampToValueAtTime(low, v.at);
      g.gain.setValueAtTime(low, v.at + v.dur); g.gain.linearRampToValueAtTime(full, v.at + v.dur + 0.3);
    }
    g.gain.setValueAtTime(full, Math.max(0, total - 1)); g.gain.linearRampToValueAtTime(0, total); // 끝에서 1초 페이드아웃
    n.connect(g); g.connect(ctx.destination); n.start(0);
  }
  onStatus("소리를 섞는 중…");
  return ctx.startRendering();
}

/** 배경 영상 요소를 장면 안 시각으로 맞춘다(미리보기처럼 반복 재생) */
function seekVideo(v: HTMLVideoElement, t: number): Promise<void> {
  const d = v.duration; if (!d || !Number.isFinite(d)) return Promise.resolve();
  const target = t % d; if (Math.abs(v.currentTime - target) < 0.5 / FPS) return Promise.resolve();
  return new Promise((res) => { const done = () => { clearTimeout(to); v.removeEventListener("seeked", done); res(); }; const to = setTimeout(done, 3000); v.addEventListener("seeked", done); v.currentTime = target; });
}

export async function exportMp4(o: {
  script: ShortsScript; media: (bg: Bg) => CanvasImageSource | null; audioUrls: Record<string, string>;
  onProgress: (p: ExportProgress) => void; signal: AbortSignal;
}): Promise<Blob> {
  if (typeof window === "undefined" || !("VideoEncoder" in window) || !("AudioEncoder" in window)) throw new Error("이 브라우저는 영상 만들기(WebCodecs)를 지원하지 않습니다. 최신 크롬·엣지에서 열어 주세요.");
  const s = o.script, d = normalizeDesign(s.design as never); const { segs, total } = timeline(s);
  const stop = () => { if (o.signal.aborted) throw new DOMException("취소", "AbortError"); };
  o.onProgress({ pct: 1, status: "글꼴·소리 준비 중…" });
  await loadFontsFor(s, d);
  const mixed = await mixAudio(s, total, o.audioUrls, (status) => o.onProgress({ pct: 3, status }));
  stop();

  const vCodec = await pick(["avc1.640028", "avc1.4d0028", "avc1.42e028"], async (codec) => (await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: 8_000_000, framerate: FPS })).supported === true);
  if (!vCodec) throw new Error("이 컴퓨터에서 H.264 영상 인코딩을 쓸 수 없습니다. 최신 크롬·엣지에서 다시 시도해 주세요.");
  const aCodec = mixed ? await pick([{ m: "aac" as const, c: "mp4a.40.2" }, { m: "opus" as const, c: "opus" }], async (x) => (await AudioEncoder.isConfigSupported({ codec: x.c, sampleRate: RATE, numberOfChannels: 2, bitrate: 160_000 })).supported === true) : null;
  if (mixed && !aCodec) throw new Error("이 컴퓨터에서 소리 인코딩을 쓸 수 없습니다. 최신 크롬·엣지에서 다시 시도해 주세요.");

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: "avc", width: W, height: H, frameRate: FPS }, ...(aCodec ? { audio: { codec: aCodec.m, sampleRate: RATE, numberOfChannels: 2 } } : {}), fastStart: "in-memory", firstTimestampBehavior: "offset" });
  let failed: unknown = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { failed = e; } });
  venc.configure({ codec: vCodec, width: W, height: H, bitrate: 8_000_000, framerate: FPS });
  const aenc = aCodec ? new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { failed = e; } }) : null;
  aenc?.configure({ codec: aCodec!.c, sampleRate: RATE, numberOfChannels: 2, bitrate: 160_000 });

  try {
    // 소리 먼저 인코딩(0.1초 단위)
    if (mixed && aenc) {
      const L = mixed.getChannelData(0), R = mixed.numberOfChannels > 1 ? mixed.getChannelData(1) : L, step = RATE / 10;
      for (let i = 0; i < mixed.length; i += step) {
        const n = Math.min(step, mixed.length - i); const buf = new Float32Array(n * 2); buf.set(L.subarray(i, i + n), 0); buf.set(R.subarray(i, i + n), n);
        const ad = new AudioData({ format: "f32-planar", sampleRate: RATE, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i / RATE) * 1e6), data: buf });
        aenc.encode(ad); ad.close();
      }
    }
    // 화면을 한 장씩 그려 인코딩
    const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d", { alpha: false }); if (!ctx) throw new Error("그리기 화면을 만들지 못했습니다.");
    const frames = Math.ceil(total * FPS); const touched = new Set<HTMLVideoElement>();
    try {
    for (let f = 0; f < frames; f++) {
      stop(); if (failed) throw failed;
      const t = f / FPS; const seg = segmentAt(segs, t); const bg = bgFor(s, seg); const el = bg ? o.media(bg) : null;
      if (el instanceof HTMLVideoElement) { if (!touched.has(el)) { touched.add(el); el.pause(); } await seekVideo(el, t - seg.start); }
      renderFrame(ctx, s, d, t, { media: o.media });
      const vf = new VideoFrame(canvas, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / FPS) });
      venc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
      while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
      if (f % 10 === 0) o.onProgress({ pct: Math.min(97, 5 + Math.round((f / frames) * 92)), status: `영상 만드는 중… ${t.toFixed(1)} / ${total.toFixed(1)}초` });
    }
    } finally { touched.forEach((v) => void v.play().catch(() => undefined)); } // 미리보기 재생 상태로 되돌림
    o.onProgress({ pct: 98, status: "파일로 묶는 중…" });
    await venc.flush(); if (aenc) await aenc.flush();
    if (failed) throw failed;
    muxer.finalize();
    return new Blob([target.buffer], { type: "video/mp4" });
  } finally {
    if (venc.state !== "closed") venc.close();
    if (aenc && aenc.state !== "closed") aenc.close();
  }
}
