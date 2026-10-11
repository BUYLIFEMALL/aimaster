export type ArtStyle =
  | "modern_korean_webtoon"
  | "shonen_manga"
  | "romance_fantasy"
  | "chibi_sd_casual"
  | "american_hero_comic";

export type LayoutType = "webtoon_vertical" | "comic_grid";

export type BalloonStyle = "round_smooth" | "classic_rect" | "action_spike";

export interface CharacterInfo {
  id: string;
  name: string;
  description: string;
  referenceImageUrl?: string;
  characterSheetUrl?: string;
}

export interface CutScene {
  cutIndex: number;
  cameraAngle: string;
  characterNames: string[];
  description: string;
  dialogue: string;
  prompt: string;
  imageUrl?: string;
  isGenerating?: boolean;
  error?: string;
}

export interface WebtoonProject {
  id: string;
  title: string;
  author: string;
  synopsis: string;
  artStyle: ArtStyle;
  layout: LayoutType;
  balloonStyle: BalloonStyle;
  includeCover: boolean;
  characters: CharacterInfo[];
  chapterCount: number;
  cutCount: number;
  storyPrompt: string;
  scriptText: string;
  coverImageUrl?: string;
  isCoverGenerating?: boolean;
  cuts: CutScene[];
  updatedAt: string;
}

export interface AppSettings {
  geminiApiKey: string;
  textModel: "gemini-2.5-flash" | "gemini-2.5-flash-lite";
  imageModel: "nano-banana-2" | "pollinations-flux";
}
