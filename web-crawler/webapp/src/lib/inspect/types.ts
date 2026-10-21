// 「한 페이지 분석」 데이터 타입 — 2026-10-21 병합 A로 Website Scraper(ghost-scraper/src/lib/types.ts)에서 옮김(설정 타입은 키를 브라우저에 두던 구조라 뺌)

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
