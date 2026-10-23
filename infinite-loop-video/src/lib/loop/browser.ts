// 브라우저 전용: 비디오 프레임 추출과 ffmpeg.wasm 렌더링. 모든 처리는 이 기기 안에서만 이뤄진다.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { extractFeature, FRAME_SIZE, type FrameFeature } from "./analysis";
import { buildFilter, encodeArgs, normalize, type LoopParams } from "./plan";

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => { video.removeEventListener("seeked", done); resolve(); };
    video.addEventListener("seeked", done);
    video.currentTime = Math.min(Math.max(0, t), Math.max(0, video.duration - 0.001));
  });
}

/** 지정한 시각들의 프레임 특징을 뽑는다 (64x64로 줄여서 비교) */
export async function extractFeatures(
  video: HTMLVideoElement,
  times: number[],
  onProgress?: (done: number, total: number) => void,
  shouldCancel?: () => boolean
): Promise<FrameFeature[]> {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_SIZE; canvas.height = FRAME_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const out: FrameFeature[] = [];
  for (let i = 0; i < times.length; i++) {
    if (shouldCancel?.()) throw new Error("cancelled");
    await seekTo(video, times[i]);
    ctx.drawImage(video, 0, 0, FRAME_SIZE, FRAME_SIZE);
    out.push(extractFeature(ctx.getImageData(0, 0, FRAME_SIZE, FRAME_SIZE).data));
    if (i % 8 === 0) { onProgress?.(i + 1, times.length); await new Promise((r) => setTimeout(r, 0)); }
  }
  onProgress?.(times.length, times.length);
  return out;
}

const CORE_VERSION = "0.12.6";
const CORE_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;
let ffmpegPromise: Promise<FFmpeg> | null = null;

function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })().catch((e) => { ffmpegPromise = null; throw e; });
  }
  return ffmpegPromise;
}

export interface RenderResult { blob: Blob; ext: string; mime: string }

/** 루프 1회분을 만들고 반복 횟수만큼 이어 붙인다. 소리가 있으면 유지한다(GIF 제외). */
export async function renderLoop(
  file: File,
  params: LoopParams,
  onStatus: (message: string, ratio?: number) => void
): Promise<RenderResult> {
  const p = normalize(params);
  onStatus("변환 엔진을 불러오는 중입니다 (처음 한 번만 오래 걸립니다)");
  const ffmpeg = await getFFmpeg();
  const progress = ({ progress }: { progress: number }) => onStatus("렌더링 중", Math.max(0, Math.min(1, progress)));
  ffmpeg.on("progress", progress);
  const inName = "input" + (file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".mp4");
  const ext = p.format;
  const mime = p.format === "gif" ? "image/gif" : p.format === "webm" ? "video/webm" : "video/mp4";
  try {
    await ffmpeg.writeFile(inName, await fetchFile(file));
    const { filter, map } = buildFilter(p);
    const audio = p.hasAudio && p.format !== "gif";
    const unit = p.format === "webm" ? "unit.webm" : "unit.mp4";
    onStatus("루프 1회분 만드는 중");
    // GIF는 임시로 mp4 한 조각을 만든 뒤 팔레트 방식으로 변환한다
    const unitArgs = p.format === "gif" ? encodeArgs("mp4", false) : encodeArgs(p.format, audio);
    const code1 = await ffmpeg.exec(["-i", inName, "-filter_complex", filter, ...map, ...unitArgs, "-y", unit]);
    if (code1 !== 0) throw new Error("루프 만들기에 실패했습니다. 다른 구간이나 모드를 선택해 주세요.");

    let finalName = unit;
    if (p.format === "gif") {
      onStatus("GIF로 변환하는 중");
      const code = await ffmpeg.exec(["-i", unit, "-vf", "fps=15,scale='min(480,iw)':-2:flags=lanczos,split[a][b];[a]palettegen[pl];[b][pl]paletteuse", "-loop", "0", "-y", "out.gif"]);
      if (code !== 0) throw new Error("GIF 변환에 실패했습니다.");
      finalName = "out.gif"; // GIF는 재생기에서 무한 반복되므로 이어 붙이지 않는다
    } else if (p.repeat > 1) {
      onStatus(`${p.repeat}회 반복해 이어 붙이는 중`);
      const out = "out." + ext;
      const code = await ffmpeg.exec(["-stream_loop", String(p.repeat - 1), "-i", unit, "-c", "copy", "-y", out]);
      if (code !== 0) throw new Error("반복 이어붙이기에 실패했습니다.");
      finalName = out;
    }
    const data = (await ffmpeg.readFile(finalName)) as Uint8Array;
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    for (const name of [inName, unit, "out." + ext]) { try { await ffmpeg.deleteFile(name); } catch {} }
    return { blob: new Blob([copy], { type: mime }), ext, mime };
  } finally {
    ffmpeg.off("progress", progress);
  }
}
