"use client";

// R1 대책(루트 docs/PLAN_20261023_FREE_VIDEO_RENDERING.md 11절): 크롬 하드웨어 인코더로 만든 H.264를 @remotion/media <Video>에 넣으면
// 0.2초 프레임에서 멈춘다. 그래서 영상을 넣을 때마다 앞 10프레임(약 0.33초)을 작게 시험 렌더하고, 멈추면 소프트웨어로 다시 인코딩해 쓴다.
import { AbsoluteFill } from "remotion";
import { Video } from "@remotion/media";
import { renderMediaOnWeb } from "@remotion/web-renderer";
import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output } from "mediabunny";

const PROBE_TIMEOUT_MS = 12_000;

/** 영상·음악 파일 길이(초) */
export async function readDuration(blob: Blob): Promise<number> {
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  try {
    return await input.computeDuration();
  } finally {
    input.dispose();
  }
}

function ProbeClip({ src }: { src: string }) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Video src={src} muted objectFit="cover" style={{ width: 160, height: 160 }} />
    </AbsoluteFill>
  );
}

/** 앞 10프레임 시험 렌더 — 성공하면 true, 멈추거나 실패하면 false */
export async function probeClip(src: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const result = await renderMediaOnWeb({
      composition: { component: ProbeClip, id: "probe", width: 160, height: 160, fps: 30, durationInFrames: 10, defaultProps: { src } },
      inputProps: { src },
      frameRange: [0, 9],
      muted: true,
      signal: ctrl.signal,
      delayRenderTimeoutInMilliseconds: PROBE_TIMEOUT_MS - 2_000,
      logLevel: "error",
    });
    const blob = await result.getBlob();
    return blob.size > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** 소프트웨어 인코더로 다시 인코딩(H.264 MP4, 소리는 그대로 옮김) */
export async function reencodeSoftware(blob: Blob, onProgress?: (p: number) => void): Promise<Blob> {
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });
  try {
    const conversion = await Conversion.init({
      input,
      output,
      video: { codec: "avc", forceTranscode: true, hardwareAcceleration: "prefer-software" },
      showWarnings: false,
    });
    if (!conversion.isValid) throw new Error("이 영상 형식은 변환할 수 없습니다. MP4(H.264) 영상을 넣어 주세요.");
    if (onProgress) conversion.onProgress = (p) => onProgress(p);
    await conversion.execute();
    if (!target.buffer) throw new Error("영상 변환 결과가 비어 있습니다.");
    return new Blob([target.buffer], { type: "video/mp4" });
  } finally {
    input.dispose();
  }
}
