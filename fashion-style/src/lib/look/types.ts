export type Lang = "ko" | "en";
export type ModelLevel = "standard" | "pro";
export type EditMode = "add" | "replace";
export type BackgroundMode = "keep" | "match";
export type SuggestionKind = "outfit" | "accessory";
export type BeautyType = "makeup" | "hair";

export interface ImageState {
  data: string; // base64(접두어 없음)
  mimeType: string;
}

export interface ClothingItem {
  id: string;
  name: string;
  src: string; // data: URL, 'loading' 또는 'error'
  category: "outfit" | "accessory" | "mine";
  source: "ai" | "user";
  prompt?: string; // AI 아이템이면 재생성에 쓴 프롬프트
  situation?: string;
}

export interface AIPiece { name: string; imagePrompt: string }
export interface AISuggestion { name: string; pieces: AIPiece[] }

export interface BeautySuggestion {
  title: string;
  description: string;
  imagePrompt: string;
  generatedImage?: string; // data URL
}
export interface BeautyAdvice { makeup: BeautySuggestion; hairstyle: BeautySuggestion }

export const ALLOWED_ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"] as const;
export type AspectRatio = (typeof ALLOWED_ASPECT_RATIOS)[number];

export interface UserSettings {
  lang: Lang;
  model: ModelLevel;
  editMode: EditMode;
  background: BackgroundMode;
  consent: boolean;
}
export const DEFAULT_SETTINGS: UserSettings = { lang: "ko", model: "standard", editMode: "add", background: "keep", consent: false };
