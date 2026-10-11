// 결과 테스트용 이미지 모델 레지스트리. 모델 ID·크기는 운영 중인 naver-blog-agent(src/lib/ai/imageGenerator.ts)의 나노바나나 설정과 같은 값이다.
// 이미지 모델은 글쓰기 모델과 별도로 고른다(docs/AI_MODEL_INTEGRATION_STANDARD.md).
export interface ImageModelOption {
  value: string;
  label: string;
  /** Gemini API 모델 ID */
  model: string;
  size: "1K" | "2K" | "4K";
  temperature: number;
}

export const IMAGE_MODELS: ImageModelOption[] = [
  { value: "nanobanana-2-2k", label: "Nano Banana 2 · 2K (기본 추천)", model: "gemini-3.1-flash-image", size: "2K", temperature: 0.7 },
  { value: "nanobanana", label: "Nano Banana · 1K (경량)", model: "gemini-2.5-flash-image", size: "1K", temperature: 0.7 },
];

export const DEFAULT_IMAGE_MODEL = IMAGE_MODELS[0].value;

export function findImageModel(value: string): ImageModelOption | undefined {
  return IMAGE_MODELS.find((m) => m.value === value);
}
