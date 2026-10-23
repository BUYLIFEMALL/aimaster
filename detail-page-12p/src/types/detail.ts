export type PlatformType = "coupang" | "smartstore";
export type ModelType = "nano-banana" | "nano-banana2";

export interface DetailScene {
  id: string;
  index: number;
  sectionKey: string;
  badge: string;
  title: string;
  subtitle: string;
  bodyText: string;
  keyPoints?: string[];
  imagePrompt: string;
  imageUrl?: string;
  aspectRatio: "1:1" | "3:4" | "4:5";
  accentColor?: string;
  status?: "pending" | "generating" | "completed" | "error";
}

export interface ProductInputData {
  productName: string;
  originalPrice?: number;
  salePrice?: number;
  discountRate?: number;
  platform: PlatformType;
  model: ModelType;
  description: string;
  targetAudience?: string;
  toneAndManner?: string;
  eventBannerText?: string;
  specDocContent?: string;
  productImages: string[]; // base64 or URL
}

export interface DetailPageProject {
  id: string;
  title: string;
  platform: PlatformType;
  model: ModelType;
  productData: ProductInputData;
  scenes: DetailScene[];
  createdAt: string;
  updatedAt: string;
}
