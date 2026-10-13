export type Kind =
  | "generate" | "edit" | "synthesis" | "bgremove" | "inpaint" | "idphoto" | "floorplan"
  | "lifealbum" | "comic" | "story" | "recipe";
export type Aspect = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
export type AspectOrOriginal = Aspect | "original";
export type ModelLevel = "flash" | "pro";
export type ComicStyle = "noir" | "webtoon" | "american";
export type ComicLang = "ko" | "en";
export type Upscale = 0 | 2 | 4;

export const KINDS: Kind[] = ["generate", "edit", "synthesis", "bgremove", "inpaint", "idphoto", "floorplan", "lifealbum", "comic", "story", "recipe"];
export const ASPECTS: Aspect[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

export const KIND_LABEL: Record<Kind, string> = {
  generate: "이미지 생성", edit: "이미지 편집", synthesis: "이미지 합성", bgremove: "배경 제거", inpaint: "부분 삭제",
  idphoto: "증명사진 변환", floorplan: "평면도 3D 변환", lifealbum: "인생 앨범", comic: "만화 패널", story: "연속 스토리", recipe: "이미지 레시피",
};

/** 사용자 입력 파라미터(서버가 정리한 뒤 쓴다). 이미지는 Storage 경로로만 전달한다. */
export interface RunParams {
  kind: Kind;
  model: ModelLevel;
  base?: string;
  sources?: string[];
  mask?: string;
  prompt?: string;
  aspect?: AspectOrOriginal;
  processes?: string[];
  style?: string;
  upscale?: Upscale;
  category?: string;
  age?: number;
  comicStyle?: ComicStyle;
  comicLang?: ComicLang;
  comicText?: string;
}

export interface OutputItem { path: string; mime: string; w: number; h: number; text?: string }

export const MAX_SOURCES = 5;
export const MAX_HISTORY = 30;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const TEMP_TTL_MS = 60 * 60 * 1000;
export const BUCKET = "banana-canvas-files";
