"use client";
import { ArrayBufferTarget, FileSystemWritableFileStreamTarget, Muxer } from "mp4-muxer";

// 공용 기준 코드 `browser-mp4-encoder`(2026-10-21 엔진 공유 2번) — 기준: shorts-onestop-studio/src/lib/render/mp4Encoder.ts.
// 사본은 글자 그대로 쓴다(scripts/check-shared-modules.mjs). 화면을 어떻게 그릴지(drawFrame)와 어떤 소리를 넣을지는 각 프로그램이 정한다.
// 브라우저 안에서 MP4(H.264 + AAC/Opus) 만들기 — 서버 렌더 비용 없음. 소리는 OfflineAudioContext로 미리 섞어 실제로 인코딩한다
// (yt-playlist-studio 옛 코드는 오디오 인코더만 만들고 데이터를 넣지 않아 소리가 빠졌었다).
/** etaSeconds(2026-11-14 추가, 선택): 화면 그리기를 시작하고 2초가 지난 뒤부터 남은 예상 시간(초) */
export interface ExportProgress { pct: number; status: string; etaSeconds?: number }
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

export interface EncodeOptions {
  width: number; height: number; fps: number; total: number; audio: AudioBuffer | null;
  drawFrame: (ctx: CanvasRenderingContext2D, t: number) => Promise<void> | void;
  onProgress: (p: ExportProgress) => void; signal: AbortSignal; pctFrom?: number;
  /** 영상 비트레이트(기본 8Mbps). 화면이 매 장면 계속 움직이면(느린 확대 등) 파일이 커지므로 낮춰서 쓴다 */
  videoBitrate?: number;
}

/** drawFrame으로 한 장씩 그려 MP4로 묶는다(결과를 메모리에 모아 Blob으로). 진행률은 pctFrom~97%, 마지막 98%에 파일로 묶는다 */
export async function encodeMp4(o: EncodeOptions): Promise<Blob> {
  try {
    const target = new ArrayBufferTarget();
    await encodeInto(o, target, "in-memory", false);
    return new Blob([target.buffer], { type: "video/mp4" });
  } catch (e) {
    // 2026-11-15 하드웨어 가속 인코더가 출력 없이 멈추면(맥 사례) 기본 방식으로 한 번만 다시 만든다
    if (!(e instanceof EncoderStallError) || !e.hardware || o.signal.aborted) throw e;
    o.onProgress({ pct: o.pctFrom ?? 5, status: "영상 인코더가 응답하지 않아 기본 방식으로 다시 만드는 중…" });
    const target = new ArrayBufferTarget();
    await encodeInto(o, target, "in-memory", true);
    return new Blob([target.buffer], { type: "video/mp4" });
  }
}

/** 인코더가 정해진 시간 동안 진행하지 않음(출력 없이 멈춤). hardware: 하드웨어 가속 설정이었는지 */
export class EncoderStallError extends Error {
  constructor(readonly hardware: boolean) { super("영상 인코더가 응답하지 않습니다. 브라우저를 다시 열거나 크롬·엣지 최신 버전에서 다시 시도해 주세요."); }
}
const STALL_MS = 10_000;

/** 긴 영상용: 회원이 고른 파일(크롬·엣지 showSaveFilePicker의 쓰기 스트림)에 조금씩 바로 쓴다 — 메모리에 영상 전체를 모으지 않는다.
 *  끝나면 스트림을 닫고, 실패·취소하면 스트림을 버려 반쯤 쓴 파일이 남지 않게 한다. (2026-10-21 lyric-video-studio에서 추가) */
export async function encodeMp4ToFile(o: EncodeOptions & { stream: FileSystemWritableFileStream }): Promise<void> {
  try {
    await encodeInto(o, new FileSystemWritableFileStreamTarget(o.stream), false, false);
    await o.stream.close();
  } catch (e) {
    await o.stream.abort().catch(() => undefined);
    throw e;
  }
}

// 2026-11-14 영상 저장 안정화(음악 담당 제안, 참고 playlist-channel-studio/src/lib/render/video-exporter.ts P-2):
// (1) 코덱마다 하드웨어 가속을 먼저 확인하고 안 되면 기본 방식으로 자동 대체 (2) 저장하는 동안 화면 꺼짐 방지 (3) 남은 시간 어림.
const fmtEta = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분` : s >= 60 ? `${Math.floor(s / 60)}분 ${Math.round(s % 60)}초` : `${Math.max(1, Math.round(s))}초`);

/** 지원되는 첫 영상 설정(하드웨어 가속 우선). 없으면 null */
async function pickVideoConfig(W: number, H: number, FPS: number, BITRATE: number, noHardware: boolean): Promise<VideoEncoderConfig | null> {
  const tries: VideoEncoderConfig[] = [];
  const modes = noHardware ? (["prefer-software", "no-preference"] as const) : (["prefer-hardware", "no-preference"] as const);
  for (const codec of ["avc1.640028", "avc1.4d0028", "avc1.42e028"]) for (const hw of modes) tries.push({ codec, width: W, height: H, bitrate: BITRATE, framerate: FPS, hardwareAcceleration: hw });
  for (const c of tries) {
    try { const r = await VideoEncoder.isConfigSupported(c); if (r.supported) return r.config ?? c; } catch { /* 다음 설정 */ }
  }
  return null;
}

type WakeLock = { release: () => Promise<void> };
/** 화면 꺼짐 방지(지원하는 브라우저·보이는 탭만). 실패해도 저장은 계속 */
async function holdScreen(): Promise<WakeLock | null> {
  try {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLock> } }).wakeLock;
    return wl && document.visibilityState === "visible" ? await wl.request("screen") : null;
  } catch { return null; }
}

async function encodeInto(o: EncodeOptions, target: ArrayBufferTarget | FileSystemWritableFileStreamTarget, fastStart: "in-memory" | false, noHardware: boolean): Promise<void> {
  assertWebCodecs();
  const { width: W, height: H, fps: FPS, total, audio: mixed } = o; const BITRATE = o.videoBitrate ?? 8_000_000;
  const stop = () => { if (o.signal.aborted) throw new DOMException("취소", "AbortError"); };
  const vConfig = await pickVideoConfig(W, H, FPS, BITRATE, noHardware);
  if (!vConfig) throw new Error("이 컴퓨터에서 H.264 영상 인코딩을 쓸 수 없습니다. 최신 크롬·엣지에서 다시 시도해 주세요.");
  const RATE = MP4_AUDIO_RATE;
  const aCodec = mixed ? await pick([{ m: "aac" as const, c: "mp4a.40.2" }, { m: "opus" as const, c: "opus" }], async (x) => (await AudioEncoder.isConfigSupported({ codec: x.c, sampleRate: RATE, numberOfChannels: 2, bitrate: 160_000 })).supported === true) : null;
  if (mixed && !aCodec) throw new Error("이 컴퓨터에서 소리 인코딩을 쓸 수 없습니다. 최신 크롬·엣지에서 다시 시도해 주세요.");

  const muxer = new Muxer({ target, video: { codec: "avc", width: W, height: H, frameRate: FPS }, ...(aCodec ? { audio: { codec: aCodec.m, sampleRate: RATE, numberOfChannels: 2 } } : {}), fastStart, firstTimestampBehavior: "offset" });
  let failed: unknown = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { failed = e; } });
  venc.configure(vConfig);
  const aenc = aCodec ? new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { failed = e; } }) : null;
  aenc?.configure({ codec: aCodec!.c, sampleRate: RATE, numberOfChannels: 2, bitrate: 160_000 });

  const hardware = vConfig.hardwareAcceleration === "prefer-hardware";
  const stalled = () => new EncoderStallError(hardware);
  // 2026-11-15 대기열이 줄 때까지 기다리되, 멈추기·인코더 오류·STALL_MS 동안 진행 없음을 확인한다(예전엔 무한 대기 → 맥에서 5% 정지·멈추기 무반응)
  const drain = async (limit: number) => {
    let last = venc.encodeQueueSize, since = performance.now();
    while (venc.encodeQueueSize > limit) {
      stop(); if (failed) throw failed; if (venc.state === "closed") throw stalled();
      await new Promise((r) => setTimeout(r, 4));
      if (venc.encodeQueueSize < last) { last = venc.encodeQueueSize; since = performance.now(); }
      else if (performance.now() - since > STALL_MS) throw stalled();
    }
  };
  // flush도 끝없이 기다리지 않게: 멈추기·STALL_MS(영상 길이에 비례해 넉넉히) 중 먼저 오는 쪽으로 끝낸다
  const flushOrStall = (p: Promise<void>) => new Promise<void>((res, rej) => {
    const timer = setTimeout(() => rej(stalled()), STALL_MS * 3);
    const onAbort = () => rej(new DOMException("취소", "AbortError"));
    o.signal.addEventListener("abort", onAbort, { once: true });
    p.then(res, rej).finally(() => { clearTimeout(timer); o.signal.removeEventListener("abort", onAbort); });
  });
  const lock = await holdScreen();
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
    const frames = Math.ceil(total * FPS); const from = o.pctFrom ?? 5; const startedAt = performance.now();
    for (let f = 0; f < frames; f++) {
      stop(); if (failed) throw failed;
      const t = f / FPS;
      await o.drawFrame(ctx, t);
      const vf = new VideoFrame(canvas, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / FPS) });
      venc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
      await drain(6);
      if (f % 10 === 0) {
        const spent = (performance.now() - startedAt) / 1000; const eta = f > 0 && spent > 2 ? (spent / (f + 1)) * (frames - f - 1) : undefined;
        o.onProgress({ pct: Math.min(97, from + Math.round((f / frames) * (97 - from))), status: `영상 만드는 중… ${t.toFixed(1)} / ${total.toFixed(1)}초${eta !== undefined ? ` · 남은 시간 약 ${fmtEta(eta)}` : ""}`, etaSeconds: eta });
      }
    }
    o.onProgress({ pct: 98, status: "파일로 묶는 중…" });
    await flushOrStall(venc.flush()); if (aenc) await flushOrStall(aenc.flush());
    if (failed) throw failed;
    muxer.finalize();
  } finally {
    lock?.release().catch(() => undefined);
    if (venc.state !== "closed") venc.close();
    if (aenc && aenc.state !== "closed") aenc.close();
  }
}
