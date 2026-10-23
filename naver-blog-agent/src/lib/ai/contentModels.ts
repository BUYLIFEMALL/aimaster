// 네이버 블로그 에이전트 — 글 생성 AI 엔진 및 4대 이미지 생성 플랫폼 모델 레지스트리
// threads-content-ops의 규격 및 모델 옵션을 통일하여 화면과 서버가 공유합니다.

export type EngineProvider = "openai" | "anthropic" | "gemini";

export interface EngineInfo {
  provider: EngineProvider;
  label: string;
  sub: string;
  icon: string;
  models: { value: string; label: string }[];
}

export const ENGINES: EngineInfo[] = [
  {
    provider: "openai",
    label: "GPT",
    sub: "OpenAI",
    icon: "🤖",
    models: [
      { value: "gpt-4.1", label: "🚀 GPT-4.1 (최신 세대 스마트 모델 · 기본 추천)" },
      { value: "gpt-6-luna", label: "⚡ GPT-6 Luna (최신 세대 · 가성비 초고속)" },
      { value: "gpt-6-sol", label: "🎯 GPT-6 Sol (최신 세대 · 균형형)" },
      { value: "gpt-6-astra", label: "💎 GPT-6 Astra (최신 세대 · 최고 품질 플래그십)" },
      { value: "gpt-5.6-luna", label: "⚡ GPT-5.6 Luna (가성비 초고속)" },
      { value: "gpt-5.6-terra", label: "🎯 GPT-5.6 Terra (균형형 자연스러운 어조)" },
      { value: "gpt-5.6-sol", label: "💎 GPT-5.6 Sol (최고 품질 플래그십)" },
      { value: "gpt-4o", label: "⚙️ GPT-4o (범용 표준 모델)" },
      { value: "gpt-4o-mini", label: "⚡ GPT-4o-mini (빠르고 저렴)" },
    ],
  },
  {
    provider: "anthropic",
    label: "Claude",
    sub: "Anthropic",
    icon: "🧠",
    models: [
      { value: "claude-sonnet-5", label: "🎯 Claude Sonnet 5 (최신 세대 · 자연스러운 문체 · 기본 추천)" },
      { value: "claude-opus-5", label: "💎 Claude Opus 5 (고급형 복잡한 맥락 이해)" },
      { value: "claude-haiku-4-5", label: "⚡ Claude Haiku 4.5 (가성비 초고속)" },
    ],
  },
  {
    provider: "gemini",
    label: "Gemini",
    sub: "Google",
    icon: "✨",
    models: [
      { value: "gemini-3.7-flash", label: "⚡ Gemini 3.7 Flash (속도와 품질 균형 · 기본 추천)" },
      { value: "gemini-3.8-flash", label: "🚀 Gemini 3.8 Flash (최신 세대 · 최고 성능 Flash)" },
      { value: "gemini-3.5-flash-lite", label: "⚡ Gemini 3.5 Flash Lite (가장 빠르고 저렴)" },
      { value: "gemini-3.1-pro-preview", label: "💎 Gemini 3.1 Pro Preview (Google 최상위 플래그십)" },
      { value: "gemini-2.0-flash", label: "⚙️ Gemini 2.0 Flash (안정형)" },
    ],
  },
];

export const DEFAULT_ENGINE = { provider: "openai" as EngineProvider, model: "gpt-4.1" };

export function isKnownEngine(provider: string, model: string): provider is EngineProvider {
  return ENGINES.some((e) => e.provider === provider && e.models.some((m) => m.value === model));
}

// ----- 이미지 생성 (4대 플랫폼: NanoBanana / GPT Image / FLUX 2.0 / Z-Image) -----
export type ImageRatio = "1:1" | "4:5" | "16:9" | "9:16";

export const IMAGE_RATIOS: { value: ImageRatio; label: string }[] = [
  { value: "1:1", label: "1:1 정사각형 (기본)" },
  { value: "4:5", label: "4:5 세로형 (블로그 피드)" },
  { value: "16:9", label: "16:9 가로형 (와이드 썸네일)" },
  { value: "9:16", label: "9:16 모바일 세로형" },
];

export type ImagePlatform = "nanobanana" | "openai" | "flux" | "zimage";
export type ImageKeyProvider = "gemini" | "openai" | "replicate";

export const IMAGE_PLATFORMS: { id: ImagePlatform; name: string; sub: string; icon: string; keyProvider: ImageKeyProvider }[] = [
  { id: "nanobanana", name: "NanoBanana", sub: "Google Gemini", icon: "🍌", keyProvider: "gemini" },
  { id: "openai", name: "GPT Image", sub: "OpenAI", icon: "🤖", keyProvider: "openai" },
  { id: "flux", name: "FLUX 2.0", sub: "Black Forest", icon: "⚡", keyProvider: "replicate" },
  { id: "zimage", name: "Z-Image", sub: "Alibaba 6B", icon: "🚀", keyProvider: "replicate" },
];

export const IMAGE_KEY_LABEL: Record<ImageKeyProvider, string> = {
  gemini: "Gemini",
  openai: "OpenAI",
  replicate: "Replicate",
};

export const IMAGE_MODELS: { value: string; label: string; platform: ImagePlatform }[] = [
  { value: "nanobanana-2-2k", label: "NanoBanana 2-2K (고화질 시네마틱 · 기본 추천)", platform: "nanobanana" },
  { value: "nanobanana", label: "NanoBanana 2-1K (표준 경량 모델)", platform: "nanobanana" },
  { value: "nanobanana-2-4k", label: "NanoBanana 2-4K (울트라 HD)", platform: "nanobanana" },
  { value: "nanobanana-pro", label: "NanoBanana Pro (프로페셔널 정밀 비주얼)", platform: "nanobanana" },
  { value: "gpt-image-2", label: "GPT Image 2 (OpenAI 표준 비주얼 · 추천)", platform: "openai" },
  { value: "chatgpt-image-latest", label: "ChatGPT Image Latest (최신 통합 플래그십)", platform: "openai" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5 (고성능)", platform: "openai" },
  { value: "gpt-image-1", label: "GPT Image 1 (표준 1세대)", platform: "openai" },
  { value: "gpt-image-1-mini", label: "GPT Image 1 Mini (초고속 경량 미니)", platform: "openai" },
  { value: "gpt-image-2.5-flare", label: "GPT Image 2.5 Flare (데일리 고품질)", platform: "openai" },
  { value: "gpt-image-2.5-sunburst", label: "GPT Image 2.5 Sunburst (최상위 플래그십)", platform: "openai" },
  { value: "black-forest-labs/flux-2-dev", label: "FLUX 2 [dev] (정밀 디테일 & 초고속 최적화 · 추천)", platform: "flux" },
  { value: "black-forest-labs/flux-2-pro", label: "FLUX 2 [pro] (상업용 극실사 고해상도)", platform: "flux" },
  { value: "black-forest-labs/flux-2-max", label: "FLUX 2 [max] (최대 해상도 플래그십)", platform: "flux" },
  { value: "prunaai/z-image-turbo", label: "Z-Image Turbo (Alibaba 6B 초고속 극실사 · 추천)", platform: "zimage" },
];

export const DEFAULT_IMAGE_PLATFORM: ImagePlatform = "nanobanana";

export const DEFAULT_IMAGE_MODELS: Record<ImagePlatform, string> = {
  nanobanana: "nanobanana-2-2k",
  openai: "gpt-image-2",
  flux: "black-forest-labs/flux-2-dev",
  zimage: "prunaai/z-image-turbo",
};

export const MAX_GENERATE_COUNT = 5;

export function findImageModel(value: string) {
  const model = IMAGE_MODELS.find((item) => item.value === value);
  if (!model) return undefined;
  const platform = IMAGE_PLATFORMS.find((item) => item.id === model.platform)!;
  return { ...model, keyProvider: platform.keyProvider };
}

export function isKnownRatio(value: string): value is ImageRatio {
  return IMAGE_RATIOS.some((item) => item.value === value);
}
