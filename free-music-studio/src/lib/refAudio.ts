// 참고곡 → 작은 모노 WAV(백로그 D-9, 2026-11-09 주인님 「이것도 너가 해」).
// 회원이 고른 참고곡에서 곡의 20% 지점부터 최대 60초를 잘라 12kHz 16비트 모노 WAV로 줄인다(약 1.4MB — Vercel 요청 4.5MB 안).
// 음원은 이 브라우저 안에서만 줄이고, 서버는 그 작은 조각을 회원 Gemini 키로 한 번 보낸 뒤 저장하지 않는다.
// WAV 만들기·base64는 인스타 자동화 `insta_auto_poster/src/lib/cardnews/reelsMedia.ts`(같은 저장소)의 사본.

export const REF_RATE = 12_000;
export const REF_MAX_SEC = 60;
/** 받은 base64 상한(서버도 같은 값으로 확인) — 60초·12kHz·16비트 ≈ 1.44MB → base64 ≈ 1.92MB */
export const REF_MAX_B64 = 2_600_000;
export const REF_MAX_FILE_BYTES = 200 * 1024 * 1024;

/** 들을 구간 — 곡의 20% 지점부터(앞 인트로를 피해), 끝을 넘지 않게. 짧은 곡은 처음부터 전부 */
export function pickRefWindow(duration: number): { start: number; seconds: number } {
  if (!Number.isFinite(duration) || duration <= 0) return { start: 0, seconds: 0 };
  if (duration <= REF_MAX_SEC) return { start: 0, seconds: Math.round(duration * 100) / 100 };
  const start = Math.min(duration * 0.2, duration - REF_MAX_SEC);
  return { start: Math.round(start * 100) / 100, seconds: REF_MAX_SEC };
}

/** 모노 16비트 PCM WAV 파일 바이트 */
export function encodeWavMono16(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytes = samples.length * 2;
  const buf = new ArrayBuffer(44 + bytes);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + bytes, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, bytes, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buf);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** 참고곡 파일 → 작은 WAV(base64). 실패하면 회원에게 보여 줄 문장으로 던진다 */
export async function extractRefAudio(file: File): Promise<{ data: string; seconds: number; start: number }> {
  if (file.size > REF_MAX_FILE_BYTES) throw new Error("파일이 너무 큽니다(200MB까지).");
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx || typeof OfflineAudioContext === "undefined") throw new Error("이 브라우저는 음악 파일을 읽을 수 없습니다. 크롬·엣지 최신 판에서 해 주세요.");
  const ac = new Ctx();
  try {
    let decoded: AudioBuffer;
    try {
      decoded = await ac.decodeAudioData(await file.arrayBuffer());
    } catch {
      throw new Error("음악 파일을 읽지 못했습니다. mp3·wav·flac·m4a·ogg 파일인지 확인해 주세요.");
    }
    const win = pickRefWindow(decoded.duration);
    if (win.seconds < 3) throw new Error("곡이 너무 짧습니다(3초 이상).");
    const length = Math.max(1, Math.floor(win.seconds * REF_RATE));
    const off = new OfflineAudioContext(1, length, REF_RATE);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start(0, win.start, win.seconds);
    const rendered = await off.startRendering();
    const data = bytesToBase64(encodeWavMono16(rendered.getChannelData(0), REF_RATE));
    if (data.length > REF_MAX_B64) throw new Error("줄인 소리가 너무 큽니다. 다른 파일로 해 주세요.");
    return { data, seconds: Math.round(win.seconds), start: Math.round(win.start) };
  } finally {
    void ac.close();
  }
}
