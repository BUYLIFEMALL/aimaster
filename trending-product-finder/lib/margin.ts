// 착한 마진(원가 → 최종 공헌이익) 계산기. sourcing/docs/ARCHITECTURE.md에 정리된 수식을
// 그대로 따른다(관세/부가세/운송비/플랫폼 수수료를 전부 반영).
//
// 최종 수입 단가(Landed Cost) = 알리 원가(KRW) + (관세+부가세) + 개당 운송비 + 개당 국내 입고비
// 최종 공헌이익 = 판매가 - (최종 수입 단가 + 플랫폼 수수료 + 택배비 + 마케팅비)
//
// 관세/부가세율은 품목별로 다르고 개인 신고 여부에 따라서도 달라지므로, 여기서는 사용자가
// 직접 조정 가능한 "추정치" 입력값으로 다룬다 — 정확한 세율은 관세청/세무사 확인이 필요하다는
// 점을 UI에 반드시 명시한다.

export interface MarginInput {
  sourcePriceKrw: number; // 알리익스프레스 원가(원화 환산)
  customsDutyRate: number; // 관세율 (%)
  vatRate: number; // 부가세율 (%)
  shippingPerUnitKrw: number; // 개당 해외 운송비
  domesticFeePerUnitKrw: number; // 개당 국내 입고/검수비
  platformFeeRate: number; // 판매 플랫폼 수수료율 (%)
  deliveryFeeKrw: number; // 택배비
  marketingFeeKrw: number; // 개당 마케팅비(선택)
  sellingPriceKrw: number; // 예상 판매가
}

export interface MarginResult {
  landedCostKrw: number; // 최종 수입 단가
  platformFeeKrw: number;
  totalCostKrw: number; // 판매를 위해 들어가는 총 비용
  contributionProfitKrw: number; // 최종 공헌이익
  marginRatePct: number; // 판매가 대비 마진율(%)
}

export function calcMargin(input: MarginInput): MarginResult {
  const dutyAndVat = input.sourcePriceKrw * ((input.customsDutyRate + input.vatRate) / 100);
  const landedCostKrw = Math.round(
    input.sourcePriceKrw + dutyAndVat + input.shippingPerUnitKrw + input.domesticFeePerUnitKrw,
  );

  const platformFeeKrw = Math.round(input.sellingPriceKrw * (input.platformFeeRate / 100));
  const totalCostKrw = landedCostKrw + platformFeeKrw + input.deliveryFeeKrw + input.marketingFeeKrw;

  const contributionProfitKrw = Math.round(input.sellingPriceKrw - totalCostKrw);
  const marginRatePct =
    input.sellingPriceKrw > 0 ? Math.round((contributionProfitKrw / input.sellingPriceKrw) * 1000) / 10 : 0;

  return { landedCostKrw, platformFeeKrw, totalCostKrw: Math.round(totalCostKrw), contributionProfitKrw, marginRatePct };
}

/** UI 기본값 — 일반적인 국내 오픈마켓 판매를 가정한 보수적 추정치. */
export const MARGIN_DEFAULTS = {
  customsDutyRate: 8,
  vatRate: 10,
  shippingPerUnitKrw: 3000,
  domesticFeePerUnitKrw: 500,
  platformFeeRate: 10.8,
  deliveryFeeKrw: 3000,
  marketingFeeKrw: 0,
};
