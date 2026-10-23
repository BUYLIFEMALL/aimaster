// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
import { NANO_BANANA_MODEL_CONFIGS } from "./nanoBananaModels";
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
export const PROVIDERS = ["gemini", "pixabay", "pexels"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const THEMES = [
  {
    id: "wise",
    emoji: "📜",
    name: "명언·좋은 글",
    description: "삶에 관한 조언이나 깊은 교훈",
  },
  {
    id: "health",
    emoji: "🌿",
    name: "건강·행복 기원",
    description: "덕담이나 따뜻한 응원의 말",
  },
  {
    id: "sharing",
    emoji: "💌",
    name: "카톡/밴드 공유",
    description: "지인에게 전하는 다정한 메시지",
  },
];

export const SOURCES: { id: Provider; emoji: string; name: string }[] = [
  { id: "gemini", emoji: "🎨", name: "나노바나나 이미지 생성" },
  { id: "pixabay", emoji: "📷", name: "Pixabay 무료이미지 가져오기" },
  { id: "pexels", emoji: "🖼️", name: "Pexels 무료이미지 가져오기" },
];

export const RATIOS = ["9:16", "1:1", "3:4"] as const;
export type Ratio = (typeof RATIOS)[number];

export const STYLES = ["시", "에세이", "짧은 문장"] as const;

export const TEXT_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

// 2026-10-17: 이미지 모델 이름은 공용 기준 코드 gemini-image-models(./nanoBananaModels — 기준은 ai-image-studio)의 1K·2K 등급에서 가져온다(주인님 지시로 통합).
export const IMAGE_MODELS = [
  { id: NANO_BANANA_MODEL_CONFIGS.nanobanana.modelName, label: "Nano Banana 2 Lite" },
  { id: NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"].modelName, label: "Nano Banana 2" },
];

export const FONTS = [
  { id: "Gowun Dodum", label: "고운돋움" },
  { id: "Nanum Myeongjo", label: "나눔명조" },
  { id: "Nanum Pen Script", label: "나눔손글씨" },
];

export type Design = {
  font: string;
  size: number;
  color: string;
  position: "top" | "center" | "bottom";
  overlay: number;
  signature: string;
};

export type Photo = {
  id: string;
  url: string;
  preview: string;
  author: string;
  pageUrl: string;
  source: "pixabay" | "pexels";
};

export const DEFAULT_DESIGN: Design = {
  font: FONTS[0].id,
  size: 54,
  color: "#ffffff",
  position: "center",
  overlay: 35,
  signature: "",
};

export function ratioSize(ratio: Ratio) {
  return {
    width: 1080,
    height: ratio === "9:16" ? 1920 : ratio === "3:4" ? 1440 : 1080,
  };
}

export function isProvider(value: unknown): value is Provider {
  return PROVIDERS.includes(value as Provider);
}
