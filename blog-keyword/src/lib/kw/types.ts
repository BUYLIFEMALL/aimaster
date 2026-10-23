// AI 블로그 키워드 자동화 — 공통 타입. 모든 분석 결과는 이 구조로 DB(jsonb)에 저장되고 화면이 그대로 그린다.

export const FEATURES = [
  "autocomplete",
  "related",
  "blogs",
  "competition",
  "recommend",
  "sustainable",
  "news",
  "trend",
  "prompt",
] as const;
export type Feature = (typeof FEATURES)[number];

export function isFeature(v: unknown): v is Feature {
  return typeof v === "string" && (FEATURES as readonly string[]).includes(v);
}

/** 메뉴에 보여 줄 기능 정보. needsKeyword=false면 입력 없이 실행한다. */
export interface FeatureInfo {
  id: Feature;
  title: string;
  desc: string;
  needsKeyword: boolean;
  needsNaver: boolean;
  placeholder?: string;
}

export const FEATURE_INFO: FeatureInfo[] = [
  { id: "autocomplete", title: "자동완성 키워드", desc: "검색창 자동완성으로 롱테일 키워드 20개와 글 주제를 만듭니다.", needsKeyword: true, needsNaver: false, placeholder: "예: 캠핑 의자" },
  { id: "related", title: "AI 연관검색어", desc: "연관검색어·사람들이 묻는 질문·콘텐츠 갭과 공략 전략을 분석합니다.", needsKeyword: true, needsNaver: false, placeholder: "예: 전기차 보조금" },
  { id: "blogs", title: "상위 블로그 분석", desc: "네이버 상위 10개 글의 구조·공통 키워드를 분석하고 1위 공략법을 제안합니다.", needsKeyword: true, needsNaver: true, placeholder: "예: 제주 3박4일 여행" },
  { id: "competition", title: "키워드 경쟁력", desc: "기회 점수·경쟁 난이도와 확장 키워드를 분석합니다(실측 문서 수·검색수 포함).", needsKeyword: true, needsNaver: false, placeholder: "예: 홈카페 레시피" },
  { id: "recommend", title: "오늘의 전략 키워드", desc: "오늘 기준 정책·제도 5개와 이슈 5개 키워드를 제목·공략법과 함께 제안합니다.", needsKeyword: false, needsNaver: false },
  { id: "sustainable", title: "다각도 주제 발굴", desc: "한 키워드를 4가지 관점 40개 글감으로 넓혀 오래 쓰는 콘텐츠를 설계합니다.", needsKeyword: true, needsNaver: false, placeholder: "예: 연말정산" },
  { id: "news", title: "실시간 뉴스 전략", desc: "네이버 최신 뉴스 10건에서 핵심 이슈와 블로그 글 기회를 찾습니다.", needsKeyword: true, needsNaver: true, placeholder: "예: 금리 인하" },
  { id: "trend", title: "카테고리 트렌드", desc: "분야별 최신 블로그 제목의 빈출어와 실제 검색 추이로 뜨는 키워드를 찾습니다.", needsKeyword: true, needsNaver: true, placeholder: "분야를 고르거나 직접 입력" },
  { id: "prompt", title: "프롬프트 라이브러리", desc: "검증된 키워드 전략 프롬프트 50개를 키워드에 맞춰 바로 실행합니다.", needsKeyword: true, needsNaver: false, placeholder: "키워드를 입력하세요" },
];

// ---- 공통 조각 ----
export interface Suggestion { title: string; thumbnailCopy: string; strategy: string }

export interface Real {
  /** 네이버 검색광고 키워드도구: 월간 검색수(실측에 가까운 값) */
  monthlyPc?: number;
  monthlyMobile?: number;
  monthlyTotal?: number;
  compIdx?: string | null;
  /** 네이버 블로그 검색 총 문서 수 */
  blogDocTotal?: number;
  /** 데이터랩 최근 12개월 상대 지수(0~100) */
  trend?: { period: string; ratio: number }[];
  notes?: string[];
}

// ---- 기능별 결과 ----
export interface AutocompleteResult {
  kind: "autocomplete";
  engine: "naver" | "google";
  keyword: string;
  keywords: { text: string; monthlyTotal?: number; compIdx?: string | null }[];
  topics?: { mode: "main" | "all"; items: Suggestion[] } | null;
}

export interface RelatedResult {
  kind: "related";
  keyword: string;
  relatedSearches: { keyword: string; reason: string }[];
  peopleAlsoAsk: { question: string; answer: string; gap: string }[];
  contentGap: string;
  strategy: {
    userIntent: string;
    pillarPost: { title: string; outline: string[] };
    suggestions: Suggestion[];
  } | null;
  sources: { title: string; uri: string }[];
}

export interface BlogPost { title: string; link: string; description: string; blogger: string; postdate: string }

export interface BlogsResult {
  kind: "blogs";
  keyword: string;
  posts: BlogPost[];
  analysis: { structure: string; characteristics: string; commonKeywords: string[] };
  suggestions: Suggestion[];
  real: Real;
}

export interface CompetitionResult {
  kind: "competition";
  keyword: string;
  opportunityScore: number;
  searchInterestIndex: number;
  competitionIndex: number;
  competitionLevel: string;
  documentCount: string;
  analysis: { title: string; reason: string; opportunity: string; threat: string; consumption: string; conclusion: string };
  strategy: { expandedKeywords: string[]; blogTopics: Suggestion[] } | null;
  real: Real;
  sources: { title: string; uri: string }[];
}

export interface RecommendResult {
  kind: "recommend";
  date: string;
  items: { keyword: string; category: string; reason: string; title: string; thumbnailCopy: string; strategy: string }[];
  sources: { title: string; uri: string }[];
}

export interface SustainableResult {
  kind: "sustainable";
  keyword: string;
  categories: {
    name: string;
    description: string;
    topics: { title: string; keywords: string[]; seoStrategy: string }[];
  }[];
}

export interface NewsItem { title: string; link: string; description: string; pubDate: string }

export interface NewsResult {
  kind: "news";
  keyword: string;
  items: NewsItem[];
  analysis: { coreIssue: string; userInterestPoint: string; opportunity: string };
  suggestions: Suggestion[];
}

export interface TrendResult {
  kind: "trend";
  keyword: string;
  posts: BlogPost[];
  frequent: { word: string; count: number; trendDelta?: number | null }[];
  trendSeries: { word: string; data: { period: string; ratio: number }[] }[];
  keywordBased: Suggestion[];
  analysisBased: Suggestion[];
  summary: string;
  real: Real;
}

export interface PromptResult {
  kind: "prompt";
  keyword: string;
  promptId: string;
  promptTitle: string;
  markdown: string;
  sources: { title: string; uri: string }[];
}

export type AnalysisResult =
  | AutocompleteResult
  | RelatedResult
  | BlogsResult
  | CompetitionResult
  | RecommendResult
  | SustainableResult
  | NewsResult
  | TrendResult
  | PromptResult;

export interface ReportSummary {
  id: string;
  feature: Feature;
  keyword: string;
  favorite: boolean;
  created_at: string;
}
