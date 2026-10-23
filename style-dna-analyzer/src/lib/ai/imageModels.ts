// [이미지 모델 교체 2026-10-17] gemini-nano-banana-2.1(-preview) → gemini-nano-banana-2.1, gemini-nano-banana-2.1 → gemini-3.1-flash-lite-image(경량 1K), 기준: ai-image-studio v1.11.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
// 결과 테스트용 이미지 모델 레지스트리. 모델 ID·크기는 운영 중인 naver-blog-agent(src/lib/ai/imageGenerator.ts)의 나노바나나 설정과 같은 값이다.
// 이미지 모델은 글쓰기 모델과 별도로 고른다(docs/AI_MODEL_INTEGRATION_STANDARD.md).
import { NANO_BANANA_MODEL_CONFIGS, type NanoBananaModelType } from "./nanoBananaModels";

export interface ImageModelOption {
  value: string;
  label: string;
  /** Gemini API 모델 ID */
  model: string;
  size: "1K" | "2K" | "4K";
  temperature: number;
}

// 2026-10-17: 모델 이름·화질·온도는 공용 기준 코드 gemini-image-models(./nanoBananaModels — 기준은 ai-image-studio)에서 가져온다(주인님 지시로 통합).
// 이 프로그램은 화면에 보일 등급과 이름·순서만 정한다.
const OPTIONS: { value: NanoBananaModelType; label: string }[] = [
  { value: "nanobanana-2-2k", label: "Nano Banana 2 · 2K (기본 추천)" },
  { value: "nanobanana", label: "Nano Banana · 1K (경량)" },
];

export const IMAGE_MODELS: ImageModelOption[] = OPTIONS.map(({ value, label }) => {
  const c = NANO_BANANA_MODEL_CONFIGS[value];
  return { value, label, model: c.modelName, size: c.imageSize, temperature: c.temperature };
});

export const DEFAULT_IMAGE_MODEL = IMAGE_MODELS[0].value;

export function findImageModel(value: string): ImageModelOption | undefined {
  return IMAGE_MODELS.find((m) => m.value === value);
}
