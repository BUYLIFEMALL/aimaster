// 판매자센터 화면 점검(v1.23) — 확장이 쓰는 칸이 상품 등록 화면에 그대로 있는지 「읽기만」 확인한다.
// 칸 표는 2026-10-28 실측(섹션 21개 펼침, 카테고리 고르기 전후 차이 0) 기준. fields.ts의 target을 바꾸면 여기도 고친다(시험이 확인).

/** 상품 등록 화면에 항상 있어야 하는 칸(ng-model·ng-click·버튼 속성 값, 또는 한글 칸 이름) */
export const HEALTH_TARGETS: string[] = [
  "MULTI_PUCHASE_DISCOUNT_UNIT_TYPE",
  "MULTI_PUCHASE_ORDER_UNIT_TYPE",
  "PURCHASE_POINT_DISCOUNT_UNIT_TYPE",
  "brand",
  "manufacturer",
  "vm.CONSTANTS.EDITOR_TYPE.NONE",
  "vm.category",
  "vm.content.customerServicePhoneNumber",
  "vm.createTempSave",
  "vm.directInputTag",
  "vm.modelData.claimDeliveryInfo.exchangeDeliveryFee",
  "vm.modelData.claimDeliveryInfo.returnDeliveryCompany.id",
  "vm.modelData.claimDeliveryInfo.returnDeliveryFee",
  "vm.modelData.deliveryCompany.id",
  "vm.modelData.deliveryFee.baseFee",
  "vm.modelData.deliveryFee.deliveryFeeByArea.area2extraFee",
  "vm.modelData.deliveryFee.deliveryFeeByArea.area3extraFee",
  "vm.modelData.deliveryFee.deliveryFeeType",
  "vm.modelData.deliveryFee.differentialFeeByArea",
  "vm.modelData.deliveryFee.freeConditionalAmount",
  "vm.modelData.deliveryFee.freeSectionLastQuantity",
  "vm.modelData.deliveryFee.repeatQuantity",
  "vm.modelData.deliveryFee.secondExtraFee",
  "vm.openUploadModal",
  "vm.product.customerBenefit.multiPurchaseDiscountPolicy.discountMethod.value",
  "vm.product.customerBenefit.multiPurchaseDiscountPolicy.orderValue",
  "vm.product.customerBenefit.purchasePointPolicy.value",
  "vm.product.customerBenefit.reviewPointPolicy.photoVideoReviewPoint",
  "vm.product.customerBenefit.reviewPointPolicy.textReviewPoint",
  "vm.product.detailAttribute.afterServiceInfo.afterServiceGuideContent",
  "vm.product.detailAttribute.afterServiceInfo.afterServiceTelephoneNumber",
  "vm.product.name",
  "vm.product.salePrice",
  "vm.product.stockQuantity",
  "vm.reference",
  "vm.selectizeType",
  "vm.sellerCodeInfo.sellerManagementCode",
  "vm.singleChannelProductMap[channelServiceType].channelProductDisplayStatusType",
  "vm.templateModal()",
  "vm.viewData.isEnableImmediateDiscountPolicy",
  "vm.viewData.isUseMultiPurchaseDiscountPolicy",
  "vm.viewData.isUsePurchasePointPolicy",
  "vm.viewData.isUseReviewPointPolicy",
  "vm.viewData.originAreaInfo.importer",
  "vm.viewData.originAreaInfo.originAreaExposureType",
  "결제방식",
  "모델명",
  "묶음배송",
  "별도 설치비",
  "상품상태",
  "상품속성",
  "어린이제품인증",
  "예약구매",
  "옵션",
  "저장하기",
  "제주/도서산간 추가배송비",
  "직접입력형",
  "추가상품",
];

/** 설정을 켜야 나타나는 칸 — 못 봐도 실패로 세지 않는다 */
export const HEALTH_CONDITIONAL: string[] = [
  "image.add",
  "immediateDiscountPolicy.value",
  "배송권역",
];

/** 점검을 하는 확장 최소 버전 */
export const HEALTH_EXT_MIN = "v1.23";
/** 자동 점검 간격 */
export const HEALTH_INTERVAL_DAYS = 7;

export type HealthStatus = "queued" | "running" | "ok" | "changed" | "failed";

/** 확장이 보낸 결과 정리 — 점검 표에 있는 이름만 「사라진 칸」으로 인정 */
export function normalizeHealthResult(raw: unknown): { missing: string[]; conditional: string[]; storeName: string | null } {
  const r = raw as { missing?: unknown; conditional?: unknown; storeName?: unknown } | null;
  const pick = (v: unknown, from: string[]) => [...new Set((Array.isArray(v) ? v : []).map(String).filter((x) => from.includes(x)))];
  return {
    missing: pick(r?.missing, HEALTH_TARGETS),
    conditional: pick(r?.conditional, HEALTH_CONDITIONAL),
    storeName: typeof r?.storeName === "string" && r.storeName.trim() ? r.storeName.trim().slice(0, 80) : null,
  };
}
