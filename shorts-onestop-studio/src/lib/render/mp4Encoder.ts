"use client";
import { ArrayBufferTarget, Muxer } from "mp4-muxer";

// 공용 기준 코드 `browser-mp4-encoder`(2026-10-21 엔진 공유 2번) — 기준: shorts-onestop-studio/src/lib/render/mp4Encoder.ts.
// 사본은 글자 그대로 쓴다(scripts/check-shared-modules.mjs). 화면을 어떻게 그릴지(drawFrame)와 어떤 소리를 넣을지는 각 프로그램이 정한다.
// 브라우저 안에서 MP4(H.264 + AAC/Opus) 만들기 — 서버 렌더 비용 없음. 소리는 OfflineAudioContext로 미리 섞어 실제로 인코딩한다
// (yt-playlist-studio 옛 코드는 오디오 인코더만 만들고 데이터를 넣지 않아 소리가 빠졌었다).
export interface ExportProgress { pct: number; status: string }
export const MP4_AUDIO_RATE = 48000;
const DUCK = 0.35;

export interface VoiceClip { src: string; at: number; dur: number }

async function pick<T>(list: T[], ok: (c: T) => Promise<boolean>): Promise<T | null> {
  for (const c of list) if (await ok(c).catch(() => false)) return c;
  return null;
}

export function assertWebCodecs(): void {
  if (typeof window === "undefined" || !("VideoEncoder" in window) || !("AudioEncoder" in window)) throw new Error("이 브라우저는 영상 만들기(WebCodecs)를 지원하지 않습니다. 최신 크롬·엣지에서 열어 주세요.");
}

/** 내레이션(정한 시각)과 배경음악(반복·목소리 구간 자동 볼륨·끝 1초 페이드아웃)을 한 트랙으로 섞는다. 소리가 하나도 없으면 null */
export async function mixVoiceAndBgm(o: { total: number; voices: VoiceClip[]; bgm?: { src: string; volume: number } | null; onStatus: (t: string) => void }): Promise<AudioBuffer | null> {
  const { total, voices, bgm } = o;
  if (!voices.length && !bgm) return null;
  const ctx = new OfflineAudioContext(2, Math.ceil(total * MP4_AUDIO_RATE), MP4_AUDIO_RATE);
  const decode = async (src: string) => ctx.decodeAudioData(await (await fetch(src)).arrayBuffer());
  for (let i = 0; i < voices.length; i++) {
    o.onStatus(`목소리 불러오는 중… (${i + 1}/${voices.length})`);
    const n = ctx.createBufferSource(); n.buffer = await decode(voices[i].src); n.connect(ctx.destination); n.start(voices[i].at);
  }
  if (bgm) {
    o.onStatus("배경음악 불러오는 중…");
    const n = ctx.createBufferSource(); n.buffer = await decode(bgm.src); n.loop = true;
    const g = ctx.createGain(); const full = bgm.volume, low = bgm.volume * DUCK;
    g.gain.setValueAtTime(full, 0);
    for (const v of voices) { // 목소리 앞뒤로 0.15초에 걸쳐 줄였다 키운다
      g.gain.setValueAtTime(full, Math.max(0, v.at - 0.15)); g.gain.linearRampToValueAtTime(low, v.at);
      g.gain.setValueAtTime(low, v.at + v.dur); g.gain.linearRampToValueAtTime(full, v.at + v.dur + 0.3);
    }
    g.gain.setValueAtTime(full, Math.max(0, total - 1)); g.gain.linearRampToValueAtTime(0, total); // 끝에서 1초 페이드아웃
    n.connect(g); g.connect(ctx.destination); n.start(0);
  }
  o.onStatus("소리를 섞는 중…");
  return ctx.startRendering();
}

/** drawFrame으로 한 장씩 그려 MP4로 묶는다. 진행률은 pctFrom~97%, 마지막 98%에 파일로 묶는다 */
export async function encodeMp4(o: {
  width: number; height: number; fps: number; total: number; audio: AudioBuffer | null;
  drawFrame: (ctx: CanvasRenderingContext2D, t: number) => Promise<void> | void;
  onProgress: (p: ExportProgress) => void; signal: AbortSignal; pctFrom?: number;
}): Promise<Blob> {
  assertWebCodecs();
  const { width: W, height: H, fps: FPS, total, audio: mixed } = o;
  const stop = () => { if (o.signal.aborted) throw new DOMException("취소", "AbortError"); };
  const vCodec = await pick(["avc1.640028", "avc1.4d0028", "avc1.42e028"], async (codec) => (await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: 8_000_000, framerate: FPS })).supported === true);
  if (!vCodec) throw new Error("이 컴퓨터에서 H.264 영상 인코딩을 쓸 수 없습니다. 최신 크롬·엣지에서 다시 시도해 주세요.");
  const RATE = MP4_AUDIO_RATE;
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
    const frames = Math.ceil(total * FPS); const from = o.pctFrom ?? 5;
    for (let f = 0; f < frames; f++) {
      stop(); if (failed) throw failed;
      const t = f / FPS;
      await o.drawFrame(ctx, t);
      const vf = new VideoFrame(canvas, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / FPS) });
      venc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
      while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
      if (f % 10 === 0) o.onProgress({ pct: Math.min(97, from + Math.round((f / frames) * (97 - from))), status: `영상 만드는 중… ${t.toFixed(1)} / ${total.toFixed(1)}초` });
    }
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
