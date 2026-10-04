export type ImageProvider = "nanobanana" | "openai" | "flux" | "zimage";

export interface ImageModelOption {
  value: string;
  label: string;
  provider: ImageProvider;
}

export interface ImageProviderConfig {
  id: ImageProvider;
  name: string;
  subName: string;
  icon: string;
  apiKeyProvider: "gemini" | "openai" | "replicate";
  description: string;
}

export const IMAGE_PROVIDERS: ImageProviderConfig[] = [
  {
    id: "nanobanana",
    name: "NanoBanana",
    subName: "Google Gemini",
    icon: "🍌",
    apiKeyProvider: "gemini",
    description: "Google Gemini 3.1 Flash 기반 2K/4K 시네마틱 스튜디오",
  },
  {
    id: "openai",
    name: "GPT Image",
    subName: "OpenAI",
    icon: "🤖",
    apiKeyProvider: "openai",
    description: "OpenAI 최신 GPT Image & DALL-E 3 고화질 라인업",
  },
  {
    id: "flux",
    name: "FLUX",
    subName: "Black Forest",
    icon: "⚡",
    apiKeyProvider: "replicate",
    description: "Black Forest Labs 공식 FLUX 2.0 극실사 플래그십",
  },
  {
    id: "zimage",
    name: "Z-Image",
    subName: "Alibaba 6B",
    icon: "🚀",
    apiKeyProvider: "replicate",
    description: "Alibaba 6B 초고속 극실사 & 타이포그래피 (0.5초 렌더링)",
  },
];

export const DEFAULT_IMAGE_MODELS: Record<ImageProvider, string> = {
  nanobanana: "nanobanana-2-2k",
  openai: "gpt-image-2",
  flux: "black-forest-labs/flux-2-dev",
  zimage: "prunaai/z-image-turbo",
};

export const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  // 1. NanoBanana (Gemini)
  { value: "nanobanana-2-2k", label: "NanoBanana 2-2K (2K 고화질 시네마틱 - 추천)", provider: "nanobanana" },
  { value: "nanobanana-pro", label: "NanoBanana Pro (프로페셔널 정밀 비주얼)", provider: "nanobanana" },
  { value: "nanobanana-2-4k", label: "NanoBanana 2-4K (4K 울트라 HD)", provider: "nanobanana" },
  { value: "nanobanana", label: "NanoBanana Standard (표준 경량 고속)", provider: "nanobanana" },

  // 2. GPT Image (OpenAI)
  { value: "gpt-image-2", label: "GPT Image 2 (OpenAI 표준 비주얼 - 추천)", provider: "openai" },
  { value: "chatgpt-image-latest", label: "ChatGPT Image Latest (최신 통합 플래그십)", provider: "openai" },
  { value: "gpt-image-1", label: "GPT Image 1 (표준 1세대)", provider: "openai" },
  { value: "gpt-image-1-mini", label: "GPT Image 1 Mini (초고속 경량 미니)", provider: "openai" },
  { value: "gpt-image-2.5-flare", label: "GPT Image 2.5 Flare (데일리 고품질)", provider: "openai" },
  { value: "gpt-image-2.5-sunburst", label: "GPT Image 2.5 Sunburst (최상위 플래그십)", provider: "openai" },
  { value: "dall-e-3", label: "DALL-E 3 (고해상도 창작 비주얼)", provider: "openai" },

  // 3. FLUX (Replicate)
  { value: "black-forest-labs/flux-2-dev", label: "FLUX 2 [dev] (정밀 디테일 & 초고속 최적화 - 추천)", provider: "flux" },
  { value: "black-forest-labs/flux-2-pro", label: "FLUX 2 [pro] (상업용 극실사 고해상도)", provider: "flux" },
  { value: "black-forest-labs/flux-2-max", label: "FLUX 2 [max] (최대 해상도 플래그십)", provider: "flux" },
  { value: "black-forest-labs/flux-dev", label: "FLUX.1 [dev] (개발자 원작 모델)", provider: "flux" },
  { value: "black-forest-labs/flux-schnell", label: "FLUX.1 [schnell] (4스텝 초고속)", provider: "flux" },

  // 4. Z-Image (Replicate)
  { value: "prunaai/z-image-turbo", label: "Z-Image Turbo (Alibaba 6B 0.5초 초고속 극실사 - 추천)", provider: "zimage" },
];
