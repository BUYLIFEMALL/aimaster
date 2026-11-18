// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
import { NANO_BANANA_MODEL_CONFIGS } from "./nanoBananaModels";
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
// 2026-11-18: 이미지 생성은 나노바나나(gemini)·OpenAI(openai)·무료모델(free), 글귀 생성은 3사(gemini·openai·anthropic).
export const PROVIDERS = ["gemini", "openai", "free", "pixabay", "pexels", "anthropic"] as const;
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

export const SOURCES: { id: Provider; emoji: string; name: string; description?: string }[] = [
  { id: "gemini", emoji: "🍌", name: "나노바나나 AI 생성", description: "Gemini AI 감성 일러스트·수채화 배경" },
  { id: "openai", emoji: "🤖", name: "OpenAI 이미지 생성", description: "GPT Image 고해상도 예술 배경 생성" },
  { id: "free", emoji: "✨", name: "무료 모델 (FLUX)", description: "준비 중 — 이용 정책 확인 뒤 열립니다" },
];

export const RATIOS = ["9:16", "1:1", "3:4"] as const;
export type Ratio = (typeof RATIOS)[number];

export const STYLES = ["시", "에세이", "짧은 문장"] as const;

// 글귀 생성 모델은 2026-11-18부터 OpenAI·Claude·Gemini 9개(./textModels). 옛 모델 이름 바꾸기도 그쪽에 있다.
export { TEXT_MODELS, currentTextModel } from "./textModels";

// 2026-10-17: 이미지 모델 이름은 공용 기준 코드 gemini-image-models(./nanoBananaModels — 기준은 ai-image-studio)의 1K·2K 등급에서 가져온다(주인님 지시로 통합).
// ECOM-20261118-03(QA049 I-F01): 이미지 엔진별 허용 모델 — 목록 밖·다른 회사 모델은 외부 호출 전에 거절한다.
// OpenAI는 공식 문서 확인분만(2026-11-18 https://developers.openai.com/api/docs/models · /api/reference/resources/images):
// b64_json 응답 전용(url 미지원), response_format 미지원, 표준 크기 1024x1024·1536x1024·1024x1536.
export const OPENAI_IMAGE_MODELS = [{ id: "gpt-image-2.5-flare", label: "GPT-Image-2.5 Flare" }];
// 무료 엔진(Pollinations FLUX, 키 없음): 회원 본인 키 규칙·공식 지원·약관·글귀 외부 전송 결정 전까지 꺼 둔다(서버 거절·화면 비활성).
export const FREE_IMAGE_ENGINE_ENABLED = false;
// ECOM-20261118-05: 무료 엔진 = Cloudflare Workers AI(회원 본인 계정 ID + 토큰). Pollinations(키 없음)는 제거.
export const FREE_IMAGE_MODELS = [{ id: "@cf/black-forest-labs/flux-1-schnell", label: "FLUX.1 schnell (Cloudflare)" }];
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
