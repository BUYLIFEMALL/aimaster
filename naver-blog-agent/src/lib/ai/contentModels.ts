// 네이버 블로그 에이전트 — 글 생성 AI 엔진 및 4대 이미지 생성 플랫폼 모델 레지스트리
// threads-content-ops의 규격 및 모델 옵션을 통일하여 화면과 서버가 공유합니다.

export type EngineProvider = "openai" | "anthropic" | "gemini";

export interface EngineInfo {
  provider: EngineProvider;
  label: string;
  sub: string;
  icon: string;
  /** default: 그 플랫폼을 고를 때 처음 선택되는 모델(목록이 최신순이라 첫 항목이 기본이 아님) */
  models: { value: string; label: string; default?: true }[];
}

export const ENGINES: EngineInfo[] = [
  {
    provider: "openai",
    label: "GPT",
    sub: "OpenAI",
    icon: "🤖",
    // 2026-11-19 주인님 지시(최신 모델순·같은 기준): 플랫폼마다 최신 모델을 위로, 종료 예정·자동 연결 모델은 빼고 저장값은 대체 모델로 읽는다. 근거: 공식 모델 문서 + 실제 호출 확인(docs/AI_MODEL_CATALOG.md 0-1절).
    models: [
      { value: "gpt-6.2-astra", label: "💎 GPT-6.2 Astra (최신 · 최상위 품질)" },
      { value: "gpt-6.2-sol", label: "🎯 GPT-6.2 Sol (최신 · 일상 작업 고품질)" },
      { value: "gpt-6.1-terra", label: "🚀 GPT-6.1 Terra (균형형 · 기본 추천)", default: true },
      { value: "gpt-6.1-sol", label: "🎯 GPT-6.1 Sol (한 단계 높은 품질)" },
      { value: "gpt-6-astra", label: "💎 GPT-6 Astra (최상위 품질)" },
      { value: "gpt-6-sol", label: "🎯 GPT-6 Sol (균형형)" },
      { value: "gpt-6-luna", label: "⚡ GPT-6 Luna (가성비 초고속)" },
      { value: "gpt-5.6-sol", label: "💎 GPT-5.6 Sol (이전 세대 · 고품질)" },
      { value: "gpt-5.6-terra", label: "🎯 GPT-5.6 Terra (이전 세대 · 균형형)" },
      { value: "gpt-5.6-luna", label: "⚡ GPT-5.6 Luna (이전 세대 · 가성비)" },
    ],
  },
  {
    provider: "anthropic",
    label: "Claude",
    sub: "Anthropic",
    icon: "🧠",
    models: [
      { value: "claude-fable-5-2", label: "💎 Claude Fable 5.2 (최신 · 최상위 품질 · 느림)" },
      { value: "claude-opus-5-5", label: "💎 Claude Opus 5.5 (최신 · 복잡한 맥락 이해)" },
      { value: "claude-sonnet-5-5", label: "🎯 Claude Sonnet 5.5 (최신 · 자연스러운 문체 · 기본 추천)", default: true },
      { value: "claude-haiku-5-5", label: "⚡ Claude Haiku 5.5 (최신 · 가성비 초고속)" },
      { value: "claude-opus-5", label: "💎 Claude Opus 5 (이전 세대 · 고급형)" },
      { value: "claude-sonnet-5", label: "🎯 Claude Sonnet 5 (이전 세대 · 자연스러운 문체)" },
    ],
  },
  {
    provider: "gemini",
    label: "Gemini",
    sub: "Google",
    icon: "✨",
    models: [
      { value: "gemini-4-carbon", label: "💎 Gemini 4 Carbon (최신 · 가장 어려운 장문·분석)" },
      { value: "gemini-4-neon", label: "🎯 Gemini 4 Neon (최신 · 깊이와 효율 균형)" },
      { value: "gemini-4-argon", label: "🚀 Gemini 4 Argon (최신 · 빠른 추론형 분석)" },
      { value: "gemini-4-hydrogen", label: "⚡ Gemini 4 Hydrogen (최신 · 빠른 일상 작업)" },
      { value: "gemini-3.8-flash", label: "🚀 Gemini 3.8 Flash (속도와 품질 균형 · 기본 추천)", default: true },
      { value: "gemini-3.6-flash", label: "⚡ Gemini 3.6 Flash (이전 세대 · 균형형)" },
      { value: "gemini-3.5-flash-lite", label: "⚡ Gemini 3.5 Flash Lite (가장 빠르고 저렴)" },
      { value: "gemini-3.1-pro-preview", label: "💎 Gemini 3.1 Pro 미리보기 (분석형 장문)" },
    ],
  },
];

export const DEFAULT_ENGINE = { provider: "openai" as EngineProvider, model: "gpt-6.1-terra" };

/** 그 플랫폼을 고를 때 처음 선택할 모델(default 표시, 없으면 첫 항목) */
export function defaultModelOf(engine: EngineInfo): string {
  return (engine.models.find((m) => m.default) ?? engine.models[0]).value;
}

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
  openai: "gpt-image-2.5-flare",
  flux: "black-forest-labs/flux-2-dev",
  zimage: "prunaai/z-image-turbo",
};

export const MAX_GENERATE_COUNT = 5;

// 2026-11-03 종료 모델 정리(docs/AI_MODEL_CATALOG.md 4절): gpt-image-1(10-23 종료)·gpt-image-1-mini·gpt-image-1.5·chatgpt-image-latest(12-01 종료) 삭제,
// 예전에 저장된 값은 gpt-image-2.5-flare로 바꿔 찾는다.
const RETIRED_OPENAI_IMAGE: Record<string, string> = { "gpt-image-1": "gpt-image-2.5-flare", "gpt-image-1-mini": "gpt-image-2.5-flare", "gpt-image-1.5": "gpt-image-2.5-flare", "chatgpt-image-latest": "gpt-image-2.5-flare" };
export function findImageModel(value: string) {
  const model = IMAGE_MODELS.find((item) => item.value === (RETIRED_OPENAI_IMAGE[value] ?? value));
  if (!model) return undefined;
  const platform = IMAGE_PLATFORMS.find((item) => item.id === model.platform)!;
  return { ...model, keyProvider: platform.keyProvider };
}

export function isKnownRatio(value: string): value is ImageRatio {
  return IMAGE_RATIOS.some((item) => item.value === value);
}
