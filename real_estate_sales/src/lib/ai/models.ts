// 클라이언트 컴포넌트에서도 안전하게 import할 수 있도록 모델 옵션만 분리
// (analyze.ts는 "server-only"라 클라이언트 번들에 포함될 수 없음).
//
// GPT-5.6 계열(현재 OpenAI 공식 카탈로그)을 맨 앞에 두고, 이전에 쓰던 구형 모델 중
// gpt-4o/o3(중간급 이상)만 선택지로 남겨뒀다. 폴백 키 사용자끼리 분석 결과를 캐시
// 공유하게 되면서, 가성비용 저가 모델(gpt-4o-mini/o3-mini)은 굳이 선택지에 둘
// 실익이 적어 제외함. 단, gpt-4o/o3는 2026-08-10 기준 OpenAI 공식 문서 카탈로그에는
// 더 이상 나오지 않아 단종되었을 수 있다 — 실제로 호출 시 에러가 날 수 있으니 그
// 경우 위쪽 GPT-5.6 계열로 다시 시도할 것.
export type AnalysisModel = "gpt-5.6-luna" | "gpt-5.6-terra" | "gpt-5.6-sol" | "gpt-4o" | "o3";

export const ANALYSIS_MODEL_OPTIONS: { value: AnalysisModel; label: string }[] = [
  { value: "gpt-5.6-luna", label: "가성비 (GPT-5.6 Luna, 가장 빠르고 저렴)" },
  { value: "gpt-5.6-terra", label: "균형형 (GPT-5.6 Terra, 성능과 비용 절충)" },
  { value: "gpt-5.6-sol", label: "최고 정밀 분석 (GPT-5.6 Sol, 프론티어 모델 · 비용 높음)" },
  { value: "gpt-4o", label: "gpt-4o (성능균형)" },
  { value: "o3", label: "o3 (성능균형)" },
];
