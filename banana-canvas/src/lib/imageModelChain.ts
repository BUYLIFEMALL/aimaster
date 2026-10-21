// 이미지 모델 순서(v1.15): 모델 이름은 공용 사본 nanoBananaModels.ts(기준 ai-image-studio)에서 가져온다 — 기준에서 모델을 바꾸면 여기도 따라간다.
// 앞 모델을 쓸 수 없으면(MODEL_NOT_FOUND·NO_IMAGE) 다음 모델로 넘어간다. 예전엔 빠른 모델 실패 시 4배 비싼 Pro로 넘어갔으나,
// 이제 기준의 추천 모델(nano-banana-2.1, 1K는 Lite와 같은 값)로 넘어간다. 프롬프트·화면은 바꾸지 않는다(이미지 규칙: 연동 부분만).
import { NANO_BANANA_MODEL_CONFIGS } from "./nanoBananaModels";
import type { ModelLevel } from "@/lib/bnc/types";

const LITE = NANO_BANANA_MODEL_CONFIGS.nanobanana;
const STANDARD = NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"];
const PRO = NANO_BANANA_MODEL_CONFIGS["nanobanana-pro"];

export const IMAGE_MODELS: Record<ModelLevel, string[]> = {
  flash: [LITE.modelName, STANDARD.modelName],
  pro: [PRO.modelName, STANDARD.modelName],
};

/** 그 모델이 해상도(2K·4K)를 받는가 — 기준 표의 sizes로 판단(Lite는 1K만) */
export function supportsImageSize(modelName: string, size: "1K" | "2K" | "4K"): boolean {
  return Object.values(NANO_BANANA_MODEL_CONFIGS).some((c) => c.modelName === modelName && (c.sizes as string[]).includes(size));
}
