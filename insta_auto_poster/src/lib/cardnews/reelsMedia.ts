// 🎬 릴스 파일 → 떡상 리메이크 재료(v1.49). 영상 파일은 서버·저장소로 보내지 않고 이 브라우저 안에서
// 장면 이미지 몇 장과 작은 음성(모노 WAV)만 뽑는다 — Vercel 요청 한도(4.5MB) 안에서 Gemini가 말까지 듣게 하려는 것.

export const REEL_FRAME_COUNT = 4;
export const REEL_FRAME_SIZE = 720; // 긴 변(px)
export const REEL_AUDIO_RATE = 12_000; // Hz, 90초 이하 기본 — 말소리에 충분하고 파일이 작다
export const REEL_MAX_AUDIO_SEC = 180; // v1.50: 릴스 최대 길이(3분)까지 — 길면 형식을 낮춰 같은 크기 안에 담는다
/** 소리 WAV 바이트 상한(base64로 약 2.9MB — 서버 한도 3MB, 장면 4장과 합쳐 요청 4.5MB 안) */
export const REEL_AUDIO_MAX_BYTES = 2_160_000;
export const REEL_MAX_FILE_BYTES = 200 * 1024 * 1024;

export interface ReelImage { name: string; mimeType: string; data: string; preview: string; /** v1.50 영상 속 시점(초) */ at?: number }
export interface ReelAudio { mimeType: "audio/wav"; data: string; seconds: number }
export interface ReelMaterial { name: string; duration: number; frames: ReelImage[]; audio: ReelAudio | null }

/** 장면을 뽑을 시점(초) — 처음·끝 검은 화면을 피해 고르게 */
export function pickFrameTimes(duration: number, count = REEL_FRAME_COUNT): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [0];
  return Array.from({ length: count }, (_, i) => Math.round(duration * (0.1 + (0.8 * i) / Math.max(1, count - 1)) * 100) / 100);
}

/** 소리 길이에 맞춘 WAV 형식 — 90초까지 12kHz 16비트, 더 길면 16비트로 담을 수 있는 만큼 낮추고(8kHz까지), 그래도 넘으면 8kHz 8비트 */
export function pickAudioFormat(seconds: number): { rate: number; bits: 8 | 16 } {
  const sec = Math.max(1, Math.min(REEL_MAX_AUDIO_SEC, seconds));
  const rate16 = Math.min(REEL_AUDIO_RATE, Math.floor(REEL_AUDIO_MAX_BYTES / (2 * sec) / 1000) * 1000);
  return rate16 >= 8000 ? { rate: rate16, bits: 16 } : { rate: 8000, bits: 8 };
}

/** 모노 PCM WAV 파일 바이트(16비트 부호 있음 / 8비트 부호 없음) */
export function encodeWavMono(samples: Float32Array, sampleRate: number, bits: 8 | 16 = 16): Uint8Array {
  const bps = bits / 8;
  const buf = new ArrayBuffer(44 + samples.length * bps);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + samples.length * bps, true); w(8, "WAVE");
  w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * bps, true); v.setUint16(32, bps, true); v.setUint16(34, bits, true);
  w(36, "data"); v.setUint32(40, samples.length * bps, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    if (bits === 16) v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    else v.setUint8(44 + i, Math.round((s + 1) * 127.5));
  }
  return new Uint8Array(buf);
}

/** 모노 16비트 PCM WAV(v1.49 이름 유지) */
export const encodeWavMono16 = (samples: Float32Array, sampleRate: number) => encodeWavMono(samples, sampleRate, 16);

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => { video.removeEventListener("seeked", done); video.removeEventListener("error", fail); resolve(); };
    const fail = () => { video.removeEventListener("seeked", done); video.removeEventListener("error", fail); reject(new Error("seek")); };
    video.addEventListener("seeked", done);
    video.addEventListener("error", fail);
    video.currentTime = t;
  });
}

async function extractFrames(file: File): Promise<{ frames: ReelImage[]; duration: number }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true; video.playsInline = true; video.preload = "auto"; video.src = url;
  try {
    await new Promise<void>((resolve, reject) => { video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error("load")); });
    const duration = video.duration;
    const s = Math.min(1, REEL_FRAME_SIZE / Math.max(video.videoWidth, video.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(video.videoWidth * s));
    c.height = Math.max(1, Math.round(video.videoHeight * s));
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("canvas");
    const frames: ReelImage[] = [];
    for (const [i, t] of pickFrameTimes(duration).entries()) {
      await seek(video, Math.min(t, Math.max(0, duration - 0.05)));
      ctx.drawImage(video, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL("image/jpeg", 0.72);
      frames.push({ name: `${file.name} 장면 ${i + 1}`, mimeType: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl, at: Math.round(t) });
    }
    return { frames, duration };
  } finally {
    video.removeAttribute("src"); video.load();
    URL.revokeObjectURL(url);
  }
}

async function extractAudio(file: File): Promise<ReelAudio | null> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx || typeof OfflineAudioContext === "undefined") return null;
  const ac = new Ctx();
  try {
    const decoded = await ac.decodeAudioData(await file.arrayBuffer());
    const seconds = Math.min(decoded.duration, REEL_MAX_AUDIO_SEC);
    const fmt = pickAudioFormat(seconds);
    const length = Math.max(1, Math.floor(seconds * fmt.rate));
    const off = new OfflineAudioContext(1, length, fmt.rate);
    const src = off.createBufferSource();
    src.buffer = decoded; src.connect(off.destination); src.start(0);
    const rendered = await off.startRendering();
    return { mimeType: "audio/wav", data: bytesToBase64(encodeWavMono(rendered.getChannelData(0), fmt.rate, fmt.bits)), seconds: Math.round(seconds) };
  } catch {
    return null; // 소리가 없거나 이 브라우저가 못 푸는 형식 — 장면만 분석
  } finally {
    void ac.close();
  }
}

/** 릴스 파일 → 장면 4장 + 소리(있으면). 실패하면 회원에게 보여 줄 문장으로 던진다 */
export async function extractReel(file: File): Promise<ReelMaterial> {
  if (!file.type.startsWith("video/")) throw new Error("영상 파일(mp4·mov·webm)만 올릴 수 있습니다.");
  if (file.size > REEL_MAX_FILE_BYTES) throw new Error("200MB 이하 영상만 올릴 수 있습니다.");
  let picked: { frames: ReelImage[]; duration: number };
  try {
    picked = await extractFrames(file);
  } catch {
    throw new Error("이 브라우저에서 영상을 열지 못했습니다. mp4(H.264) 파일로 다시 저장해 올려 주세요.");
  }
  const audio = await extractAudio(file);
  return { name: file.name, duration: Math.round(picked.duration), frames: picked.frames, audio };
}
