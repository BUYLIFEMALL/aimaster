// 쿠팡 상품 복사 등록(R4). 외부 호출 없음(tests/prefs.test.mjs).
// 명세 /ko/api/products/querying-product·product-creation(2026-10-31 확인). 조회 응답에서 생성에 필요한 칸만 골라 쓴다.
// 이미지는 쿠팡 CDN 경로(cdnPath)와 업체 경로(vendorPath)를 그대로 넘긴다. ⚠ 이 방식을 쿠팡이 받는지는 첫 실제 복사에서 확인.
const PRODUCT_FIELDS = ["displayCategoryCode", "brand", "manufacture", "deliveryMethod", "deliveryCompanyCode", "deliveryChargeType", "deliveryCharge", "freeShipOverAmount", "deliveryChargeOnReturn", "returnCharge", "remoteAreaDeliverable", "unionDeliveryType", "returnCenterCode", "returnChargeName", "companyContactNumber", "returnZipCode", "returnAddress", "returnAddressDetail", "outboundShippingPlaceCode", "requiredDocuments", "extraInfoMessage", "saleEndedAt"];
const ITEM_FIELDS = ["itemName", "originalPrice", "salePrice", "maximumBuyCount", "maximumBuyForPerson", "maximumBuyForPersonPeriod", "outboundShippingTimeDay", "unitCount", "adultOnly", "taxType", "parallelImported", "overseasPurchased", "pccNeeded", "externalVendorSku", "barcode", "emptyBarcode", "emptyBarcodeReason", "modelNo", "images", "attributes", "contents", "notices", "searchTags", "offerCondition", "offerDescription", "certifications"];

const pickFields = (src: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.filter((k) => src[k] !== undefined && src[k] !== null).map((k) => [k, src[k]]));

export function checkCopyName(name: string): string {
  const n = name.trim();
  if (!n) return "새 상품명을 넣어 주세요.";
  if (n.length > 100) return "상품명은 100자까지입니다.";
  return "";
}

/** 복사본은 항상 저장만 한다(requested false). 상품번호·옵션번호·상태는 넘기지 않는다 */
export function buildCopyBody(raw: unknown, input: { name: string; vendorId: string; wingUserId: string; saleStartedAt: string }): Record<string, unknown> {
  const d = ((raw as { data?: unknown })?.data ?? {}) as Record<string, unknown>;
  const items = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  return {
    ...pickFields(d, PRODUCT_FIELDS),
    sellerProductName: input.name.trim(),
    displayProductName: input.name.trim(),
    vendorId: input.vendorId,
    vendorUserId: input.wingUserId,
    saleStartedAt: input.saleStartedAt,
    requested: false,
    items: items.map((it) => pickFields(it, ITEM_FIELDS)),
  };
}
