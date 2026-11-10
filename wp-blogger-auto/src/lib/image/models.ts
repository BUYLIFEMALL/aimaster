// 본문 이미지 모델 선택지(화면·서버 공용) — 공용 gemini-image-models 등급 중 블로그에 맞는 2개. 회원 본인 Gemini 키.
export const IMAGE_MODELS = [
  { id: "nanobanana", label: "빠름·저렴 · NanoBanana Lite 1K", note: "1장 약 50원" },
  { id: "nanobanana-2-2k", label: "선명(추천) · NanoBanana 2 · 2K", note: "1장 약 70원" },
] as const;
export const DEFAULT_IMAGE_MODEL = "nanobanana-2-2k";
