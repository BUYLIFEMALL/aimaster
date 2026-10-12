import type {
  CompositionId,
  DisplayStyleId,
  FontId,
  MoodId,
  PageCount,
  PlacementId,
  RatioId,
  ThemeColorId,
  ToneId,
  VisualStyleId,
} from "./presets";

export interface TextStyle {
  /** 1080px 기준 글자 크기 */
  size: number;
  weight: number;
  /** 좌우·상하 미세 조정(px) */
  dx: number;
  dy: number;
  color: string;
}

/** 카드 위쪽에 얹는 선 아이콘의 표시 여부·크기(1080px 기준)·위치 조정 */
export interface IconStyle {
  show: boolean;
  size: number;
  dx: number;
  dy: number;
}

export interface CardStyle {
  mood: MoodId;
  visualStyle: VisualStyleId;
  composition: CompositionId;
  themeColor: ThemeColorId;
  placement: PlacementId;
  displayStyle: DisplayStyleId;
  /** 배경 위에 깔아 글자를 읽기 좋게 하는 어두운(또는 밝은) 막의 진하기 0~90 */
  bgOpacity: number;
  font: FontId;
  headline: TextStyle;
  sub: TextStyle;
  /** 이전 버전 데이터에는 없을 수 있다 */
  icon?: IconStyle;
}

export interface CardPage {
  id: string;
  headline: string;
  sub: string;
  /** 헤드라인 위에 그리는 아이콘 id(iconData.ts) */
  icon?: string;
  /** 현재 선택된 배경 이미지 */
  imageUrl?: string;
  /** 생성 이력(최대 6개) */
  imageUrls?: string[];
}

export interface CardPlan {
  category: string;
  topic: string;
  tone: ToneId;
  pageCount: PageCount;
  ratio: RatioId;
}

export interface EngineChoice {
  provider: "gemini" | "openai" | "anthropic";
  model: string;
}

export interface ProjectData {
  title: string;
  plan: CardPlan;
  style: CardStyle;
  pages: CardPage[];
  /** 문구·주제 추천에 쓰는 글쓰기 AI */
  engine: EngineChoice;
  /** 배경 이미지 모델(imageModels.ts) */
  imageModel: string;
  /** 인스타그램 피드 캡션 및 해시태그 */
  caption?: {
    headlineHook: string;
    body: string;
    cta: string;
    hashtags: string[];
    fullCaption: string;
  };
}

export interface ProjectSummary {
  id: string;
  title: string;
  updatedAt: string;
  pageCount: number;
  thumbnailUrl: string | null;
  category: string;
  topic: string;
}
