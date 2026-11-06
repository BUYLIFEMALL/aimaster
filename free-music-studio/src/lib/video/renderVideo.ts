// 영상 그리기·인코딩(브라우저) — 원본 boks-music `electron/canvas-render/page.mjs`(MIT, © 2026 boksajang) 루프를 옮김.
// 원본은 숨은 Electron 창이 그려 파일에 바로 썼지만, 여기서는 사이트 화면이 그려 내 PC 엔진에 조각으로 올린다.
// 프레임은 언제나 정확한 시각(frame / fps)으로 그려 속도와 상관없이 매끄럽다(화면 캡처 아님).
import { createCanvasScene, unpackAnalysis, boundedBitmap } from "./canvas-scene.mjs";
import { canvasBitrate, h264Codec, type ResolvedVideoOptions } from "./videoOptions";
import { EngineError, cancelVideo, finishVideo, getVideoAnalysis, uploadVideoChunk, type VideoSession } from "@/lib/engine";

export type RenderTrack = { title: string; cues: { start: number; end: number | null; text: string }[]; art: Blob | null };
export type RenderProgress = { stage: string; framesRendered: number; totalFrames: number; hardware: boolean | null };

const UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB씩 모아 올린다
const MAX_PENDING = 64 * 1024 * 1024; // 올리지 못한 조각이 64MB를 넘으면 그리기를 잠시 멈춘다

/** 이 브라우저가 영상을 그릴 수 있는가(WebCodecs H.264 + OffscreenCanvas) */
export function canRenderVideo(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window && "OffscreenCanvas" in window && "VideoFrame" in window;
}

async function encoderConfig({ width, height, fps }: { width: number; height: number; fps: number }) {
  const base: VideoEncoderConfig = {
    codec: h264Codec({ width, height, fps }),
    width,
    height,
    bitrate: canvasBitrate({ width, height, fps }),
    bitrateMode: "variable",
    framerate: fps,
    avc: { format: "annexb" },
    latencyMode: "quality",
  };
  for (const hardwareAcceleration of ["prefer-hardware", "prefer-software"] as const) {
    const config = { ...base, hardwareAcceleration };
    if ((await VideoEncoder.isConfigSupported(config)).supported) return { config, hardware: hardwareAcceleration === "prefer-hardware" };
  }
  throw new Error("이 브라우저·PC에서 H.264 영상 인코더를 쓸 수 없습니다. Chrome·Edge 최신 버전에서 다시 해 주세요.");
}

/** 같은 조각을 몇 번 다시 보내도 엔진이 위치(offset)로 걸러 안전하다 */
async function upload(id: string, offset: number, bytes: Uint8Array) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await uploadVideoChunk(id, offset, bytes);
    } catch (e) {
      if (attempt >= 3 || (e instanceof EngineError && e.needPair)) throw e;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

/**
 * 엔진이 음원 분석을 마친 작업(status "rendering")의 한 바퀴를 그려 올리고 마무리를 맡긴다.
 * 그 뒤 담기·반복·검증은 엔진이 한다(getVideoSession으로 상태 확인).
 */
export async function renderSessionVideo(
  session: VideoSession,
  input: { scene: string; options: ResolvedVideoOptions; tracks: RenderTrack[]; background: Blob | null },
  { onProgress = () => {}, signal }: { onProgress?: (p: RenderProgress) => void; signal?: AbortSignal } = {}
): Promise<VideoSession> {
  const timing = session.timing;
  if (!timing) throw new Error("엔진이 아직 음원 분석을 마치지 않았습니다.");
  const { width, height, fps } = session.options;
  const totalFrames = timing.cycleFrames;
  const bitmaps: ImageBitmap[] = [];
  try {
    onProgress({ stage: "곡 분석 받는 중", framesRendered: 0, totalFrames, hardware: null });
    const analyses = [];
    for (let i = 0; i < session.tracks.length; i++) {
      signal?.throwIfAborted();
      analyses.push(unpackAnalysis(await getVideoAnalysis(session.id, i)));
    }
    // 앨범 그림은 화면 짧은 변 정도까지만 풀어 둔다(긴 플레이리스트도 메모리 안에)
    const bitmap = async (blob: Blob | null, limit: number) => {
      if (!blob) return null;
      try {
        const b = await boundedBitmap(blob, limit);
        bitmaps.push(b);
        return b;
      } catch {
        return null;
      }
    };
    const background = await bitmap(input.background, 4096);
    const artLimit = Math.min(2048, Math.max(1024, Math.min(width, height)));
    const arts = [];
    for (const t of input.tracks) arts.push(await bitmap(t.art, artLimit));
    const scene = createCanvasScene({
      scene: input.scene,
      width,
      height,
      tracks: session.tracks.map((t, i) => ({ title: input.tracks[i]?.title ?? t.title, duration: t.duration ?? 0, cues: input.tracks[i]?.cues ?? [] })),
      options: { ...input.options, width, height, fps },
      images: { background, arts },
      analyses,
    });
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("그림판(캔버스)을 만들지 못했습니다.");
    const { config, hardware } = await encoderConfig({ width, height, fps });

    // 인코딩된 조각 → 4MB씩 모아 순서대로 올린다
    let parts: Uint8Array[] = [];
    let partBytes = 0;
    let sent = 0;
    let confirmed = 0;
    let chain: Promise<void> = Promise.resolve();
    let uploadError: unknown = null;
    const flush = () => {
      if (!partBytes) return;
      const merged = new Uint8Array(partBytes);
      let at = 0;
      for (const p of parts) {
        merged.set(p, at);
        at += p.length;
      }
      parts = [];
      partBytes = 0;
      const offset = sent;
      sent += merged.length;
      chain = chain.then(async () => {
        if (uploadError) return;
        try {
          confirmed = await upload(session.id, offset, merged);
        } catch (e) {
          uploadError = e;
        }
      });
    };
    let encodeError: unknown = null;
    const encoder = new VideoEncoder({
      output: (chunk) => {
        const bytes = new Uint8Array(chunk.byteLength);
        chunk.copyTo(bytes);
        parts.push(bytes);
        partBytes += bytes.length;
        if (partBytes >= UPLOAD_BYTES) flush();
      },
      error: (e) => {
        encodeError = e;
      },
    });
    encoder.configure(config);
    const keyInterval = Math.max(1, Math.round(fps * 2));
    try {
      for (let frame = 0; frame < totalFrames; frame++) {
        if (encodeError) throw encodeError;
        if (uploadError) throw uploadError;
        signal?.throwIfAborted();
        scene.draw(ctx, frame / fps);
        const videoFrame = new VideoFrame(canvas, { timestamp: Math.round((frame * 1e6) / fps), duration: Math.round(1e6 / fps) });
        encoder.encode(videoFrame, { keyFrame: frame % keyInterval === 0 });
        videoFrame.close();
        if (encoder.encodeQueueSize > 24) await new Promise((r) => encoder.addEventListener("dequeue", r, { once: true }));
        if (sent - confirmed > MAX_PENDING) await chain;
        if (frame % 30 === 0) {
          onProgress({ stage: "화면에서 그리는 중", framesRendered: frame, totalFrames, hardware });
          await new Promise((r) => setTimeout(r, 0)); // 화면이 멈추지 않게 잠깐 양보
        }
      }
      await encoder.flush();
    } finally {
      if (encoder.state !== "closed") encoder.close();
    }
    if (encodeError) throw encodeError;
    flush();
    onProgress({ stage: "남은 조각 올리는 중", framesRendered: totalFrames, totalFrames, hardware });
    await chain;
    if (uploadError) throw uploadError;
    signal?.throwIfAborted();
    return await finishVideo(session.id, { frames: totalFrames, written: sent, hardware, codec: String(config.codec) });
  } catch (e) {
    await cancelVideo(session.id).catch(() => {});
    if (signal?.aborted) throw new Error("영상 만들기를 취소했습니다.");
    throw e instanceof Error ? e : new Error(String(e));
  } finally {
    for (const b of bitmaps) b.close();
  }
}
