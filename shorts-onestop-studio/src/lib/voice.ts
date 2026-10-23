// 음성(TTS)·자막·배경음악 선택지(서버·화면 공용). 모델 ID: OpenAI 안정 모델, Gemini는 Preview라 기본값으로 쓰지 않는다(AI_MODEL_INTEGRATION_STANDARD).
export type TtsProvider = "openai" | "gemini" | "elevenlabs";
export const TTS_MODELS: { provider: TtsProvider; id: string; name: string }[] = [
  { provider: "openai", id: "gpt-4o-mini-tts", name: "OpenAI GPT-4o mini TTS · 말투 지시 가능 (기본)" },
  { provider: "openai", id: "tts-1", name: "OpenAI TTS-1 · 빠른 기본형" },
  { provider: "gemini", id: "gemini-2.5-flash-preview-tts", name: "Gemini 2.5 Flash TTS (Preview)" },
  // v1.26 본인 목소리 복제: 목소리는 회원 ElevenLabs 계정에서 불러온다(/api/voice/elevenlabs). 한국어 지원 다국어 모델
  { provider: "elevenlabs", id: "eleven_multilingual_v2", name: "ElevenLabs 다국어 v2 · 내 목소리(복제) 사용 가능" },
  { provider: "elevenlabs", id: "eleven_flash_v2_5", name: "ElevenLabs Flash v2.5 · 빠르고 저렴" },
];
export const TTS_VOICES: Record<TtsProvider, { id: string; name: string }[]> = {
  openai: [
    { id: "coral", name: "코랄 · 밝은 여성" }, { id: "nova", name: "노바 · 또렷한 여성" }, { id: "shimmer", name: "시머 · 부드러운 여성" },
    { id: "sage", name: "세이지 · 차분한 중성" }, { id: "ash", name: "애시 · 단단한 남성" }, { id: "onyx", name: "오닉스 · 낮은 남성" },
  ],
  gemini: [{ id: "Kore", name: "Kore · 단정한" }, { id: "Aoede", name: "Aoede · 밝은" }, { id: "Puck", name: "Puck · 경쾌한" }, { id: "Charon", name: "Charon · 차분한" }],
  elevenlabs: [], // 회원 계정 목록을 화면에서 불러옴(복제한 내 목소리 포함)
};
/** ElevenLabs voice_id 모양(영문·숫자 20자 안팎) */
export const isElevenVoiceId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9]{10,40}$/.test(v);
export const DEFAULT_TTS = { provider: "openai" as TtsProvider, model: "gpt-4o-mini-tts", voice: "coral" };
export const CAPTION_STYLES = { band: "기본(어두운 띠)", yellow: "노란 자막", outline: "외곽선", pop: "강조 색" } as const;
export type CaptionStyle = keyof typeof CAPTION_STYLES;

export interface AudioSettings {
  provider: TtsProvider; model: string; voice: string; speed: number; tone: string;
  /** voiceOnly: MP4에는 목소리가 있는 장면에만 자막(미리보기는 스타일 확인용으로 항상 표시) */
  captions: { on: boolean; style: CaptionStyle; y: number; size: number; voiceOnly: boolean };
  bgm?: { path: string; name: string; volume: number };
}
export const DEFAULT_AUDIO: AudioSettings = { ...DEFAULT_TTS, speed: 1.05, tone: "밝고 친근한 한국어 쇼츠 내레이션. 또렷하고 리듬감 있게.", captions: { on: true, style: "band", y: 380, size: 1, voiceOnly: true } };

export function normalizeAudio(a: Partial<AudioSettings> | undefined): AudioSettings {
  const model = TTS_MODELS.find((m) => m.id === a?.model) ?? TTS_MODELS[0];
  const voices = TTS_VOICES[model.provider];
  const c: Partial<AudioSettings["captions"]> = a?.captions ?? {};
  return {
    provider: model.provider, model: model.id,
    voice: model.provider === "elevenlabs" ? (isElevenVoiceId(a?.voice) ? a!.voice! : "") : voices.some((v) => v.id === a?.voice) ? a!.voice! : voices[0].id,
    // ElevenLabs 말 빠르기 허용 범위는 0.7~1.2
    speed: typeof a?.speed === "number" ? Math.min(model.provider === "elevenlabs" ? 1.2 : 1.5, Math.max(model.provider === "elevenlabs" ? 0.7 : 0.8, a.speed)) : model.provider === "elevenlabs" ? 1 : DEFAULT_AUDIO.speed,
    tone: typeof a?.tone === "string" ? a.tone.slice(0, 200) : DEFAULT_AUDIO.tone,
    captions: { on: c.on !== false, style: c.style && c.style in CAPTION_STYLES ? c.style : "band", y: typeof c.y === "number" ? Math.min(1500, Math.max(160, c.y)) : 380, size: typeof c.size === "number" ? Math.min(1.6, Math.max(0.7, c.size)) : 1, voiceOnly: c.voiceOnly !== false },
    bgm: a?.bgm?.path ? { path: a.bgm.path, name: String(a.bgm.name ?? "배경음악").slice(0, 80), volume: typeof a.bgm.volume === "number" ? Math.min(1, Math.max(0, a.bgm.volume)) : 0.35 } : undefined,
  };
}

/** 자막 조각: 내레이션을 짧은 구간(최대 16자 안팎)으로 나눈다 */
export function captionChunks(text: string, maxLen = 16): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean); const out: string[] = []; let cur = "";
  for (const w of words) { const cand = cur ? `${cur} ${w}` : w; if (cand.length > maxLen && cur) { out.push(cur); cur = w; } else cur = cand; if (/[.!?…。]$/.test(cur)) { out.push(cur); cur = ""; } }
  if (cur) out.push(cur);
  return out;
}

// ── v1.27 단어 단위 자막 ─────────────────────────────────
// 자막 글자는 항상 원래 대본(내레이션) 그대로 쓰고, 시각만 음성에 맞춘다(받아쓴 글자의 숫자·영문 표기 오류가 화면에 나오지 않게).
// words[i] = 대본을 공백으로 나눈 i번째 낱말이 음성에서 시작하는 시각(초, 음성 파일 기준).
export const tokensOf = (text: string) => text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
const letters = (s: string) => s.replace(/[\s.,!?…。·~'"“”‘’()\[\]{}:;\-]/g, "");

/** ElevenLabs 글자 정렬(입력 글자 그대로, 글자마다 시작 시각) → 낱말 시작 시각 */
export function startsFromChars(text: string, chars: string[], starts: number[]): number[] | null {
  const norm = text.replace(/\s+/g, " ").trim();
  if (!chars.length || chars.length !== starts.length) return null;
  const toks = tokensOf(norm); const out: number[] = []; let pos = 0;
  for (const t of toks) {
    const at = norm.indexOf(t, pos); if (at < 0) return null; pos = at + t.length;
    const k = chars.length === norm.length ? at : Math.min(chars.length - 1, Math.round((at / Math.max(1, norm.length)) * chars.length));
    out.push(Math.max(0, Number(starts[k]) || 0));
  }
  return monotone(out);
}

/** Whisper 낱말(받아쓴 글자·시작 시각) → 대본 낱말 시작 시각. 글자 수 비율로 위치를 맞춰 보간한다(받아쓴 글자가 대본과 조금 달라도 동작) */
export function startsFromWords(text: string, words: { word: string; start: number }[]): number[] | null {
  const ws = words.filter((w) => Number.isFinite(w.start) && letters(w.word).length > 0);
  if (!ws.length) return null;
  const wTotal = ws.reduce((n, w) => n + letters(w.word).length, 0);
  const anchors: { r: number; t: number }[] = []; let acc = 0;
  for (const w of ws) { anchors.push({ r: acc / wTotal, t: w.start }); acc += letters(w.word).length; }
  const toks = tokensOf(text); const tTotal = toks.reduce((n, t) => n + letters(t).length, 0) || 1;
  const out: number[] = []; acc = 0;
  for (const t of toks) {
    const r = acc / tTotal; acc += letters(t).length;
    let j = 0; while (j + 1 < anchors.length && anchors[j + 1].r <= r) j++;
    const a = anchors[j], b = anchors[j + 1];
    out.push(b && b.r > a.r ? a.t + ((r - a.r) / (b.r - a.r)) * (b.t - a.t) : a.t);
  }
  return monotone(out);
}

function monotone(xs: number[]): number[] {
  const out: number[] = []; let last = 0;
  for (const x of xs) { last = Math.max(last, Math.round(x * 100) / 100); out.push(last); }
  return out;
}

/** 자막 조각 + 조각이 시작하는 시각(첫 낱말의 시각). 나누는 규칙은 captionChunks와 같다 */
export function timedCaptionChunks(text: string, starts: number[], maxLen = 16): { text: string; start: number }[] | null {
  const toks = tokensOf(text); if (toks.length !== starts.length || !toks.length) return null;
  const out: { text: string; start: number }[] = []; let cur = "", curStart = 0;
  toks.forEach((w, i) => {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length > maxLen && cur) { out.push({ text: cur, start: curStart }); cur = w; curStart = starts[i]; } else { if (!cur) curStart = starts[i]; cur = cand; }
    if (/[.!?…。]$/.test(cur)) { out.push({ text: cur, start: curStart }); cur = ""; }
  });
  if (cur) out.push({ text: cur, start: curStart });
  return out;
}
