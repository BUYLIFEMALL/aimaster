// 클라이언트 컴포넌트에서도 안전하게 import할 수 있도록 모델 옵션만 분리
// (reply.ts는 "server-only"라 클라이언트 번들에 포함될 수 없음).
//
// real_estate_sales/src/lib/ai/models.ts와 동일한 최신 OpenAI 카탈로그(GPT-5.6 계열)를
// 재사용한다. gpt-4o-mini/gpt-4o처럼 구형 저가 모델은 2026-08 기준 카탈로그에서 빠질 수
// 있어 기본값을 GPT-5.6 Luna(가성비)로 바꿨다.
export type ReplyModel = "gpt-5.6-luna" | "gpt-5.6-terra" | "gpt-5.6-sol" | "gpt-4o";

export const REPLY_MODEL_OPTIONS: { value: ReplyModel; label: string }[] = [
  { value: "gpt-5.6-luna", label: "가성비 (GPT-5.6 Luna, 빠르고 저렴 · 기본값)" },
  { value: "gpt-5.6-terra", label: "균형형 (GPT-5.6 Terra, 더 자연스러운 답변)" },
  { value: "gpt-5.6-sol", label: "최고 품질 (GPT-5.6 Sol, 가장 똑똑함 · 비용 높음)" },
  { value: "gpt-4o", label: "구형 범용형 (GPT-4o, 이전 세대)" },
];

export const DEFAULT_REPLY_MODEL: ReplyModel = "gpt-5.6-luna";
