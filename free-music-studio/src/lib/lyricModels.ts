// AI 작사 공급사·모델 선택지 — 루트 docs/AI_MODEL_CATALOG.md(2026-11-03 확인) 등급별 추천 3개씩, 기본값은 중가 균형.
// 순서는 주인님 지시(2026-11-03) 「좌측부터 OpenAI / Claude / Gemini」, 다른 음악 프로그램(music-automation v1.48)과 같다.
// 화면과 서버가 같은 목록을 쓰고, 서버는 이 목록에 있는 값만 받는다.

export const LYRIC_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-6-luna", label: "가성비 · GPT-6 Luna" },
      { id: "gpt-6.1-terra", label: "균형(추천) · GPT-6.1 Terra" },
      { id: "gpt-6-astra", label: "최고 품질 · GPT-6 Astra" },
    ],
    defaultModel: "gpt-6.1-terra",
  },
  {
    id: "anthropic",
    label: "Claude",
    models: [
      { id: "claude-haiku-5-5", label: "가성비 · Claude Haiku 5.5" },
      { id: "claude-sonnet-5-5", label: "균형(추천) · Claude Sonnet 5.5" },
      { id: "claude-opus-5-5", label: "최고 품질 · Claude Opus 5.5" },
    ],
    defaultModel: "claude-sonnet-5-5",
  },
  {
    id: "gemini",
    label: "Gemini",
    models: [
      { id: "gemini-3.5-flash-lite", label: "가성비 · Gemini 3.5 Flash-Lite" },
      { id: "gemini-3.8-flash", label: "균형(추천) · Gemini 3.8 Flash" },
      { id: "gemini-4-argon", label: "최고 품질 · Gemini 4 Argon (결제 연결 키 필요)" },
    ],
    defaultModel: "gemini-3.8-flash",
  },
] as const;

export type LyricProvider = (typeof LYRIC_PROVIDERS)[number]["id"];
export type LyricModel = (typeof LYRIC_PROVIDERS)[number]["models"][number]["id"];

export const DEFAULT_LYRIC_PROVIDER: LyricProvider = "anthropic";

export function toLyricProvider(v: unknown): LyricProvider {
  return LYRIC_PROVIDERS.some((p) => p.id === v) ? (v as LyricProvider) : DEFAULT_LYRIC_PROVIDER;
}

/** 공급사 목록에 있는 모델만 받고, 아니면 그 공급사의 균형 모델. */
export function toLyricModel(provider: LyricProvider, v: unknown): LyricModel {
  const p = LYRIC_PROVIDERS.find((x) => x.id === provider)!;
  return (p.models.some((m) => m.id === v) ? v : p.defaultModel) as LyricModel;
}
