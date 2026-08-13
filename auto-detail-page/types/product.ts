export type TemplateType = "coupang" | "smartstore" | "premium";

export interface Specification {
  key: string;
  value: string;
}

export interface UploadedImage {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  name: string;
}

export interface VideoInput {
  url: string;
  caption?: string;
}


export interface TrustData {
  salesCount: string;       // 누적 판매량 (예: "3만개+")
  satisfactionRate: string; // 만족도 % (예: "98.7%")
  reviewCount: string;      // 후기 수 (예: "1,247개")
  repurchaseRate: string;   // 재구매율 (예: "67%")
}

export interface PolicyInfo {
  delivery: string; // 배송 정책
  refund: string;   // 환불/교환 정책
  as: string;       // AS 안내
}

export interface ProductInputBase {
  productName: string;
  description: string;
  specifications: Specification[];
  targetAudience: string;
  keySellingPoints: string[];
  uploadedImages: UploadedImage[];
  // 전환율 최적화 공통 필드
  problemStatement: string;  // 고객이 겪는 문제
  beforeAfterData: string;   // 전/후 변화 수치
  trustData: TrustData;
  policyInfo: PolicyInfo;
}

export interface CoupangInput extends ProductInputBase {
  template: "coupang";
  originalPrice: string;
  discountRate: string;
  finalPrice: string;
  deliveryInfo: string;
  certificationBadges: string[];
  reviewHighlights: string[];
  rocketBadge: boolean;
  urgencyMessage: string; // 긴박감 문구
}

export interface SmartstoreInput extends ProductInputBase {
  template: "smartstore";
  brandStory: string;
  productOrigin: string;
  sourcingStory: string;
  hashtags: string[];
  qaItems: { question: string; answer: string }[];
  ingredientDetails: string;
  certifications: string[];
  naverPayBadge: boolean;
  usageGuide: string; // 사용 방법 가이드
}

export interface PremiumInput extends ProductInputBase {
  template: "premium";
  brandHeritage: string;
  materialsStory: string;
  limitedEditionInfo: string;
  unboxingDescription: string;
  endorsements: { name: string; quote: string; platform: string }[];
  videos: VideoInput[];
  collectionName: string;
}

export type TemplateInput = CoupangInput | SmartstoreInput | PremiumInput;

export interface GeneratedPage {
  id: string;
  html: string;
  createdAt: number;
}

export interface GenerateResponse {
  id: string;
  previewUrl: string;
}
