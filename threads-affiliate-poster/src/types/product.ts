import type { AffiliateInputMode, AffiliatePlatform, Database } from "./database.types";

export type AffiliateProduct = Database["public"]["Tables"]["affiliate_products"]["Row"];

export type { AffiliatePlatform, AffiliateInputMode };

export const PLATFORM_LABELS: Record<AffiliatePlatform, string> = {
  coupang: "쿠팡파트너스",
  aliexpress: "알리익스프레스",
  naver: "네이버 브랜드커넥트",
};
