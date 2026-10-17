// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
// 뮤직비디오 옵션 프리셋. 장르 10종·장면 수·기본 화풍은 참고 도구(Google Flow "뮤직비디오 만들기 V3")의
// 화면에서 확인한 항목을 따른다. 화풍 목록은 화면에서 5종(Cinematic·Anime·Oil Painting·Watercolor·Cyberpunk)까지만
// 확인되어 나머지 3종은 같은 성격으로 보탠 것이다.

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export const GENRES: Option[] = [
  { value: "K-Pop", label: "K-Pop" },
  { value: "발라드", label: "발라드" },
  { value: "힙합", label: "힙합" },
  { value: "R&B", label: "R&B" },
  { value: "록", label: "록" },
  { value: "재즈", label: "재즈" },
  { value: "일렉트로닉", label: "일렉트로닉" },
  { value: "로파이", label: "로파이" },
  { value: "EDM", label: "EDM" },
  { value: "컨트리", label: "컨트리" },
];

export type ArtStyleId = "cinematic" | "anime" | "oil" | "watercolor" | "cyberpunk" | "realistic" | "vintage" | "fantasy";
export const ART_STYLES: (Option<ArtStyleId> & { prompt: string })[] = [
  { value: "cinematic", label: "Cinematic", prompt: "cinematic film still, anamorphic lens, dramatic lighting, rich color grading, shallow depth of field" },
  { value: "anime", label: "Anime", prompt: "high quality Japanese anime illustration, clean line art, painterly background, soft cel shading" },
  { value: "oil", label: "Oil Painting", prompt: "expressive oil painting, visible brush strokes, rich impasto texture, warm gallery lighting" },
  { value: "watercolor", label: "Watercolor", prompt: "delicate watercolor illustration, soft color bleeds, paper texture, airy light washes" },
  { value: "cyberpunk", label: "Cyberpunk", prompt: "cyberpunk neon city aesthetic, wet streets, magenta and cyan glow, futuristic atmosphere" },
  { value: "realistic", label: "Realistic", prompt: "photorealistic, natural light, true-to-life detail, 35mm photography look" },
  { value: "vintage", label: "Vintage Film", prompt: "vintage 16mm film look, soft grain, faded warm colors, nostalgic atmosphere" },
  { value: "fantasy", label: "Fantasy", prompt: "dreamlike fantasy art, luminous magical atmosphere, painterly detail, ethereal light" },
];

export const SCENE_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type SceneCount = (typeof SCENE_COUNTS)[number];

export type VeoModelId = "veo-3.1-lite-generate-preview" | "veo-3.1-fast-generate-preview" | "veo-3.1-generate-preview";
/** 초당 요금(USD, 720p·오디오 포함, Gemini API 요금표 기준 — 바뀔 수 있어 화면에서는 "약"으로 안내) */
export const VEO_MODELS: (Option<VeoModelId> & { usdPerSecond: number; note: string })[] = [
  { value: "veo-3.1-lite-generate-preview", label: "Veo 3.1 Lite", usdPerSecond: 0.05, note: "가장 저렴 · 초안·테스트용" },
  { value: "veo-3.1-fast-generate-preview", label: "Veo 3.1 Fast", usdPerSecond: 0.1, note: "속도와 품질의 균형" },
  { value: "veo-3.1-generate-preview", label: "Veo 3.1 Standard", usdPerSecond: 0.4, note: "최고 품질 · 비용 큼" },
];

export const VIDEO_LENGTHS = [4, 6, 8] as const;
export type VideoLength = (typeof VIDEO_LENGTHS)[number];

export type AspectRatioId = "16:9" | "9:16";
export const ASPECT_RATIOS: Option<AspectRatioId>[] = [
  { value: "16:9", label: "16:9 가로" },
  { value: "9:16", label: "9:16 세로" },
];

export const TEXT_MODEL = "gemini-3.7-flash";
export const IMAGE_MODEL = "gemini-nano-banana-2.1";
