export type ThemeKey =
  | "warm"
  | "white"
  | "sepia"
  | "linen"
  | "paperback"
  | "sand"
  | "rose"
  | "lavender"
  | "coral"
  | "crisp"
  | "amberLinen"
  | "slateWhite"
  | "navy"
  | "forest"
  | "mocha"
  | "blueprint"
  | "charcoal"
  | "carbon"
  | "indigo"
  | "cyanNight"
  | "ink";

export type FontKey = "notoSans" | "notoSerif" | "ridi" | "maru" | "paperlogy";
export type SkinKey = "classic" | "studio";

export interface ThemeDef {
  label: string;
  bg: string;
  paper: string;
  fg: string;
  muted: string;
  line: string;
  accent: string;
}

export interface FontDef {
  label: string;
  note: string;
  stack: string;
  family: string;
}

export interface Chapter {
  id: string;
  title: string;
  subtitle?: string;
  summary: string;
  content: string; // Markdown
  takeaways?: string[];
  questions?: string[];
}

export interface BookStyleSettings {
  theme: ThemeKey;
  font: FontKey;
  skin: SkinKey;
  leading: number; // 1.15 ~ 2.10
  size: number; // 14 ~ 22px
}

export interface DesignPreset {
  label: string;
  note: string;
  style: BookStyleSettings;
}

export interface CoverTemplate {
  id: string;
  label: string;
  note: string;
  body: string;
}

export interface SourceItem {
  id: string;
  name: string;
  type: "file" | "url" | "paste";
  charCount: number;
  content: string;
  url?: string;
}

export interface OutlineItem {
  id: string;
  sourceId?: string;
  title: string;
  originalTitle: string;
  rawContent: string;
  charCount: number;
}

export interface EbookProject {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  coverImage?: string | null;
  chapters: Chapter[];
  style: BookStyleSettings;
  rawSourceText?: string;
  sources?: SourceItem[];
  outline?: OutlineItem[];
  writingMode?: WritingMode;
  createdAt: string;
  updatedAt: string;
}

export type WritingMode = "detailed" | "concise" | "verbatim";

export interface GenerateOutlineRequest {
  sourceText: string;
  title?: string;
  subtitle?: string;
  author?: string;
  mode: WritingMode;
  apiKey?: string;
  model?: string;
}

export interface OutlineResult {
  title: string;
  subtitle: string;
  author: string;
  suggestedTitles: string[];
  suggestedSubtitles: string[];
  chapters: {
    title: string;
    summary: string;
    keyPoints: string[];
  }[];
}
