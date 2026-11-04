// 앨범 그림 플랫폼·모델(2026-11-05 주인님 「Gemini 나노바나나 / Replicate / GPT Image 에서 사용자가 선택할수 있도록」).
// 모델 이름은 이미지 자동화 기준 프로그램(ai-image-studio lib/providers/registry.ts·nanoBananaModels.ts, 2026-11-05)에서 가져왔다.
// 화면과 서버가 같은 목록을 쓰고, 서버는 이 목록에 있는 값만 받는다.

export const ART_PROVIDERS = [
  {
    id: "gemini",
    label: "Gemini 나노바나나",
    keyName: "Gemini",
    models: [
      { id: "nanobanana-2-2k", label: "균형(추천) · Nano Banana 2.1 (1K 정사각형)" },
      { id: "nanobanana-pro", label: "정밀 · Nano Banana Pro (Gemini 3 Pro Image)" },
    ],
    defaultModel: "nanobanana-2-2k",
  },
  {
    id: "openai",
    label: "GPT Image",
    keyName: "OpenAI",
    models: [
      { id: "gpt-image-2.5-flare", label: "균형(추천) · GPT Image 2.5 Flare" },
      { id: "gpt-image-2.5-sunburst", label: "최고 품질 · GPT Image 2.5 Sunburst" },
    ],
    defaultModel: "gpt-image-2.5-flare",
  },
  {
    id: "replicate",
    label: "Replicate (FLUX 2)",
    keyName: "Replicate",
    models: [
      { id: "black-forest-labs/flux-2-dev", label: "빠름 · FLUX 2 [dev]" },
      { id: "black-forest-labs/flux-2-pro", label: "고품질 · FLUX 2 [pro]" },
    ],
    defaultModel: "black-forest-labs/flux-2-dev",
  },
] as const;

export type ArtProvider = (typeof ART_PROVIDERS)[number]["id"];
export const DEFAULT_ART_PROVIDER: ArtProvider = "gemini";

export function toArtProvider(v: unknown): ArtProvider {
  return ART_PROVIDERS.some((p) => p.id === v) ? (v as ArtProvider) : DEFAULT_ART_PROVIDER;
}

/** 그 플랫폼 목록에 있는 모델만, 아니면 그 플랫폼 기본 모델 */
export function toArtModel(provider: ArtProvider, v: unknown): string {
  const p = ART_PROVIDERS.find((x) => x.id === provider)!;
  return p.models.some((m) => m.id === v) ? String(v) : p.defaultModel;
}
