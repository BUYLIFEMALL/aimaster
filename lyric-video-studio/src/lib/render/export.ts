"use client";
import { sizeFor } from "@/lib/design";
import { drawFrame, ensureFonts, type DrawCache, type Scene } from "@/lib/render/draw";
import { assertWebCodecs, encodeMp4, encodeMp4ToFile, MP4_AUDIO_RATE, type EncodeOptions, type ExportProgress } from "@/lib/render/mp4Encoder";

// 브라우저 안에서 가사 영상 MP4 만들기(1080p, H.264 + AAC/Opus) — 서버 렌더 비용 없음.
// 인코딩·파일 묶기는 공용 기준 코드 mp4Encoder.ts(`browser-mp4-encoder` 사본), 화면은 미리보기와 같은 drawFrame.
export type { ExportProgress };

/** 곡 파일을 48kHz로 디코딩한다(MP4 소리와 스펙트럼 계산에 함께 쓴다) */
export async function decodeSong(file: Blob): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, 1, MP4_AUDIO_RATE);
  try { return await ctx.decodeAudioData(await file.arrayBuffer()); }
  catch { throw new Error("음악 파일을 읽지 못했습니다. mp3·wav·m4a 파일인지 확인해 주세요."); }
}

/** 내보낼 수 있는 길이 — 메모리에 모으는 방식(기본)은 12분, 파일로 바로 저장(크롬·엣지)은 30분(디코딩한 소리가 메모리에 있어야 해서) */
export const MAX_EXPORT_SECONDS = 12 * 60;
export const MAX_FILE_EXPORT_SECONDS = 30 * 60;

/** 이 브라우저가 「파일로 바로 저장」(저장 위치를 고르고 조금씩 쓰기)을 지원하는지 */
export const canSaveToFile = () => typeof window !== "undefined" && "showSaveFilePicker" in window;

interface SaveFilePickerWindow { showSaveFilePicker(o: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }): Promise<FileSystemFileHandle> }

/** 저장 위치 고르기 — 버튼을 누른 직후(다른 await보다 먼저) 불러야 브라우저가 허락한다. 회원이 취소하면 null */
export async function pickSaveFile(name: string): Promise<FileSystemFileHandle | null> {
  try { return await (window as unknown as SaveFilePickerWindow).showSaveFilePicker({ suggestedName: name, types: [{ description: "MP4 영상", accept: { "video/mp4": [".mp4"] } }] }); }
  catch (e) { if (e instanceof DOMException && e.name === "AbortError") return null; throw e; }
}

async function prepare(o: { scene: Scene; audio: AudioBuffer; onProgress: (p: ExportProgress) => void; signal: AbortSignal }, max: number): Promise<EncodeOptions> {
  assertWebCodecs();
  const { W, H } = sizeFor(o.scene.design.aspect);
  const total = o.audio.duration;
  if (total > max) throw new Error(`곡이 너무 깁니다(${Math.round(total / 60)}분). ${max / 60}분 이하 곡으로 만들어 주세요.`);
  o.onProgress({ pct: 1, status: "글꼴 준비 중…" });
  await ensureFonts(o.scene.design);
  const cache: DrawCache = {};
  return {
    width: W, height: H, fps: o.scene.design.fps, total, audio: o.audio, pctFrom: 3,
    onProgress: o.onProgress, signal: o.signal,
    drawFrame: (ctx, t) => drawFrame(ctx, W, H, o.scene, t, cache),
  };
}

export async function exportLyricVideo(o: { scene: Scene; audio: AudioBuffer; onProgress: (p: ExportProgress) => void; signal: AbortSignal }): Promise<Blob> {
  return encodeMp4(await prepare(o, MAX_EXPORT_SECONDS));
}

/** 고른 파일에 바로 쓰기(긴 곡용) — 결과를 메모리에 모으지 않는다 */
export async function exportLyricVideoToFile(o: { scene: Scene; audio: AudioBuffer; onProgress: (p: ExportProgress) => void; signal: AbortSignal; file: FileSystemFileHandle }): Promise<void> {
  const stream = await o.file.createWritable();
  let opts: EncodeOptions;
  try { opts = await prepare(o, MAX_FILE_EXPORT_SECONDS); } catch (e) { await stream.abort().catch(() => undefined); throw e; }
  await encodeMp4ToFile({ ...opts, stream });
}
