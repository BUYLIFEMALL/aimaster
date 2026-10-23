// 2026-10-23 v1.40 배경음악 모델 목록(화면·서버 공용 — 서버 전용 코드 없음). 단가는 AI 음악 스튜디오 catalog와 같은 값.
export const BGM_MODELS = [
  { id: "suno:V6", label: "Suno V6 (기본 · 2곡)", note: "1~3분 · 크레딧 약 12", key: "suno" },
  { id: "suno:V6_MINI", label: "Suno V6 Mini (2곡 · 빠름)", note: "가볍고 빠름", key: "suno" },
  { id: "suno:V6_WILD", label: "Suno V6 Wild (2곡 · 실험적)", note: "더 대담한 표현", key: "suno" },
  { id: "lyria:lyria-3.5", label: "Google Lyria 3.5 (1곡)", note: "약 1분 · 곡당 약 $0.08 · Gemini 키", key: "gemini" },
  { id: "elevenlabs:music_v2_5", label: "ElevenLabs Music (1곡)", note: "60초 · 약 $0.15 · ElevenLabs 키", key: "elevenlabs" },
] as const;
export type BgmModelId = (typeof BGM_MODELS)[number]["id"];
export const DEFAULT_BGM_MODEL: BgmModelId = "suno:V6";
export const isBgmModel = (v: unknown): v is BgmModelId => BGM_MODELS.some((m) => m.id === v);
