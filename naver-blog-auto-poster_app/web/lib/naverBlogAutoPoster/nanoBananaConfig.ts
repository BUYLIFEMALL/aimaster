/**
 * 나노바나나(Gemini 이미지) 모델 목록 공용 기준 코드 — 등급별 모델 이름·화질·생성 온도 (2026-10-17 주인님 지시로 통합).
 *
 * ⚠️ 공용 기준 코드(docs/SHARED_MODULES.md, 모듈 id: gemini-image-models).
 *   - 기준(여기만 고친다): ai-image-studio/lib/providers/nanoBananaModels.ts
 *   - 사본(직접 고치지 않는다): 각 프로그램의 nanoBananaConfig.ts / nanoBananaModels.ts — 파일 이름은 프로그램마다 달라도 내용은 이 파일과 같다.
 *   기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync` → 사본을 쓰는 프로그램 모두 테스트·빌드·배포·버전 +0.01.
 *
 * 값은 이미지 레퍼런스 프로그램 ai-image-studio v1.11의 검증값(2026-10-17 공식 문서·시험 생성)과 같다.
 * 프로그램마다 결과물을 다르게 해야 하면 이 파일을 바꾸지 말고, 그 프로그램에서 getNanoBananaConfig() 결과를 덮어써 보완한다(주인님 지시).
 * 화면(클라이언트)에서도 불러올 수 있게 server-only를 넣지 않는다(키·비밀값 없음).
 */

export type NanoBananaModelType = "nanobanana" | "nanobanana-2-2k" | "nanobanana-2-4k" | "nanobanana-pro";
export type ImageSizeOption = "1K" | "2K" | "4K";

export interface NanoBananaModelConfig {
  /** 실제 Gemini 모델 이름 */
  modelName: string;
  /** 공식 generateContent 주소(키는 붙이지 않는다 — 호출은 geminiImage.ts가 머리글로 보냄) */
  endpoint: string;
  /** 이 등급의 기본 화질 */
  imageSize: ImageSizeOption;
  /** 이 모델이 받는 화질 */
  sizes: ImageSizeOption[];
  temperature: number;
  /** 화면 표시용 이름 */
  label: string;
}

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models";
const nb = (modelName: string, imageSize: ImageSizeOption, sizes: ImageSizeOption[], temperature: number, label: string): NanoBananaModelConfig => ({
  modelName,
  endpoint: `${GEMINI_API}/${modelName}:generateContent`,
  imageSize,
  sizes,
  temperature,
  label,
});

// 2026-10-17 가격(1장, 공식 가격표): nano-banana-2.1 1K $0.0336·2K $0.0504·4K $0.113 / 3-pro-image 1·2K $0.134·4K $0.24 / 3.1-flash-lite-image 1K $0.0336
export const NANO_BANANA_MODEL_CONFIGS: Record<NanoBananaModelType, NanoBananaModelConfig> = {
  nanobanana: nb("gemini-3.1-flash-lite-image", "1K", ["1K"], 0.7, "NanoBanana Lite · 1K (빠름·저렴)"),
  "nanobanana-2-2k": nb("gemini-nano-banana-2.1", "2K", ["1K", "2K", "4K"], 0.7, "NanoBanana 2 · 2K (추천)"),
  "nanobanana-2-4k": nb("gemini-nano-banana-2.1", "4K", ["1K", "2K", "4K"], 0.7, "NanoBanana 2 · 4K (고화질)"),
  "nanobanana-pro": nb("gemini-3-pro-image", "4K", ["1K", "2K", "4K"], 0.4, "NanoBanana Pro · 4K (정밀 묘사)"),
};

export const DEFAULT_NANO_BANANA_MODEL: NanoBananaModelType = "nanobanana-2-2k";

export const NANO_BANANA_MODEL_OPTIONS: { label: string; value: NanoBananaModelType }[] = (
  Object.keys(NANO_BANANA_MODEL_CONFIGS) as NanoBananaModelType[]
).map((value) => ({ label: NANO_BANANA_MODEL_CONFIGS[value].label, value }));

/** 등급 이름으로 설정을 찾는다. 모르는 값이면 기본(2K). */
export function getNanoBananaConfig(modelType?: string): NanoBananaModelConfig {
  return NANO_BANANA_MODEL_CONFIGS[modelType as NanoBananaModelType] ?? NANO_BANANA_MODEL_CONFIGS[DEFAULT_NANO_BANANA_MODEL];
}

/** 요청 화질이 이 모델에서 가능하면 그대로, 아니면 등급 기본 화질(예: Lite에 2K → 1K). */
export function resolveImageSize(config: NanoBananaModelConfig, requested?: string): ImageSizeOption {
  return requested && (config.sizes as string[]).includes(requested) ? (requested as ImageSizeOption) : config.imageSize;
}
