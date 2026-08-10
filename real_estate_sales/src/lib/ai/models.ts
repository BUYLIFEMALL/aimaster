// 클라이언트 컴포넌트에서도 안전하게 import할 수 있도록 모델 옵션만 분리
// (analyze.ts는 "server-only"라 클라이언트 번들에 포함될 수 없음).
export type AnalysisModel = "gpt-4o-mini" | "o3";

export const ANALYSIS_MODEL_OPTIONS: { value: AnalysisModel; label: string }[] = [
  { value: "gpt-4o-mini", label: "가성비 (gpt-4o-mini, 빠르고 저렴)" },
  { value: "o3", label: "정밀 분석 (o3, 느리지만 추론력 높음 · 비용 높음)" },
];
