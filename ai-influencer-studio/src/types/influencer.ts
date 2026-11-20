export interface InfluencerConfig {
  gender: string;
  ethnicity: string;
  age: string;
  /** 이미지 모델 등급(2026-11-20, src/lib/imageModels.ts): "top" | "balanced" | "value". 없으면 최고 품질 */
  imageModel?: string;
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
  /** 캡션을 AI가 만들지 못해 기본 문구를 넣었거나 캡션을 만들지 못했을 때의 사유(2026-11-20, R2 3단계). 없으면 화면은 예전과 같다 */
  captionNotice?: string | null;
  /** 방금 생성한 결과의 원본 저장 안내(W01v). 생성 응답에 저장 결과가 실렸을 때만 있다 — 없으면 화면은 예전과 같다 */
  assetNotice?: import("@/lib/assets/saveNotice").AssetSaveNotice | null;
  /** 자산 번호 흐름(W01-UII, 서버 모드가 on일 때만): 방금 결과의 자산 번호. 화면 메모리에만 있다(저장하지 않는다) */
  assetId?: string | null;
  /** 원본은 저장됐지만 화면에 사본이 없다 — [다시 불러오기] 버튼을 보여 준다 */
  needsReload?: boolean;
  reloadMessage?: string | null;
  /** 내려받을 때 쓸 확장자(메모리 사본의 실제 형식). 없으면 예전처럼 png */
  fileExt?: "png" | "jpg" | "webp";
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  imageUrl: string;
  captions: string[];
  config: InfluencerConfig;
  summary: string;
}
