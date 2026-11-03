// 클라이언트 컴포넌트에서도 안전하게 import할 수 있도록 모델 옵션만 분리
// (analyze.ts는 "server-only"라 클라이언트 번들에 포함될 수 없음).
//
// GPT-5.6 계열(현재 OpenAI 공식 카탈로그)을 맨 앞에 두고, 이전에 쓰던 구형 모델 중
// gpt-4o/o3(중간급 이상)만 선택지로 남겨뒀다. 폴백 키 사용자끼리 분석 결과를 캐시
// 공유하게 되면서, 가성비용 저가 모델(gpt-4o-mini/o3-mini)은 굳이 선택지에 둘
// 실익이 적어 제외함. 단, gpt-4o/o3는 2026-08-10 기준 OpenAI 공식 문서 카탈로그에는
// 더 이상 나오지 않아 단종되었을 수 있다 — 실제로 호출 시 에러가 날 수 있으니 그
// 경우 위쪽 GPT-5.6 계열로 다시 시도할 것.
export type AnalysisModel = "gpt-5.6-luna" | "gpt-5.6-terra" | "gpt-5.6-sol" | "gpt-4o";

export const ANALYSIS_MODEL_OPTIONS: { value: AnalysisModel; label: string }[] = [
  { value: "gpt-5.6-luna", label: "가성비 (GPT-5.6 Luna, 가장 빠르고 저렴)" },
  { value: "gpt-5.6-terra", label: "균형형 (GPT-5.6 Terra, 성능과 비용 절충)" },
  { value: "gpt-5.6-sol", label: "최고 정밀 분석 (GPT-5.6 Sol, 프론티어 모델 · 비용 높음)" },
  { value: "gpt-4o", label: "구형 범용형 (GPT-4o, 이전 세대 균형 모델)" },
];

// 2026-11-03: o3는 2026-12-11 종료(공식 대체 gpt-5.6-sol) — 회원 설정(real_estate_user_preferences.preferred_model)에
// 저장된 옛 값은 대체 모델로, 목록에 없는 값은 기본값으로 읽는다(docs/PLAN_20261103_MODEL_MIGRATION_DEC.md).
const RETIRED_ANALYSIS_MODEL: Record<string, AnalysisModel> = { o3: "gpt-5.6-sol" };
export const DEFAULT_ANALYSIS_MODEL: AnalysisModel = "gpt-5.6-luna";

export function resolveAnalysisModel(value: unknown): AnalysisModel {
  const current = typeof value === "string" ? RETIRED_ANALYSIS_MODEL[value] ?? value : value;
  return ANALYSIS_MODEL_OPTIONS.some((o) => o.value === current) ? (current as AnalysisModel) : DEFAULT_ANALYSIS_MODEL;
}
