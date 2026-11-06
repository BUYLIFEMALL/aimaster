// L-5 렌더 진단 기록 — 이 PC의 인코더·메모리 사정과 내보내기 진행을 한곳에 모아 「진단 복사」로 넘겨받는다.
// 공용 인코더(mp4Encoder.ts 사본)는 고치지 않고, 같은 후보 순서로 미리 살펴본다(인코더가 실제로 고르는 것과 같음).
// 이 파일은 가져올 때 브라우저 기능을 쓰지 않는다(시험에서 바로 불러옴).

export type DiagLevel = "info" | "warn" | "error";
export interface DiagEntry { sec: number; level: DiagLevel; text: string }

/** 공용 인코더와 같은 순서 — 앞의 것이 안 되면 다음 것으로 대체된다 */
export const VIDEO_CODECS = [
  { codec: "avc1.640028", label: "H.264 High" },
  { codec: "avc1.4d0028", label: "H.264 Main" },
  { codec: "avc1.42e028", label: "H.264 Baseline" },
] as const;
export const AUDIO_CODECS = [{ codec: "mp4a.40.2", label: "AAC" }, { codec: "opus", label: "Opus" }] as const;

const MB = 1024 * 1024;
/** 메모리 어림(MB): 디코딩한 소리(48kHz 2채널 32비트) + 메모리에 모으는 방식이면 결과 MP4(약 8Mbps + 160kbps) */
export function memoryEstimateMb(durationSec: number, toFile: boolean): { audio: number; output: number; total: number } {
  const audio = Math.round((durationSec * 48_000 * 2 * 4) / MB);
  const output = toFile ? 0 : Math.round((durationSec * (8 + 0.16)) / 8);
  return { audio, output, total: audio + output };
}

/** 만들기 전 주의할 점(없으면 빈 배열). deviceMemoryGb는 브라우저가 알려 주는 대략값(없으면 판단 안 함) */
export function preflightWarnings(o: { durationSec: number; toFile: boolean; canSaveToFile: boolean; deviceMemoryGb?: number; video?: string | null; audio?: string | null }): string[] {
  const w: string[] = [];
  const m = memoryEstimateMb(o.durationSec, o.toFile);
  if (o.deviceMemoryGb && m.total > o.deviceMemoryGb * 1024 * 0.25)
    w.push(`메모리가 빠듯할 수 있습니다(필요 약 ${m.total}MB, 이 PC 약 ${o.deviceMemoryGb}GB)${!o.toFile && o.canSaveToFile ? " — 「파일로 바로 저장」을 켜면 줄어듭니다" : " — 다른 탭을 닫고 만들어 주세요"}`);
  if (o.video === null) w.push("이 브라우저에서 H.264 영상 인코더를 찾지 못했습니다 — 최신 크롬·엣지로 열어 주세요");
  else if (o.video && o.video !== VIDEO_CODECS[0].label) w.push(`영상 인코더가 ${o.video}로 대체됩니다(화질이 조금 낮을 수 있음)`);
  if (o.audio === null) w.push("소리 인코더를 찾지 못해 소리 없이 만들어질 수 있습니다");
  else if (o.audio && o.audio !== AUDIO_CODECS[0].label) w.push(`소리가 ${o.audio}로 담깁니다 — 일부 옛 플레이어는 소리가 안 날 수 있습니다`);
  return w;
}

/** 진행 상태 문구에서 반복되는 숫자를 빼고 단계 이름만(같은 단계는 한 번만 기록) */
export const stageOf = (status: string) => status.replace(/[\d.]+\s*\/\s*[\d.]+초/, "").replace(/\s+/g, " ").trim();

/** 진단 기록을 붙여 넣기 좋은 글로 */
export function formatDiag(header: string[], entries: DiagEntry[]): string {
  const mark = { info: "·", warn: "⚠", error: "✖" } as const;
  return [...header, "", ...entries.map((e) => `${e.sec.toFixed(1).padStart(6)}초 ${mark[e.level]} ${e.text}`)].join("\n");
}

/** 이 브라우저가 실제로 고를 인코더(공용 인코더와 같은 조건) — 브라우저에서만 */
export async function probeEncoders(W: number, H: number, fps: number): Promise<{ video: string | null; audio: string | null; hw: boolean | null }> {
  if (typeof VideoEncoder === "undefined") return { video: null, audio: null, hw: null };
  let video: string | null = null, codec = "";
  for (const v of VIDEO_CODECS) {
    if ((await VideoEncoder.isConfigSupported({ codec: v.codec, width: W, height: H, bitrate: 8_000_000, framerate: fps }).catch(() => ({ supported: false }))).supported) { video = v.label; codec = v.codec; break; }
  }
  let hw: boolean | null = null;
  if (codec) hw = (await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: 8_000_000, framerate: fps, hardwareAcceleration: "prefer-hardware" }).catch(() => ({ supported: false }))).supported === true;
  let audio: string | null = null;
  if (typeof AudioEncoder !== "undefined")
    for (const a of AUDIO_CODECS) if ((await AudioEncoder.isConfigSupported({ codec: a.codec, sampleRate: 48_000, numberOfChannels: 2, bitrate: 160_000 }).catch(() => ({ supported: false }))).supported) { audio = a.label; break; }
  return { video, audio, hw };
}
