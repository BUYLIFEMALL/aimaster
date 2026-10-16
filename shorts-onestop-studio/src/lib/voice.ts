// 음성(TTS)·자막·배경음악 선택지(서버·화면 공용). 모델 ID: OpenAI 안정 모델, Gemini는 Preview라 기본값으로 쓰지 않는다(AI_MODEL_INTEGRATION_STANDARD).
export type TtsProvider = "openai" | "gemini";
export const TTS_MODELS: { provider: TtsProvider; id: string; name: string }[] = [
  { provider: "openai", id: "gpt-4o-mini-tts", name: "OpenAI GPT-4o mini TTS · 말투 지시 가능 (기본)" },
  { provider: "openai", id: "tts-1", name: "OpenAI TTS-1 · 빠른 기본형" },
  { provider: "gemini", id: "gemini-2.5-flash-preview-tts", name: "Gemini 2.5 Flash TTS (Preview)" },
];
export const TTS_VOICES: Record<TtsProvider, { id: string; name: string }[]> = {
  openai: [
    { id: "coral", name: "코랄 · 밝은 여성" }, { id: "nova", name: "노바 · 또렷한 여성" }, { id: "shimmer", name: "시머 · 부드러운 여성" },
    { id: "sage", name: "세이지 · 차분한 중성" }, { id: "ash", name: "애시 · 단단한 남성" }, { id: "onyx", name: "오닉스 · 낮은 남성" },
  ],
  gemini: [{ id: "Kore", name: "Kore · 단정한" }, { id: "Aoede", name: "Aoede · 밝은" }, { id: "Puck", name: "Puck · 경쾌한" }, { id: "Charon", name: "Charon · 차분한" }],
};
export const DEFAULT_TTS = { provider: "openai" as TtsProvider, model: "gpt-4o-mini-tts", voice: "coral" };
export const CAPTION_STYLES = { band: "기본(어두운 띠)", yellow: "노란 자막", outline: "외곽선", pop: "강조 색" } as const;
export type CaptionStyle = keyof typeof CAPTION_STYLES;

export interface AudioSettings {
  provider: TtsProvider; model: string; voice: string; speed: number; tone: string;
  captions: { on: boolean; style: CaptionStyle; y: number; size: number };
  bgm?: { path: string; name: string; volume: number };
}
export const DEFAULT_AUDIO: AudioSettings = { ...DEFAULT_TTS, speed: 1.05, tone: "밝고 친근한 한국어 쇼츠 내레이션. 또렷하고 리듬감 있게.", captions: { on: true, style: "band", y: 380, size: 1 } };

export function normalizeAudio(a: Partial<AudioSettings> | undefined): AudioSettings {
  const model = TTS_MODELS.find((m) => m.id === a?.model) ?? TTS_MODELS[0];
  const voices = TTS_VOICES[model.provider];
  const c: Partial<AudioSettings["captions"]> = a?.captions ?? {};
  return {
    provider: model.provider, model: model.id, voice: voices.some((v) => v.id === a?.voice) ? a!.voice! : voices[0].id,
    speed: typeof a?.speed === "number" ? Math.min(1.5, Math.max(0.8, a.speed)) : DEFAULT_AUDIO.speed,
    tone: typeof a?.tone === "string" ? a.tone.slice(0, 200) : DEFAULT_AUDIO.tone,
    captions: { on: c.on !== false, style: c.style && c.style in CAPTION_STYLES ? c.style : "band", y: typeof c.y === "number" ? Math.min(1500, Math.max(160, c.y)) : 380, size: typeof c.size === "number" ? Math.min(1.6, Math.max(0.7, c.size)) : 1 },
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
