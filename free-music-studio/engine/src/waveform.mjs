// 곡 파형(0.6.9) — 원본 boks-music `electron/stem-waveform.mjs`·`audio-waveform.mjs`(MIT, © 2026 boksajang)를 옮김.
// WAV는 머리글을 직접 읽어 칸마다 가장 큰 값을 재고, FLAC·MP3는 ffmpeg로 8kHz 모노 WAV로 바꾼 뒤 잰다.
// 결과 { peaks: number[](0~1), duration: 초 } — 같은 파일(크기·수정 시각)은 기억해 다시 계산하지 않는다.
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, open, rm, stat } from "node:fs/promises";
import path from "node:path";

const wavCache = new Map();

/** WAV 파일의 파형(bins칸) — WAV가 아니거나 지원하지 않는 형식이면 오류 */
export async function wavWaveform(file, bins = 640) {
  const handle = await open(file, "r");
  try {
    const stats = await handle.stat();
    const key = `${file}:${stats.size}:${stats.mtimeMs}:${bins}`;
    if (wavCache.has(key)) return wavCache.get(key);
    const header = Buffer.alloc(12);
    await handle.read(header, 0, 12, 0);
    if (header.toString("ascii", 0, 4) !== "RIFF" || header.toString("ascii", 8, 12) !== "WAVE") throw new Error("파형을 표시할 수 없는 오디오 형식입니다. 재생은 할 수 있습니다.");
    let format, channels, rate, bits, align, dataStart, dataSize;
    for (let offset = 12; offset + 8 <= stats.size; ) {
      const chunk = Buffer.alloc(8);
      await handle.read(chunk, 0, 8, offset);
      const name = chunk.toString("ascii", 0, 4);
      const size = chunk.readUInt32LE(4);
      if (offset + 8 + size > stats.size) throw new Error("오디오 파일이 완전하지 않습니다.");
      if (name === "fmt ") {
        if (size < 16) throw new Error("오디오 머리글이 올바르지 않습니다.");
        const fmt = Buffer.alloc(Math.min(size, 40));
        await handle.read(fmt, 0, fmt.length, offset + 8);
        format = fmt.readUInt16LE(0);
        channels = fmt.readUInt16LE(2);
        rate = fmt.readUInt32LE(4);
        align = fmt.readUInt16LE(12);
        bits = fmt.readUInt16LE(14);
        if (format === 65534 && fmt.length >= 40) format = fmt.readUInt16LE(24);
      }
      if (name === "data") {
        dataStart = offset + 8;
        dataSize = size;
      }
      offset += 8 + size + (size % 2);
      if (format && dataStart !== undefined) break;
    }
    const okBits = format === 3 ? [32, 64] : [8, 16, 24, 32];
    if (!channels || !rate || !align || dataStart === undefined || !dataSize || ![1, 3].includes(format) || !okBits.includes(bits) || align !== (channels * bits) / 8 || dataSize % align) {
      throw new Error("이 오디오의 파형 분석은 지원하지 않습니다. 재생은 할 수 있습니다.");
    }
    const frames = dataSize / align;
    const peaks = new Array(bins).fill(0);
    const bytes = bits / 8;
    const buffer = Buffer.alloc(Math.max(align, Math.floor(262144 / align) * align));
    for (let position = 0; position < dataSize; ) {
      const count = Math.min(buffer.length, dataSize - position);
      const read = await handle.read(buffer, 0, count, dataStart + position);
      if (read.bytesRead !== count) throw new Error("파형을 재는 중에 파일이 바뀌었습니다.");
      for (let o = 0; o < count; o += align) {
        let peak = 0;
        for (let c = 0; c < channels; c++) {
          const i = o + c * bytes;
          const v = format === 3 ? (bits === 32 ? buffer.readFloatLE(i) : buffer.readDoubleLE(i)) : bits === 8 ? (buffer[i] - 128) / 128 : buffer.readIntLE(i, bytes) / 2 ** (bits - 1);
          if (Number.isFinite(v)) peak = Math.max(peak, Math.min(1, Math.abs(v)));
        }
        const bin = Math.min(bins - 1, Math.floor((((position + o) / align) * bins) / frames));
        peaks[bin] = Math.max(peaks[bin], peak);
      }
      position += count;
    }
    const result = { peaks, duration: frames / rate };
    if (wavCache.size >= 32) wavCache.delete(wavCache.keys().next().value);
    wavCache.set(key, result);
    return result;
  } finally {
    await handle.close();
  }
}

const cache = new Map();
const pending = new Map();

/**
 * 어떤 음원이든 파형(1600칸) — WAV가 아니면 ffmpeg로 바꿔서 잰다.
 * @param {string} file
 * @param {{ ffmpeg?: string|null, tmpDir: string }} o ffmpeg 실행 이름(없으면 WAV만)
 */
export async function audioWaveform(file, { ffmpeg = "ffmpeg", tmpDir }) {
  const info = await stat(file);
  const key = `${file}:${info.size}:${info.mtimeMs}`;
  if (cache.has(key)) return cache.get(key);
  if (pending.has(key)) return pending.get(key);
  const job = (async () => {
    let result;
    try {
      result = await wavWaveform(file, 1600);
    } catch (original) {
      if (!ffmpeg) throw original;
      await mkdir(tmpDir, { recursive: true });
      const dir = await mkdtemp(path.join(tmpDir, "waveform-"));
      try {
        const out = path.join(dir, "audio.wav");
        await new Promise((resolve, reject) => {
          const child = spawn(ffmpeg, ["-hide_banner", "-nostdin", "-v", "error", "-n", "-i", file, "-map", "0:a:0", "-vn", "-ac", "1", "-ar", "8000", "-c:a", "pcm_s16le", out], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
          let err = "";
          const timer = setTimeout(() => {
            err = "파형을 재는 데 너무 오래 걸립니다.";
            child.kill("SIGKILL");
          }, 120_000);
          child.stderr.on("data", (d) => (err = (err + d).slice(-2000)));
          child.on("error", (e) => (clearTimeout(timer), reject(e)));
          child.on("close", (code) => (clearTimeout(timer), code === 0 ? resolve() : reject(new Error(`파형을 읽지 못했습니다. ${err}`))));
        });
        result = await wavWaveform(out, 1600);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
    if (cache.size >= 24) cache.delete(cache.keys().next().value);
    cache.set(key, result);
    return result;
  })();
  pending.set(key, job);
  try {
    return await job;
  } finally {
    pending.delete(key);
  }
}
