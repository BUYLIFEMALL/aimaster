export type Kind =
  | "generate" | "edit" | "synthesis" | "bgremove" | "inpaint" | "idphoto" | "floorplan"
  | "lifealbum" | "comic" | "story" | "recipe" | "restore" | "graphic" | "expand";
export type Aspect = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
export type AspectOrOriginal = Aspect | "original";
export type ModelLevel = "flash" | "pro";
export type ComicStyle = "noir" | "webtoon" | "american";
export type ComicLang = "ko" | "en";
export type Upscale = 0 | 2 | 4;
/** 합성 배경 처리: auto=원본 배경 유무로 자동(기존 동작), keep=원본 배경 유지, change=요청에 맞게 변경 */
export type SynthBackground = "auto" | "keep" | "change";
/** 해상도(Pro 모델만 적용, 빠른 모델은 1K 고정) */
export type ImageSize = "1K" | "2K" | "4K";

export const KINDS: Kind[] = ["generate", "edit", "synthesis", "bgremove", "inpaint", "idphoto", "floorplan", "lifealbum", "comic", "story", "recipe", "restore", "graphic", "expand"];
export const ASPECTS: Aspect[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

export const KIND_LABEL: Record<Kind, string> = {
  generate: "이미지 생성", edit: "이미지 편집", synthesis: "이미지 합성", bgremove: "배경 제거", inpaint: "부분 삭제",
  idphoto: "증명사진 변환", floorplan: "평면도 3D 변환", lifealbum: "인생 앨범", comic: "만화 패널", story: "연속 스토리", recipe: "이미지 레시피", restore: "옛 사진 복원", graphic: "템플릿 그래픽", expand: "비율 확장",
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
  /** 옛 사진 복원(포토 리메이크에서 옮김, v1.12) */
  repair?: boolean;
  colorize?: boolean;
  /** 합성: 소스별 지시(순서 = sources 순서)와 배경 처리(포토 리메이크에서 옮김, v1.12) */
  sourceNotes?: string[];
  background?: SynthBackground;
  /** 템플릿 그래픽(올인원 그래픽에서 옮김, v1.13) */
  templateId?: string;
  fields?: Record<string, string>;
  preset?: string;
  languages?: string[];
  imageSize?: ImageSize;
  maintainSubject?: boolean;
}

export interface OutputItem { path: string; mime: string; w: number; h: number; text?: string }

export const MAX_SOURCES = 5;
export const MAX_HISTORY = 30;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const TEMP_TTL_MS = 60 * 60 * 1000;
export const BUCKET = "banana-canvas-files";
