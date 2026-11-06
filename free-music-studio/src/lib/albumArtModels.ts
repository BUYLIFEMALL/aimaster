// 앨범 그림 플랫폼·모델(2026-11-05 주인님 「Gemini 나노바나나 / Replicate / GPT Image 에서 사용자가 선택할수 있도록」,
// 2026-11-06 「실행 가능한 다른 모델도 추가해줘」).
// 모델 이름·요청 칸은 이미지 자동화 기준 프로그램(ai-image-studio lib/providers/registry.ts·nanoBananaModels.ts, 2026-11-06)에서 가져왔다.
// 넣지 않은 것: Ideogram(글자 그리기 전문 — 앨범 그림은 글자 없이 그림), xAI Grok(Replicate가 아닌 별도 키), 4K 판(앨범 그림은 1K 정사각형).
// 화면과 서버가 같은 목록을 쓰고, 서버는 이 목록에 있는 값만 받는다.
// Replicate 모델은 모델마다 받는 칸이 달라 `input`에 그 모델의 정사각형·형식 칸을 적는다(기준 프로그램 정의 그대로).

export type ArtModel = { id: string; label: string; input?: Readonly<Record<string, string>> };

const SQUARE_PNG = { aspect_ratio: "1:1", output_format: "png" } as const;

export const ART_PROVIDERS = [
  {
    id: "gemini",
    label: "Gemini 나노바나나",
    keyName: "Gemini",
    models: [
      { id: "nanobanana-2-2k", label: "균형(추천) · Nano Banana 2.1 (1K 정사각형)" },
      { id: "nanobanana-pro", label: "정밀 · Nano Banana Pro (Gemini 3 Pro Image)" },
      { id: "nanobanana", label: "빠름·저렴 · Nano Banana Lite (Gemini 3.1 Flash Lite Image)" },
    ] as readonly ArtModel[],
    defaultModel: "nanobanana-2-2k",
  },
  {
    id: "openai",
    label: "GPT Image",
    keyName: "OpenAI",
    models: [
      { id: "gpt-image-2.5-flare", label: "균형(추천) · GPT Image 2.5 Flare" },
      { id: "gpt-image-2.5-sunburst", label: "최고 품질 · GPT Image 2.5 Sunburst" },
      { id: "gpt-image-2", label: "저렴 · GPT Image 2" },
    ] as readonly ArtModel[],
    defaultModel: "gpt-image-2.5-flare",
  },
  {
    id: "replicate",
    label: "Replicate (FLUX·Seedream 등)",
    keyName: "Replicate",
    models: [
      { id: "black-forest-labs/flux-2-dev", label: "빠름 · FLUX 2 [dev]", input: SQUARE_PNG },
      { id: "black-forest-labs/flux-2-pro", label: "고품질 · FLUX 2 [pro]", input: SQUARE_PNG },
      { id: "black-forest-labs/flux-2-flex", label: "세밀한 표현 · FLUX 2 [flex]", input: SQUARE_PNG },
      { id: "black-forest-labs/flux-2-max", label: "최고 품질 · FLUX 2 [max]", input: SQUARE_PNG },
      { id: "prunaai/z-image-turbo", label: "아주 빠름·저렴 · Z-Image Turbo", input: SQUARE_PNG },
      { id: "bytedance/seedream-5-pro", label: "고품질 · Seedream 5 Pro (2K)", input: { size: "2K", ...SQUARE_PNG } },
      { id: "bytedance/seedream-5-lite", label: "균형 · Seedream 5 Lite (2K)", input: { size: "2K", ...SQUARE_PNG } },
      { id: "bytedance/seedream-4.5", label: "안정 · Seedream 4.5 (2K)", input: { size: "2K", ...SQUARE_PNG } },
      { id: "recraft-ai/recraft-v4.1", label: "일러스트·디자인 · Recraft V4.1", input: { size: "1024x1024" } },
    ] as readonly ArtModel[],
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

/** Replicate 모델의 요청 칸(정사각형·형식) — 목록 밖이면 FLUX 기본 칸 */
export function replicateInput(model: string): Readonly<Record<string, string>> {
  return ART_PROVIDERS.find((p) => p.id === "replicate")!.models.find((m) => m.id === model)?.input ?? SQUARE_PNG;
}
