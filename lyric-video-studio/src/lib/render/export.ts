"use client";
import { sizeFor } from "@/lib/design";
import { drawFrame, ensureFonts, type DrawCache, type Scene } from "@/lib/render/draw";
import { assertWebCodecs, encodeMp4, MP4_AUDIO_RATE, type ExportProgress } from "@/lib/render/mp4Encoder";

// 브라우저 안에서 가사 영상 MP4 만들기(1080p, H.264 + AAC/Opus) — 서버 렌더 비용 없음.
// 인코딩·파일 묶기는 공용 기준 코드 mp4Encoder.ts(`browser-mp4-encoder` 사본), 화면은 미리보기와 같은 drawFrame.
export type { ExportProgress };

/** 곡 파일을 48kHz로 디코딩한다(MP4 소리와 스펙트럼 계산에 함께 쓴다) */
export async function decodeSong(file: Blob): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, 1, MP4_AUDIO_RATE);
  try { return await ctx.decodeAudioData(await file.arrayBuffer()); }
  catch { throw new Error("음악 파일을 읽지 못했습니다. mp3·wav·m4a 파일인지 확인해 주세요."); }
}

/** 내보낼 수 있는 길이(이보다 길면 브라우저 메모리가 부족할 수 있다) */
export const MAX_EXPORT_SECONDS = 12 * 60;

export async function exportLyricVideo(o: { scene: Scene; audio: AudioBuffer; onProgress: (p: ExportProgress) => void; signal: AbortSignal }): Promise<Blob> {
  assertWebCodecs();
  const { W, H } = sizeFor(o.scene.design.aspect);
  const total = o.audio.duration;
  if (total > MAX_EXPORT_SECONDS) throw new Error(`곡이 너무 깁니다(${Math.round(total / 60)}분). ${MAX_EXPORT_SECONDS / 60}분 이하 곡으로 만들어 주세요.`);
  o.onProgress({ pct: 1, status: "글꼴 준비 중…" });
  await ensureFonts(o.scene.design);
  const cache: DrawCache = {};
  return encodeMp4({
    width: W, height: H, fps: o.scene.design.fps, total, audio: o.audio, pctFrom: 3,
    onProgress: o.onProgress, signal: o.signal,
    drawFrame: (ctx, t) => drawFrame(ctx, W, H, o.scene, t, cache),
  });
}
