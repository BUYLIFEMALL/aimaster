// 글 생성 AI·이미지 생성 모델 목록과 "지금 어떤 엔진·키를 쓰는가"를 정하는 도우미(순수 함수).
// 모델 ID 는 운영 중인 naver-blog-agent(src/lib/ai/contentModels.ts)에서 쓰는 값만 옮겼다. 새 설정이 없는 회원은 기존 Gemini 설정(textModel/imageModel) 그대로 동작한다.
import type { AppSettings } from "@/lib/storage";
import type { TextProvider } from "./llm";

export interface TextEngineInfo {
  provider: TextProvider;
  label: string;
  sub: string;
  icon: string;
  models: { value: string; label: string }[];
}

export const TEXT_ENGINES: TextEngineInfo[] = [
  {
    provider: "gemini",
    label: "Gemini",
    sub: "Google",
    icon: "✨",
    models: [
      { value: "gemini-flash-latest", label: "⚡ Gemini Flash (기존 기본 · 최신 Flash 자동)" },
      { value: "gemini-flash-lite-latest", label: "⚡ Gemini Flash Lite (가장 빠르고 저렴)" },
      { value: "gemini-3.7-flash", label: "⚡ Gemini 3.7 Flash (속도와 품질 균형)" },
      { value: "gemini-3.8-flash", label: "🚀 Gemini 3.8 Flash (최신 세대 Flash)" },
      { value: "gemini-3.5-flash-lite", label: "⚡ Gemini 3.5 Flash Lite (빠르고 저렴)" },
      { value: "gemini-3.1-pro-preview", label: "💎 Gemini 3.1 Pro Preview (최상위, 미리보기)" },
    ],
  },
  {
    provider: "openai",
    label: "GPT",
    sub: "OpenAI",
    icon: "🤖",
    models: [
      { value: "gpt-4.1", label: "🚀 GPT-4.1 (스마트 모델 · 추천)" },
      { value: "gpt-6-luna", label: "⚡ GPT-6 Luna (가성비 초고속)" },
      { value: "gpt-6-sol", label: "🎯 GPT-6 Sol (균형형)" },
      { value: "gpt-6-astra", label: "💎 GPT-6 Astra (최고 품질)" },
      { value: "gpt-4o", label: "⚙️ GPT-4o (범용 표준)" },
      { value: "gpt-4o-mini", label: "⚡ GPT-4o-mini (빠르고 저렴)" },
    ],
  },
  {
    provider: "anthropic",
    label: "Claude",
    sub: "Anthropic",
    icon: "🧠",
    models: [
      { value: "claude-sonnet-5", label: "🎯 Claude Sonnet 5 (자연스러운 문체 · 추천)" },
      { value: "claude-opus-5", label: "💎 Claude Opus 5 (복잡한 맥락 이해)" },
      { value: "claude-haiku-4-5", label: "⚡ Claude Haiku 4.5 (가성비 초고속)" },
    ],
  },
];

export type ImagePlatform = "nanobanana" | "openai" | "flux" | "zimage";
export type ImageKeyProvider = "gemini" | "openai" | "replicate";

export const IMAGE_PLATFORMS: { id: ImagePlatform; name: string; sub: string; icon: string; keyProvider: ImageKeyProvider }[] = [
  { id: "nanobanana", name: "NanoBanana", sub: "Google Gemini", icon: "🍌", keyProvider: "gemini" },
  { id: "openai", name: "GPT Image", sub: "OpenAI", icon: "🤖", keyProvider: "openai" },
  { id: "flux", name: "FLUX 2.0", sub: "Black Forest", icon: "⚡", keyProvider: "replicate" },
  { id: "zimage", name: "Z-Image", sub: "Alibaba 6B", icon: "🚀", keyProvider: "replicate" },
];

export const IMAGE_MODELS: { value: string; label: string; platform: ImagePlatform }[] = [
  { value: "nanobanana-2-2k", label: "NanoBanana 2-2K (고화질 시네마틱 · 추천)", platform: "nanobanana" },
  { value: "nanobanana", label: "NanoBanana 2-1K (표준 경량)", platform: "nanobanana" },
  { value: "nanobanana-2-4k", label: "NanoBanana 2-4K (울트라 HD)", platform: "nanobanana" },
  { value: "nanobanana-pro", label: "NanoBanana Pro (정밀 비주얼)", platform: "nanobanana" },
  { value: "gpt-image-2", label: "GPT Image 2 (OpenAI 표준 비주얼 · 추천)", platform: "openai" },
  { value: "chatgpt-image-latest", label: "ChatGPT Image Latest (최신 통합 플래그십)", platform: "openai" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5 (고성능)", platform: "openai" },
  { value: "gpt-image-1", label: "GPT Image 1 (표준 1세대)", platform: "openai" },
  { value: "gpt-image-1-mini", label: "GPT Image 1 Mini (초고속 경량)", platform: "openai" },
  { value: "black-forest-labs/flux-2-dev", label: "FLUX 2 [dev] (정밀 디테일·빠름 · 추천)", platform: "flux" },
  { value: "black-forest-labs/flux-2-pro", label: "FLUX 2 [pro] (상업용 극실사)", platform: "flux" },
  { value: "black-forest-labs/flux-2-max", label: "FLUX 2 [max] (최대 해상도)", platform: "flux" },
  { value: "prunaai/z-image-turbo", label: "Z-Image Turbo (초고속 극실사 · 추천)", platform: "zimage" },
];

export const DEFAULT_IMAGE_BY_PLATFORM: Record<ImagePlatform, string> = {
  nanobanana: "nanobanana-2-2k",
  openai: "gpt-image-2",
  flux: "black-forest-labs/flux-2-dev",
  zimage: "prunaai/z-image-turbo",
};

export const KEY_LABEL: Record<ImageKeyProvider, string> = { gemini: "Google Gemini", openai: "OpenAI", replicate: "Replicate" };

export function findTextEngine(provider: string) {
  return TEXT_ENGINES.find((e) => e.provider === provider);
}

export function isKnownTextModel(provider: string, model: string): boolean {
  return !!findTextEngine(provider)?.models.some((m) => m.value === model);
}

export function findImageModel(value: string) {
  return IMAGE_MODELS.find((m) => m.value === value);
}

export function imagePlatformOf(value: string): ImagePlatform | undefined {
  return findImageModel(value)?.platform;
}

const KEY_FIELD = { gemini: "geminiApiKey", openai: "openaiApiKey", anthropic: "anthropicApiKey", replicate: "replicateApiKey" } as const;

export function keyOf(settings: AppSettings, provider: TextProvider | ImageKeyProvider): string {
  return (settings[KEY_FIELD[provider]] ?? "").trim();
}

export interface ResolvedTextEngine {
  provider: TextProvider;
  model: string;
  apiKey: string;
  label: string;
}

/** 지금 글 생성에 쓸 AI. 새 설정이 없으면 기존 Gemini 설정(textModel)을 그대로 쓴다. */
export function resolveTextEngine(settings: AppSettings): ResolvedTextEngine {
  const provider = (settings.textProvider && findTextEngine(settings.textProvider) ? settings.textProvider : "gemini") as TextProvider;
  const model = provider === "gemini" && !settings.textModelId ? settings.textModel : settings.textModelId && isKnownTextModel(provider, settings.textModelId) ? settings.textModelId : findTextEngine(provider)!.models[0].value;
  return { provider, model, apiKey: keyOf(settings, provider), label: findTextEngine(provider)!.label };
}

export interface ResolvedImageEngine {
  platform: ImagePlatform;
  model: string;
  keyProvider: ImageKeyProvider;
  apiKey: string;
  label: string;
}

const LEGACY_IMAGE: Record<string, string> = { "nano-banana-2": "nanobanana-2-2k", "nano-banana-2-lite": "nanobanana" };

/** 지금 이미지 생성에 쓸 모델. 새 설정이 없으면 기존 나노바나나 설정(imageModel)을 그대로 쓴다. */
export function resolveImageEngine(settings: AppSettings): ResolvedImageEngine {
  const modelId = settings.imageModelId && findImageModel(settings.imageModelId) ? settings.imageModelId : LEGACY_IMAGE[settings.imageModel] ?? DEFAULT_IMAGE_BY_PLATFORM.nanobanana;
  const platform = imagePlatformOf(modelId) ?? "nanobanana";
  const keyProvider = IMAGE_PLATFORMS.find((p) => p.id === platform)!.keyProvider;
  return { platform, model: modelId, keyProvider, apiKey: keyOf(settings, keyProvider), label: findImageModel(modelId)?.label.split(" (")[0] ?? modelId };
}

/** 선택한 공급사의 본인 키가 없을 때 보여 줄 안내(다른 공급사로 자동 전환하지 않는다). */
export function missingKeyMessage(kind: "text" | "image", settings: AppSettings): string | null {
  if (kind === "text") {
    const e = resolveTextEngine(settings);
    return e.apiKey ? null : `선택한 ${e.label}의 본인 API 키가 없습니다. [API키등록·플랫폼연동]에서 키를 등록하거나 키가 있는 AI를 선택해주세요. (다른 AI로 자동 전환하지 않습니다)`;
  }
  const i = resolveImageEngine(settings);
  return i.apiKey ? null : `선택한 이미지 모델에는 ${KEY_LABEL[i.keyProvider]} API 키가 필요합니다. [API키등록·플랫폼연동]에서 키를 등록하거나 다른 이미지 모델을 선택해주세요.`;
}
