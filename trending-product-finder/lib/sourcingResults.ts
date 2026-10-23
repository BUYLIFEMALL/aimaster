// v1.10: SourcingCalculator에서 분리 — 채널 정의·검색결과 형식과, 검색결과 전체의 마진 계산·CSV 만들기(순수 함수).
// 화면 없이 단위 테스트할 수 있도록 상대 경로만 쓴다.
import { calcMargin, MARGIN_DEFAULTS, DOMESTIC_MARGIN_DEFAULTS } from "./margin";
import { isPromoProduct } from "./promoKeywords";

export type Platform = "aliexpress" | "domeggook" | "elevenst";

// 도매매/11번가는 국내 소싱이라 통관 절차가 없다 — 관세/부가세/해외운송비 기본값을
// 0원으로 채우는 대상 채널.
export const DOMESTIC_PLATFORMS: Platform[] = ["domeggook", "elevenst"];
export const isDomesticPlatform = (p: Platform | null | undefined) => p != null && DOMESTIC_PLATFORMS.includes(p);
export const defaultsFor = (p: Platform | null | undefined) => (isDomesticPlatform(p) ? DOMESTIC_MARGIN_DEFAULTS : MARGIN_DEFAULTS);

export interface NormalizedProduct {
  key: string;
  platform: Platform;
  title: string;
  imageUrl: string;
  priceKrw: number | null;
  metaText: string;
  detailUrl: string;
}

export interface PlatformResult {
  products: NormalizedProduct[];
  error?: string;
  translatedKeyword?: string;
  warning?: string;
}

export type PlatformResults = Record<Platform, PlatformResult | null>;
export const EMPTY_RESULTS: PlatformResults = { aliexpress: null, domeggook: null, elevenst: null };

export const PLATFORMS: { value: Platform; label: string; description: string }[] = [
  { value: "aliexpress", label: "🌏 알리익스프레스 (해외)", description: "관세·부가세·해외운송비 반영" },
  { value: "domeggook", label: "🏠 도매매 (국내)", description: "통관 절차 없음, 최소구매수량 확인 필요" },
  { value: "elevenst", label: "🏪 11번가 (국내)", description: "통관 절차 없음, 오픈마켓 실판매가 비교" },
];
export const platformLabel = (p: Platform | null | undefined) => PLATFORMS.find((x) => x.value === p)?.label;

export interface ResultMarginRow {
  platform: Platform;
  key: string;
  title: string;
  sourcePriceKrw: number;
  sellingPriceKrw: number;
  marginRatePct: number;
  contributionProfitKrw: number;
  detailUrl: string;
  isPromo: boolean;
}

/** 추천판매가 추정 배수(원가 × 2.5) — 상품 선택·CSV 모두 같은 기준 */
export const SELLING_MULTIPLIER = 2.5;

// 지금 검색한 결과물 전체를 CSV로 내려받는 용도 — 채널별 검색결과 상품 하나하나에
// 원가×2.5 기준 추정 판매가로 마진을 계산해 마진율 순으로 정렬해둔다(관심 키워드
// 일괄계산과 달리 최저가 1건이 아니라 결과 전체를 대상으로 함).
export function buildResultMarginRows(results: PlatformResults): ResultMarginRow[] {
  const rows: ResultMarginRow[] = [];
  for (const p of PLATFORMS) {
    const result = results[p.value];
    if (!result) continue;
    const defaults = defaultsFor(p.value);
    for (const prod of result.products) {
      if (prod.priceKrw == null) continue;
      const sellingPriceKrw = Math.round(prod.priceKrw * SELLING_MULTIPLIER);
      const margin = calcMargin({
        sourcePriceKrw: prod.priceKrw,
        customsDutyRate: defaults.customsDutyRate,
        vatRate: defaults.vatRate,
        shippingPerUnitKrw: defaults.shippingPerUnitKrw,
        domesticFeePerUnitKrw: defaults.domesticFeePerUnitKrw,
        platformFeeRate: defaults.platformFeeRate,
        deliveryFeeKrw: defaults.deliveryFeeKrw,
        marketingFeeKrw: defaults.marketingFeeKrw,
        sellingPriceKrw,
      });
      rows.push({
        platform: p.value,
        key: prod.key,
        title: prod.title,
        sourcePriceKrw: prod.priceKrw,
        sellingPriceKrw,
        marginRatePct: margin.marginRatePct,
        contributionProfitKrw: margin.contributionProfitKrw,
        detailUrl: prod.detailUrl,
        isPromo: isPromoProduct(prod.title),
      });
    }
  }
  return rows.sort((a, b) => b.marginRatePct - a.marginRatePct);
}

/** 프로모션 문구 + 마진율 하한을 함께 만족하는 상품의 "채널:상품키" 집합 */
export function promoMatchKeys(rows: ResultMarginRow[], minMarginPct: string): Set<string> {
  const threshold = Number(minMarginPct) || 0;
  return new Set(rows.filter((r) => r.isPromo && r.marginRatePct >= threshold).map((r) => `${r.platform}:${r.key}`));
}

/** 검색결과 마진표 → CSV 문자열(엑셀 한글 호환 BOM 포함) */
export function resultRowsToCsv(rows: ResultMarginRow[], keyword: string): string {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["키워드", "채널", "상품명", "원가(원)", "추천판매가(원)", "마진율(%)", "마진(원)", "상품링크"];
  const lines = [header.map(escape).join(",")];
  for (const r of rows) {
    lines.push(
      [keyword, platformLabel(r.platform) ?? r.platform, r.title, r.sourcePriceKrw, r.sellingPriceKrw, r.marginRatePct, r.contributionProfitKrw, r.detailUrl]
        .map(escape)
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n");
}
