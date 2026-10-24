// v1.14 「⚡ 내 PC로 저장」 — 마스터링 결과(WAV)를 회원 PC ffmpeg로 MP3·AAC·FLAC·WAV24로 저장하고, 원하면 스트리밍 기준 음량으로 맞춘다.
// 실행기 「audio」 명령(video-to-gif/local-renderer/host, 실행기 1.10 이상)의 약속과 같은 범위로 값을 만든다(실행기가 다시 검사).
// 화면·node 시험이 함께 쓰는 순수 함수(가져오기 없음).

export type PcAudioFormat = "mp3" | "aac" | "flac" | "wav";

export const PC_AUDIO_FORMATS: { value: PcAudioFormat; label: string; ext: string; mime: string; bitrate?: number }[] = [
  { value: "mp3", label: "MP3 320k", ext: "mp3", mime: "audio/mpeg", bitrate: 320 },
  { value: "aac", label: "AAC 256k (m4a)", ext: "m4a", mime: "audio/mp4", bitrate: 256 },
  { value: "flac", label: "FLAC (무손실)", ext: "flac", mime: "audio/flac" },
  { value: "wav", label: "WAV 24bit", ext: "wav", mime: "audio/wav" },
];

/** 스트리밍 기준(유튜브·스포티파이 등): 통합 음량 -14 LUFS, 최대 음량 -1 dBTP */
export const STREAMING_TARGET = { lufs: 14, tp: 1 };

/** 실행기에 보낼 「audio」 명령. 잘못된 값이면 null */
export function buildAudioCommand(o: { format: PcAudioFormat; sampleRate: number; normalize: boolean; duration?: number }): Record<string, unknown> | null {
  const f = PC_AUDIO_FORMATS.find((x) => x.value === o.format);
  if (!f) return null;
  const sampleRate = o.sampleRate === 48000 ? 48000 : 44100;
  const cmd: Record<string, unknown> = { type: "audio", format: f.value, sampleRate };
  if (f.bitrate) cmd.bitrate = f.bitrate;
  if (o.normalize) { cmd.lufs = STREAMING_TARGET.lufs; cmd.tp = STREAMING_TARGET.tp; }
  if (o.duration && Number.isFinite(o.duration) && o.duration > 0) cmd.duration = Math.min(36000, Math.round(o.duration * 100) / 100);
  return cmd;
}

export interface PcAudioReport { inputI: number | null; inputTP: number | null; outputI: number | null; outputTP: number | null }

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? (Math.sign(n) * Math.round(Math.abs(n) * 10)) / 10 || 0 : null; // -35.75 → -35.8(절댓값 기준 반올림)
};

/** 실행기 결과의 측정값(문자열) → 숫자. 소리가 없으면 ffmpeg가 「-inf」를 주므로 null */
export function audioReport(info: Record<string, unknown>): PcAudioReport {
  return { inputI: num(info.inputI), inputTP: num(info.inputTP), outputI: num(info.outputI), outputTP: num(info.outputTP) };
}

/** 「곡.wav」 → 「곡.mp3」 */
export function withExt(name: string, ext: string): string {
  return name.replace(/\.[^./\\]+$/, "") + "." + ext;
}
