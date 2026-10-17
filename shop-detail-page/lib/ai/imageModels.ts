// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
// 섹션 이미지 생성 모델: 나노바나나2(저렴) / 나노바나나 프로(고품질, 기본값).
// server-only인 gemini.ts와 분리한 이유: 이 상수들은 클라이언트 컴포넌트
// (ProductAnalyzeForm, SectionImageGrid)에서도 값으로 직접 import해서 써야 하기 때문.
// 2026-10-17: 모델 이름은 공용 기준 코드 gemini-image-models(./nanoBananaModels — 기준은 ai-image-studio)의 등급에서 가져온다(주인님 지시로 통합).
import { NANO_BANANA_MODEL_CONFIGS } from "./nanoBananaModels";

export const IMAGE_MODELS = {
  nanobanana2: NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"].modelName,
  nanobananaPro: NANO_BANANA_MODEL_CONFIGS["nanobanana-pro"].modelName,
};
export type ImageModelKey = keyof typeof IMAGE_MODELS;
export const DEFAULT_IMAGE_MODEL: ImageModelKey = "nanobananaPro";

// /products/new(상품 저장 시 선택)와 /products/[id](섹션 이미지 생성 시 선택)가 동일한
// 옵션 목록을 공유한다.
export const IMAGE_MODEL_OPTIONS: { value: ImageModelKey; label: string; hint: string }[] = [
  { value: "nanobananaPro", label: "Nanobanana Pro(고퀄리티)", hint: "고품질 · 비쌈" },
  { value: "nanobanana2", label: "Nanobanana2(가성비)", hint: "기본 · 저렴" },
];

// Google Gemini API 공식 요금표 기준, 2K 해상도 출력 이미지 1장당 단가(USD).
// (섹션 템플릿이 전부 resolution:'2K'로 시딩되어 있어 이 단가를 그대로 쓴다.)
// https://ai.google.dev/gemini-api/docs/pricing — 요금이 바뀔 수 있으니 참고용 추정치임을 UI에 함께 표기한다.
export const IMAGE_MODEL_COST_USD: Record<ImageModelKey, number> = {
  nanobananaPro: 0.134,
  nanobanana2: 0.101,
};
