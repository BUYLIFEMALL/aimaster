import "server-only";

// blog 서브프로젝트의 utils/news/nanoBananaConfig.ts와 동일한 모델 옵션을 그대로 재사용한다
// (사용자 지시: "블로그(원문) 자동화에 만들어놓은 나노바나나 모델별 선택 방식 참고해서 구현").
// 서브프로젝트 간 직접 import는 안 되므로(각자 독립된 앱) 같은 설정을 루트에도 복사해둔다.

export interface NanoBananaModelConfig {
  modelName: string;
  endpoint: string;
  imageSize: "1K" | "2K" | "4K";
  temperature: number;
}

export const NANO_BANANA_MODEL_CONFIGS: Record<string, NanoBananaModelConfig> = {
  nanobanana: {
    modelName: "gemini-2.5-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-image:generateContent",
    imageSize: "1K",
    temperature: 0.7,
  },
  "nanobanana-2-2k": {
    modelName: "gemini-3.1-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
    imageSize: "2K",
    temperature: 0.7,
  },
  "nanobanana-2-4k": {
    modelName: "gemini-3.1-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
    imageSize: "4K",
    temperature: 0.7,
  },
  "nanobanana-pro": {
    modelName: "gemini-3-pro-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-3-pro-image:generateContent",
    imageSize: "4K",
    temperature: 0.7,
  },
};

export function getNanoBananaConfig(modelType: string): NanoBananaModelConfig {
  return NANO_BANANA_MODEL_CONFIGS[modelType] || NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"];
}
