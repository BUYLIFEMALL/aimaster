// 「브라우저에서 만들기」 내레이션 목소리(OpenAI gpt-4o-mini-tts). 서버 경로(/api/render/tts)와 화면이 함께 쓴다.
export const TTS_VOICES = [
  { id: "coral", label: "코랄 · 밝은 여성" },
  { id: "nova", label: "노바 · 또렷한 여성" },
  { id: "shimmer", label: "시머 · 부드러운 여성" },
  { id: "sage", label: "세이지 · 차분한 중성" },
  { id: "ash", label: "애시 · 단단한 남성" },
  { id: "onyx", label: "오닉스 · 낮은 남성" },
] as const;
export type TtsVoice = (typeof TTS_VOICES)[number]["id"];
