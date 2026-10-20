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

/** 카드 레이아웃(v1.17): 배경형(기존) · 번호 목록 · A vs B 비교 · 큰 숫자 */
export type CardLayout = "background" | "list" | "vs" | "number";

/** 번호 목록 항목(2~4개) 또는 A vs B의 두 칸(정확히 2개) */
export interface CardPoint {
  title: string;
  desc: string;
}

export interface CardPage {
  id: string;
  headline: string;
  sub: string;
  /** 없으면 배경형(기존 데이터 호환) */
  layout?: CardLayout;
  points?: CardPoint[];
  /** 큰 숫자 레이아웃: 강조할 숫자(예: "84점", "3개월")와 그 설명 */
  number?: { value: string; label: string };
  /** 헤드라인 위에 그리는 아이콘 id(iconData.ts) */
  icon?: string;
  /** 현재 선택된 배경 이미지 */
  imageUrl?: string;
  /** 생성 이력(최대 6개) */
  imageUrls?: string[];
}

/** 그리기에 필요한 카드 내용(미리보기·PNG 저장 공용) */
export type CardContent = Pick<CardPage, "headline" | "sub" | "icon" | "layout" | "points" | "number">;

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

/** 떡상 리메이크 7대 관점(remakePrompts.ts VIRAL_ANGLES) */
export type AngleId = "warning" | "cheat" | "easy" | "vs" | "story" | "target" | "calc";

export interface RemakeAngle {
  id: AngleId;
  /** 1장 후킹 카피 */
  hook: string;
  /** 이 관점을 고른 이유 */
  reason: string;
  /** 전개 방향 */
  approach: string;
  /** 장별 줄거리 */
  storyline: string[];
}

/** 떡상 레퍼런스 분석 결과(v1.16) */
export interface RemakeAnalysis {
  summary: string;
  keyFacts: string[];
  trigger: string;
  viralReason: string;
  weakness: string;
  strategy: string;
  /** 원본에 들어 있는 목록 항목 수(정보 누락 없이 담기 위한 장수 계산용) */
  itemCount: number;
  recommendedPages: number;
  suggestedTopic: string;
  angles: RemakeAngle[];
}

export interface RemakeState {
  sourceText: string;
  sourceUrl: string;
  analysis?: RemakeAnalysis;
  angleId?: AngleId;
}

export interface ProjectData {
  title: string;
  /** 시작 방식: 주제로 시작(기본) / 떡상 리메이크(v1.16) */
  startMode?: "topic" | "remake";
  remake?: RemakeState;
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
