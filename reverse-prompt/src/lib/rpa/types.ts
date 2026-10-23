export type MediaType = "image" | "video" | "audio";
export type Lang = "ko" | "en";
export type ModelLevel = "flash" | "pro";
export type PromptLength = "short" | "standard" | "detailed";

export interface Options {
  lang: Lang;
  model: ModelLevel;
  target: string;
  length: PromptLength;
  memo: string;
}

/** 모델이 돌려준 분석 JSON(정규화 후). 종류마다 키가 다르므로 느슨하게 둔다. */
export type Analysis = Record<string, unknown>;

export interface TargetInfo { id: string; label: string; note: string }

export const TARGETS: Record<MediaType, TargetInfo[]> = {
  image: [
    { id: "midjourney", label: "Midjourney", note: "파라미터(--ar, --stylize 등)까지 포함한 명령어" },
    { id: "gpt-image", label: "DALL·E / GPT Image", note: "자연어 문장형 프롬프트" },
    { id: "flux", label: "Flux / Stable Diffusion", note: "쉼표로 이어 쓰는 태그형 프롬프트" },
  ],
  video: [
    { id: "sora", label: "Sora", note: "장면을 서술하는 영어 문단" },
    { id: "veo", label: "Veo", note: "카메라·오디오까지 적는 영어 문단" },
    { id: "runway", label: "Runway", note: "짧고 명확한 모션 중심 문장" },
    { id: "kling", label: "Kling", note: "피사체 동작과 카메라 중심 문장" },
  ],
  audio: [
    { id: "suno", label: "Suno", note: "장르·분위기·악기를 담은 스타일 프롬프트" },
    { id: "udio", label: "Udio", note: "장르 태그와 분위기 설명" },
  ],
};

export const MEDIA_LABEL: Record<MediaType, string> = { image: "이미지", video: "동영상", audio: "오디오" };

export const DEFAULT_OPTIONS: Options = { lang: "ko", model: "flash", target: "", length: "standard", memo: "" };

export function defaultTarget(media: MediaType): string {
  return TARGETS[media][0].id;
}
