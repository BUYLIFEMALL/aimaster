/**
 * 받아쓰기 모델 선택(2026-11-10, 플랜 docs/PLAN_20261110_GEMINI_TRANSCRIBE.md) — 화면·서버가 함께 쓰는 순수 코드.
 * Claude API는 음성 입력이 없어 받아쓰기 후보가 아니다. OpenAI는 문장 시각을 주는 모델이 whisper-1뿐(2027-02-26 종료 예정).
 * Gemini는 받아쓰기 전용 모델 없이 일반 모델에 소리 + 「구간마다 시작·끝 초」 지시 + JSON 스키마로 받는다(공식 문서 확인 2026-11-10).
 */
import type { Seg } from "./clipPlan";

export type TranscribeModelId = "gemini-3.8-flash" | "gemini-3.5-flash-lite" | "whisper-1";

export const TRANSCRIBE_MODELS: { id: TranscribeModelId; provider: "gemini" | "openai"; name: string; note: string; wonPer3Min: number }[] = [
  { id: "gemini-3.8-flash", provider: "gemini", name: "Gemini 3.8 Flash", note: "추천 · 균형", wonPer3Min: 10 },
  { id: "gemini-3.5-flash-lite", provider: "gemini", name: "Gemini 3.5 Flash Lite", note: "저가", wonPer3Min: 4 },
  { id: "whisper-1", provider: "openai", name: "OpenAI Whisper", note: "시각 가장 정확 · 2027-02 종료 예정", wonPer3Min: 25 },
];

export const isTranscribeModel = (v: unknown): v is TranscribeModelId => TRANSCRIBE_MODELS.some((m) => m.id === v);
export const transcribeModelOf = (id: TranscribeModelId) => TRANSCRIBE_MODELS.find((m) => m.id === id)!;

/**
 * 기본값: 회원이 전에 고른 모델(키가 있을 때) → 가진 키 중 목록 순서(Gemini 3.8 Flash 먼저, 주인님 결정 1) → 목록 첫째.
 * 키가 하나도 없으면 첫째를 보여 주고, 실행 때 서버가 등록 안내를 낸다.
 */
export function defaultTranscribeModel(registered: readonly string[], saved?: unknown): TranscribeModelId {
  if (isTranscribeModel(saved) && registered.includes(transcribeModelOf(saved).provider)) return saved;
  const first = TRANSCRIBE_MODELS.find((m) => registered.includes(m.provider));
  return (first ?? TRANSCRIBE_MODELS[0]).id;
}

/** 대략 비용(원) — 화면 안내용 */
export function transcribeCostWon(id: TranscribeModelId, seconds: number): number {
  return Math.max(1, Math.round((transcribeModelOf(id).wonPer3Min * Math.max(seconds, 1)) / 180));
}

export const GEMINI_TRANSCRIBE_PROMPT = [
  "이 소리를 한국어로 받아쓰세요. 말한 그대로 쓰고, 고치거나 요약하거나 빠뜨리지 마세요.",
  "문장(또는 숨 쉬는 곳) 단위로 나눠 각 구간의 시작·끝을 소리 처음부터의 초(소수점 첫째 자리까지)로 적으세요.",
  "구간은 시간 순서대로, 서로 겹치지 않게. 말소리가 없는 부분은 넣지 마세요. 말소리가 전혀 없으면 segments를 빈 배열로 주세요.",
].join("\n");

/** Gemini 응답 형식(generationConfig.responseSchema) */
export const GEMINI_TRANSCRIBE_SCHEMA = {
  type: "OBJECT",
  properties: {
    segments: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { start: { type: "NUMBER" }, end: { type: "NUMBER" }, text: { type: "STRING" } },
        required: ["start", "end", "text"],
      },
    },
  },
  required: ["segments"],
} as const;

/** Gemini 응답 검사: 숫자 아님·빈 글 빼기, 시간순 정렬, 소리 길이 넘김 잘라내기, 앞 구간과 겹치면 앞 구간 끝을 당김 */
export function parseGeminiSegments(raw: unknown, duration: number): Seg[] {
  const list = (raw as { segments?: unknown })?.segments;
  if (!Array.isArray(list)) return [];
  const limit = duration > 0 ? duration : Infinity;
  const segs = list
    .map((s) => ({ start: Number((s as Seg)?.start), end: Number((s as Seg)?.end), text: String((s as Seg)?.text ?? "").replace(/\s+/g, " ").trim() }))
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.text && s.start >= 0 && s.start < limit)
    .map((s) => ({ ...s, end: Math.min(s.end, limit) }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start)
    .slice(0, 400);
  for (let i = 1; i < segs.length; i++) if (segs[i - 1].end > segs[i].start) segs[i - 1].end = segs[i].start;
  return segs.filter((s) => s.end > s.start);
}

/**
 * 요청에 소리를 바로 넣을 수 있는 크기(요청 전체 20MB, base64는 4/3배). 넘으면 Files API 대신 WAV를 잘라 조각마다 바로 넣는다
 * (Files API 안내가 새 Interactions API 기준으로 바뀌어 generateContent에서 파일 붙이는 법을 확인하지 못함 — 확인된 길만 쓴다).
 */
export const GEMINI_INLINE_MAX_BYTES = 14 * 1024 * 1024;
/** 조각 길이(16kHz 모노 16비트 5분 ≈ 9.6MB → base64 12.8MB) */
export const GEMINI_CHUNK_SECONDS = 300;

/**
 * 우리 encodeWav(44바이트 머리말·16비트 모노)로 만든 WAV를 maxSeconds 이하 조각으로 자른다.
 * 자르는 곳은 목표 지점 앞 10초 안에서 가장 조용한 20ms 구간(말 중간에서 끊기지 않게). offset은 조각의 시작 초.
 */
export function splitWav(wav: Uint8Array, maxSeconds = GEMINI_CHUNK_SECONDS): { wav: Uint8Array; offset: number }[] {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const rate = view.getUint32(24, true) || 16000;
  const total = Math.floor((wav.byteLength - 44) / 2);
  const pcm = new Int16Array(wav.buffer.slice(wav.byteOffset + 44, wav.byteOffset + 44 + total * 2));
  const maxSamples = Math.max(rate, Math.floor(maxSeconds * rate));
  const win = Math.floor(rate * 0.02);
  const out: { wav: Uint8Array; offset: number }[] = [];
  let start = 0;
  while (start < total) {
    let end = Math.min(total, start + maxSamples);
    if (end < total) {
      let best = end, bestEnergy = Infinity;
      for (let w = Math.max(start + win, end - rate * 10); w + win <= end; w += win) {
        let e = 0;
        for (let i = w; i < w + win; i++) e += Math.abs(pcm[i]);
        if (e < bestEnergy) { bestEnergy = e; best = w + Math.floor(win / 2); }
      }
      end = best;
    }
    const n = end - start;
    const bytes = new Uint8Array(44 + n * 2);
    bytes.set(wav.subarray(0, 44));
    const v = new DataView(bytes.buffer);
    v.setUint32(4, 36 + n * 2, true);
    v.setUint32(40, n * 2, true);
    bytes.set(new Uint8Array(pcm.buffer, start * 2, n * 2), 44);
    out.push({ wav: bytes, offset: start / rate });
    start = end;
  }
  return out;
}
