// 공용 기준 코드 `browser-free-tts` — 화면·작업자 공용 형식과 순수 함수(시험 대상)
export const FREE_TTS_HF = "https://huggingface.co/Supertone/supertonic-3/resolve/main";
export const FREE_TTS_CACHE = "supertonic-3";
export const FREE_TTS_LICENSE_URL = "https://huggingface.co/Supertone/supertonic-3/blob/main/LICENSE";
/** 목소리 10개(모델 제공 F1~F5·M1~M5) */
export const FREE_TTS_VOICES: { id: string; name: string }[] = [
  ...[1, 2, 3, 4, 5].map((n) => ({ id: `F${n}`, name: `여성 ${n}` })),
  ...[1, 2, 3, 4, 5].map((n) => ({ id: `M${n}`, name: `남성 ${n}` })),
];
export const FREE_TTS_SPEED = { min: 0.9, max: 1.5 };

export interface FreeSentence { text: string; start: number; end: number }
export type WorkerIn =
  | { type: "load"; threads: number }
  | { type: "speak"; id: number; threads: number; text: string; voice: string; speed: number; steps: number; lang: string };
export type WorkerOut =
  | { type: "progress"; mb: number; step: number; steps: number }
  | { type: "ready" }
  | { type: "done"; id: number; samples: Float32Array; sampleRate: number; sentences: FreeSentence[] }
  | { type: "error"; id?: number; message: string };

/** 문장별 시작·끝 시각 → 낱말(공백 기준)별 시작 시각. 문장 안은 글자 수 비율로 나눈다(받아쓰기 호출 없음) */
export function sentenceWords(sentences: FreeSentence[]): { word: string; start: number }[] {
  const out: { word: string; start: number }[] = [];
  for (const s of sentences) {
    const toks = s.text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    const total = toks.reduce((n, t) => n + t.length, 0) || 1;
    let acc = 0;
    for (const t of toks) { out.push({ word: t, start: s.start + (acc / total) * (s.end - s.start) }); acc += t.length; }
  }
  return out;
}

/** 작업자 오류 → 회원에게 보여 줄 한국어 안내 */
export function freeTtsErrorText(message: string): string {
  if (/^download:|Failed to fetch|NetworkError|network/i.test(message)) return "무료 음성 모델을 받지 못했습니다. 인터넷 연결을 확인하고 다시 시도하거나, 유료 음성으로 바꿔 주세요.";
  if (/memory|RangeError|Aborted|OOM|allocation/i.test(message)) return "이 기기의 메모리가 부족해 무료 음성을 만들지 못했습니다. 다른 탭을 닫고 다시 시도하거나, 유료 음성으로 바꿔 주세요.";
  return "무료 음성을 만들지 못했습니다. 다시 시도하거나, 유료 음성으로 바꿔 주세요.";
}

/** 16bit 모노 WAV */
export function writeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.floor(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  return buf;
}
