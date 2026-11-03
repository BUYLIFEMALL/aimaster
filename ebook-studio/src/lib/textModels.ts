// 글 생성 Gemini 모델(화면·서버 공용). 2026-11-03 Gemini 2.5(12-01 종료)·1.5(종료) → 새 모델로 교체.
export const TEXT_MODELS = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash (추천)" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (초고속)" },
  { id: "gemini-4-argon", label: "Gemini 4 Argon (심층 분석 · 결제 연결된 키 필요)" },
] as const;
export const DEFAULT_TEXT_MODEL = "gemini-3.8-flash";

// 브라우저에 저장된 옛 모델 값도 새 모델로 호출한다.
const RETIRED_TEXT_MODEL: Record<string, string> = {
  "gemini-2.5-flash": "gemini-3.8-flash",
  "gemini-2.5-pro": "gemini-3.8-flash",
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
  "gemini-1.5-flash": "gemini-3.8-flash",
  "gemini-1.5-pro": "gemini-3.8-flash",
};

/** 저장값·요청값을 지금 쓸 수 있는 모델로(옛 값은 대체 모델, 목록에 없으면 기본 모델). */
export function currentTextModel(model: unknown): string {
  const id = typeof model === "string" ? RETIRED_TEXT_MODEL[model] ?? model : "";
  return TEXT_MODELS.some((m) => m.id === id) ? id : DEFAULT_TEXT_MODEL;
}
