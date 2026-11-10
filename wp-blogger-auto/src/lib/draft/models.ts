// 원고 AI 모델 선택지 — docs/AI_MODEL_CATALOG.md(2026-11-03 확인) Claude 등급별 추천 3개, 기본값 = 중가 균형.
// 회원 본인 Anthropic 키로만 호출한다(최상위 규칙). OpenAI·Gemini 선택은 다음 단계(docs/IMPROVEMENTS.md).
export const DRAFT_MODELS = [
  { id: "claude-haiku-5-5", label: "가성비 · Claude Haiku 5.5", note: "빠르고 저렴 · 원고 1편 약 5원" },
  { id: "claude-sonnet-5-5", label: "균형(추천) · Claude Sonnet 5.5", note: "긴 글 품질과 비용의 균형 · 원고 1편 약 100~200원" },
  { id: "claude-opus-5-5", label: "최고 품질 · Claude Opus 5.5", note: "가장 정교함 · 원고 1편 약 200~400원" },
] as const;

export type DraftModelId = (typeof DRAFT_MODELS)[number]["id"];
export const DEFAULT_DRAFT_MODEL: DraftModelId = "claude-sonnet-5-5";

export function pickModel(raw: unknown): DraftModelId {
  return DRAFT_MODELS.some((m) => m.id === raw) ? (raw as DraftModelId) : DEFAULT_DRAFT_MODEL;
}

export const LENGTHS = {
  short: { label: "짧게(약 1,500자)", chars: 1500 },
  normal: { label: "보통(약 3,000자)", chars: 3000 },
  long: { label: "길게(약 5,000자)", chars: 5000 },
} as const;
export type LengthKey = keyof typeof LENGTHS;
export const pickLength = (raw: unknown): LengthKey => (raw === "short" || raw === "long" ? raw : "normal");
