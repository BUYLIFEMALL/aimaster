// Website Scraper 데이터 타입 정의

export interface Metadata {
  title: string;
  description: string;
  charset: string;
  contentType?: string;
  statusCode?: number;
  url: string;
}

export interface HeadingItem {
  text: string;
  link?: string;
}

export interface Structure {
  h1: HeadingItem[];
  h2: HeadingItem[];
  h3?: HeadingItem[];
}

export interface Stats {
  payloadSizeKb: number;
  linksCount: number;
  imagesCount: number;
  tablesCount: number;
  listItemsCount: number;
  charset: string;
}

export interface LinkItem {
  text: string;
  href: string;
  isExternal?: boolean;
}

export interface ImageItem {
  src: string;
  alt: string;
}

export interface TableItem {
  headers: string[];
  rows: Array<Array<{ text: string; url?: string } | string>>;
}

export interface FeedListItem {
  title: string;
  text: string;
  link?: string;
  url?: string;
}

export interface AiStructuredItem {
  no: number;
  title: string;
  url: string;
  imgUrl: string;
}

export interface SelectedSector {
  tagName: string;
  className?: string;
  id?: string;
  text: string;
  html: string;
}

export interface CrawlResult {
  metadata: Metadata;
  structure: Structure;
  stats: Stats;
  links: LinkItem[];
  images: ImageItem[];
  tables: TableItem[];
  listItems: FeedListItem[];
  rawLength: number;
  cleanedHtml: string;
}

export interface AppSettings {
  geminiApiKey: string;
  geminiModel: string; // "gemini-3.8-flash" | "gemini-3.5-flash-lite"
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: "",
  geminiModel: "gemini-3.8-flash",
};

// 2026-11-03 종료된·종료되는 옛 모델(1.5 Flash, 2.5 Flash 12-01) → 대체 모델. 브라우저에 저장된 옛 설정도 새 모델로 호출한다.
const RETIRED_GEMINI_MODEL: Record<string, string> = {
  "gemini-2.5-flash": "gemini-3.8-flash",
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
  "gemini-1.5-flash": "gemini-3.8-flash",
};
export function currentGeminiModel(model: string | null | undefined): string {
  if (!model) return DEFAULT_SETTINGS.geminiModel;
  return RETIRED_GEMINI_MODEL[model] ?? model;
}
