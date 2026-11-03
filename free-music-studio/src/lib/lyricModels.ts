// AI 작사 모델 선택지 — 루트 docs/AI_MODEL_CATALOG.md(2026-11-03 확인) Claude 등급별 추천 3개, 기본값은 중가 균형.
// 화면과 서버가 같은 목록을 쓰고, 서버는 이 목록에 있는 값만 받는다.

export const LYRIC_MODELS = [
  { id: "claude-haiku-5-5", label: "가성비 · Claude Haiku 5.5" },
  { id: "claude-sonnet-5-5", label: "균형(추천) · Claude Sonnet 5.5" },
  { id: "claude-opus-5-5", label: "최고 품질 · Claude Opus 5.5" },
] as const;

export type LyricModel = (typeof LYRIC_MODELS)[number]["id"];

export const DEFAULT_LYRIC_MODEL: LyricModel = "claude-sonnet-5-5";

export function toLyricModel(v: unknown): LyricModel {
  return LYRIC_MODELS.some((m) => m.id === v) ? (v as LyricModel) : DEFAULT_LYRIC_MODEL;
}
