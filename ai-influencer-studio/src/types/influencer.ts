export interface InfluencerConfig {
  gender: string;
  ethnicity: string;
  age: string;
  hairStyle: string;
  faceStyle: string;
  expression: string;
  pose: string;
  outfit: string;
  location: string;
  lighting: string;
  camera: string;
  filmStock: string;
  skin: string[];
  aspectRatio: string;
  quality: string;
  storyContext?: string;
  /** v1.21 하루 일과 장면 표시(어느 일과의 몇 번째 장면인지) — 「🗓 하루 일과 자동 예약」이 히스토리 컷을 묶는 데 쓴다 */
  routine?: { planId: string; label: string; order: number };

  // 광고 모드
  isAdMode?: boolean;
  adType?: string;
  productName?: string;
  productImages?: string[]; // Base64 data URLs

  // 레퍼런스 이미지
  personImage?: string; // Base64
  placeImage?: string; // Base64

  // 미세 보정 루프
  lastResultImage?: string; // 직전 결과 이미지 (Base64)
  feedback?: string; // 수정 요청사항
}

export interface TimelineScenario {
  id: string;
  labelKo: string;
  labelEn: string;
  story: string;
  timeOrder: number;
  config: {
    outfit: string;
    location: string;
    expression: string;
    pose: string;
    lighting: string;
    hairStyle: string;
    faceStyle?: string;
    camera: string;
    filmStock: string;
    skin: string[];
  };
}

export interface GenerationResult {
  imageUrl: string | null;
  captions: string[];
  loading: boolean;
  error: string | null;
  finalPrompt?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  imageUrl: string;
  captions: string[];
  config: InfluencerConfig;
  summary: string;
}
