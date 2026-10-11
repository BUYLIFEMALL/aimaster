export interface SubjectSettings {
  include: boolean;
  race: string; // 한국인, 동양인, 백인, 흑인, 히스패닉, 중동인
  age: string; // 10대, 20대, 30대, 40대, 50대 이상, 어린이
  gender: string; // 여성, 남성, 중성
  description: string;
  image?: string; // Base64 reference image
}

export interface ThumbnailSettings {
  title: string;
  keywords: string;
  genre: string;
  mood: string;
  subject: SubjectSettings;
}

export interface SeoStrategy {
  strategy: string; // 예: "호기심 유발형 (High CTR)"
  title: string;
  description: string;
  tags: string;
  studioTags: string;
  pinnedComment: string;
  visualStrategy: string;
}

export interface ComprehensiveMetadata {
  description: string;
  tags: string;
  keywords: string;
  pinnedComment: string;
}

export interface StrategyResponse {
  strategies: SeoStrategy[];
  comprehensive: ComprehensiveMetadata;
}

export interface SeoAnalysisResult {
  title: string;
  keywords: string;
  genre: string;
  mood: string;
  includePerson: boolean;
  subjectDescription: string;
}

export const GENRE_OPTIONS = [
  "일상/브이로그",
  "게임",
  "테크/IT",
  "교육/강의",
  "요리/레시피",
  "음악/커버",
  "여행",
  "뷰티/패션",
  "경제/재테크",
  "ASMR",
] as const;

export const MOOD_OPTIONS = [
  "선명한",
  "어두운",
  "미니멀",
  "시네마틱",
  "네온",
  "레트로",
  "깔끔한",
  "드라마틱",
  "활기찬",
  "전문적인",
] as const;

export const RACE_OPTIONS = [
  "한국인",
  "동양인",
  "백인",
  "흑인",
  "히스패닉",
  "중동인",
] as const;

export const AGE_OPTIONS = [
  "10대",
  "20대",
  "30대",
  "40대",
  "50대 이상",
  "어린이",
] as const;

export const GENDER_OPTIONS = [
  "여성",
  "남성",
  "중성",
] as const;
