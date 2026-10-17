// v1.10: SourcingCalculator에서 분리 — 채널별 검색(서버 액션 호출)과 결과를 공통 형식으로 바꾸는 부분.
import {
  findSourcingCandidatesAction,
  findDomeggookCandidatesAction,
  findElevenstCandidatesAction,
} from "@/lib/actions/sourcing";
import type { Platform, PlatformResult } from "@/lib/sourcingResults";

async function fetchAliexpress(keyword: string): Promise<PlatformResult> {
  const formData = new FormData();
  formData.set("keyword", keyword);
  const result = await findSourcingCandidatesAction(formData);
  if (result.error) return { products: [], error: result.error };
  return {
    products: (result.products ?? []).map((p) => ({
      key: p.productId,
      platform: "aliexpress" as const,
      title: p.title,
      imageUrl: p.imageUrl,
      priceKrw: p.salePriceKrw,
      metaText: [
        p.volume != null ? `판매량 ${p.volume.toLocaleString()}` : null,
        p.evaluateRate ? `평점 ${p.evaluateRate}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      detailUrl: p.detailUrl,
    })),
    translatedKeyword: result.translatedKeyword,
    warning: result.warning,
  };
}

async function fetchDomeggook(keyword: string): Promise<PlatformResult> {
  const formData = new FormData();
  formData.set("keyword", keyword);
  const result = await findDomeggookCandidatesAction(formData);
  if (result.error) return { products: [], error: result.error };
  return {
    products: (result.products ?? []).map((p) => ({
      key: p.itemNo,
      platform: "domeggook" as const,
      title: p.title,
      imageUrl: p.thumbUrl,
      priceKrw: p.priceKrw,
      metaText: [
        p.minOrderQty != null ? `최소구매수량 ${p.minOrderQty.toLocaleString()}개` : null,
        p.sellerId ? `판매자 ${p.sellerId}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      detailUrl: p.detailUrl,
    })),
  };
}

async function fetchElevenst(keyword: string): Promise<PlatformResult> {
  const formData = new FormData();
  formData.set("keyword", keyword);
  const result = await findElevenstCandidatesAction(formData);
  if (result.error) return { products: [], error: result.error };
  return {
    products: (result.products ?? []).map((p) => ({
      key: p.productCode,
      platform: "elevenst" as const,
      title: p.title,
      imageUrl: p.imageUrl,
      priceKrw: p.salePriceKrw ?? p.priceKrw,
      metaText: p.seller ? `판매자 ${p.seller}` : "",
      detailUrl: p.detailUrl,
    })),
  };
}

export const FETCHERS: Record<Platform, (keyword: string) => Promise<PlatformResult>> = {
  aliexpress: fetchAliexpress,
  domeggook: fetchDomeggook,
  elevenst: fetchElevenst,
};
