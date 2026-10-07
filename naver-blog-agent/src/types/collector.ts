export interface BlogViralCandidate {
  id: string;
  method: "http" | "perplexity" | "shorts";
  source_input: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  angle?: string;
  status: "ready" | "used" | "archived";
  created_at: string;
}

export interface CollectorCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export const DEFAULT_COLLECTOR_CATEGORIES: CollectorCategory[] = [
  { id: "cat-life", name: "생활/살림꿀팁", slug: "life-tips", sort_order: 1 },
  { id: "cat-living", name: "자취/원룸생활", slug: "single-living", sort_order: 2 },
  { id: "cat-tech", name: "IT/테크리뷰", slug: "tech-review", sort_order: 3 },
  { id: "cat-finance", name: "재테크/정부지원금", slug: "finance-subsidy", sort_order: 4 },
  { id: "cat-travel", name: "국내여행/맛집", slug: "travel-food", sort_order: 5 },
  { id: "cat-shopping", name: "쇼핑/가성비추천", slug: "shopping-deals", sort_order: 6 },
];

export type ShortsOrder = "relevance" | "viewCount" | "date";
export type ShortsGrade = "초대박" | "대박" | "떡상" | "양호" | "보통" | "판정불가";

export interface ShortVideo {
  id: string;
  title: string;
  channelName: string;
  thumbnail: string;
  publishedAt: string;
  durationSec: number;
  views: number;
  likes: number;
  comments: number;
  subs: number | null;
  vsRatio: number | null;
  viewsPerDay: number;
  outlier: number;
  engRate: number;
  viralScore: number;
  grade: ShortsGrade;
}

export const INITIAL_SAMPLE_CANDIDATES: BlogViralCandidate[] = [
  {
    id: "sample-viral-1",
    method: "perplexity",
    source_input: "2026 청년 복지 지원금 혜택",
    title: "2026년 청년 도약 계좌 & 월세 지원금 총정리 (신청 자격·지급일 팩트체크)",
    content: "최근 청년층 사이에서 가장 검색량이 급증한 정부 복지 지원금 정책. 소득 기준 완화로 추가 신청 가능한 대상자와 온라인 원클릭 신청 방법을 꼼꼼히 정리해 정보성 블로그 글로 풀기 최적의 글감입니다.",
    category: "생활/살림꿀팁",
    keywords: ["청년도약계좌", "청년월세지원", "정부지원금", "복지혜택2026"],
    angle: "놓치면 평생 후회하는 2030 정부 지원금 현실 신청 가이드",
    status: "ready",
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "sample-viral-2",
    method: "http",
    source_input: "https://news.naver.com/section/105",
    title: "다이소 3,000원짜리 자취 살림 꿀템 TOP 4 (살림 9단 실사용 비교)",
    content: "SNS 및 커뮤니티에서 '품절 대란'으로 입소문 난 가성비 다이소 주방·욕실 정리 용품. 비싼 브랜드 제품과의 내구성 비교 및 실생활 활용 노하우를 중심으로 다루어 긴 체류시간을 확보할 수 있는 소재입니다.",
    category: "자취/원룸생활",
    keywords: ["다이소추천템", "자취생필수템", "살림꿀팁", "가성비살림"],
    angle: "비싼 살림템 살 필요 없이 3천 원으로 삶의 질 2배 올리는 꿀템 썰",
    status: "ready",
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "sample-viral-3",
    method: "shorts",
    source_input: "https://www.youtube.com/shorts/sample-cleaning",
    title: "수건 쉰내·세탁조 찌든 때 한 방에 없애는 살림 비법 (조회수 50만 검증)",
    content: "식초와 과탄산소다의 잘못된 사용법을 바로잡고, 전문 청소업체에서 비밀로 유지하던 세탁조 불림 청소 루틴. 주부 및 자취생 타깃의 공감 댓글 유도에 강력한 떡상 글감입니다.",
    category: "생활/살림꿀팁",
    keywords: ["수건쉰내제거", "세탁조청소", "과탄산소다활용법", "살림노하우"],
    angle: "워싱소다 백식초 다 써보고 실패했던 사람이 정착한 세탁조 꿀팁",
    status: "ready",
    created_at: new Date(Date.now() - 14400000).toISOString(),
  },
];
