// 쿠팡 상품 생성 요청 본문 만들기·검사(C1-10~C1-12). 외부 호출 없음 — 시험(tests/product.test.mjs)으로 확인한다.
// 명세 요약: docs/API_PRODUCT_CREATE_SPEC.md (원문 https://developers.coupang.com/hc/ko/articles/360033877853)
// ⚠️ 키 발급 전이라 쿠팡에 실제로 보내 보지 못한 부분: contents 묶음 방식(IMAGE_NO_SPACE 한 덩어리), 옵션 없는 상품의 attributes 빈 배열 허용 여부, searchTags 형식(문자열 배열로 보냄).

export const SALE_END_AT = "2099-01-01T23:59:59";
export const MAX_ITEMS = 200;
export const MAX_DETAIL_IMAGES = 9;
export const MAX_VENDOR_PATH = 200;

export type DeliveryMethod = "SEQUENCIAL" | "COLD_FRESH" | "MAKE_ORDER" | "AGENT_BUY" | "VENDOR_DIRECT";
export type DeliveryChargeType = "FREE" | "NOT_FREE" | "CHARGE_RECEIVED" | "CONDITIONAL_FREE";

/** 회원 스토어 기본값(C1-5 화면에서 한 번 넣음) */
export interface CoupangDefaults {
  outboundShippingPlaceCode: string;
  /** 화면 표시용(쿠팡에 보내지 않음) — 새로고침 뒤에도 출고지 이름이 보이게 */
  outboundShippingPlaceName?: string;
  returnCenter: { code: string; name: string; phone: string; zipCode: string; address: string; addressDetail: string };
  deliveryMethod: DeliveryMethod;
  deliveryCompanyCode: string;
  deliveryChargeType: DeliveryChargeType;
  deliveryCharge: number;
  /** 발송비 — 택배 1건 실제 비용(쿠팡에 보내지 않음, 반품배송비 기본값 계산용) */
  shipCost: number;
  freeShipOverAmount: number;
  deliveryChargeOnReturn: number;
  returnCharge: number;
  remoteAreaDeliverable: boolean;
  unionDelivery: boolean;
  outboundShippingTimeDay: number;
  maximumBuyForPerson: number;
  adultOnly: boolean;
  taxFree: boolean;
}

export interface CoupangOption {
  /** 옵션명(상품 안에서 중복 불가). 옵션 없는 상품은 상품명 */
  name: string;
  originalPrice: number;
  salePrice: number;
  stock: number;
  /** 구매옵션(카테고리 메타 이름 그대로) */
  attributes: { type: string; value: string }[];
  sku?: string;
  /** 표준상품 코드(GTIN, 숫자 8·12·13·14자리). 없으면 emptyBarcode로 보낸다 */
  barcode?: string;
  /** 모델번호·품번(MPN) */
  modelNo?: string;
}

export interface CoupangDraft {
  vendorId: string;
  wingUserId: string;
  categoryCode: number | null;
  name: string;
  brand?: string;
  manufacturer?: string;
  options: CoupangOption[];
  /** 고시정보(카테고리 메타 항목과 같은 이름) */
  notices: { category: string; detail: string; content: string }[];
  searchTags?: string[];
  /** 쿠팡이 내려받을 우리 주소(https, 200자 이하) */
  images: { representation: string; extras: string[]; contents: string[] };
  requested: boolean;
  now?: Date;
}

/** 한국 시각 yyyy-MM-dd'T'HH:mm:ss */
export function kstDateTime(d: Date): string {
  const k = new Date(d.getTime() + 9 * 3600_000);
  return k.toISOString().slice(0, 19);
}

/** 브랜드가 없는 상품에 보내는 값·바코드 없는 사유(명세 「상품 생성」 2026-10-31 확인) */
export const GENERIC_BRAND = "GENERIC";
export const EMPTY_BARCODE_REASON = "바코드 없는 상품";
export const cleanBarcode = (v?: string) => (v ?? "").replace(/[\s-]/g, "");

const isInt = (n: unknown, min = 0) => Number.isInteger(n) && (n as number) >= min;
const imageOk = (u: string) => /^https:\/\/[^\s:/]+(?::443)?\//.test(u) && u.length <= MAX_VENDOR_PATH;

/** 보내기 전 검사 — 빠진 값·규칙 위반을 한국어 문장으로(빈 배열이면 통과) */
export function checkDraft(draft: CoupangDraft, defaults: CoupangDefaults | null): string[] {
  const p: string[] = [];
  if (!defaults) p.push("출고지·반품지·배송비 기본값을 먼저 넣어 주세요.");
  if (!draft.vendorId || !draft.wingUserId) p.push("쿠팡 연결에서 키를 먼저 등록해 주세요.");
  if (!draft.categoryCode) p.push("카테고리를 골라 주세요.");
  const name = draft.name.trim();
  if (!name) p.push("상품명이 비어 있습니다.");
  else if (name.length > 100) p.push(`상품명은 100자까지입니다(지금 ${name.length}자).`);
  const brand = draft.brand?.trim() ?? "";
  if (brand && !/^[\p{L}\p{N}]+$/u.test(brand)) p.push("브랜드는 띄어쓰기와 특수문자 없이 넣어 주세요(쿠팡 규칙).");

  const opts = draft.options;
  if (!opts.length) p.push("옵션(판매 단위)이 하나도 없습니다.");
  if (opts.length > MAX_ITEMS) p.push(`옵션은 ${MAX_ITEMS}개까지입니다(지금 ${opts.length}개).`);
  const seen = new Set<string>();
  opts.forEach((o, i) => {
    const label = `옵션 ${i + 1}(${o.name || "이름 없음"})`;
    const n = o.name.trim();
    if (!n) p.push(`옵션 ${i + 1}의 이름이 비어 있습니다.`);
    else if (n.length > 150) p.push(`${label}: 옵션명은 150자까지입니다.`);
    else if (seen.has(n)) p.push(`${label}: 같은 옵션명이 이미 있습니다(쿠팡은 중복 옵션값을 받지 않습니다).`);
    seen.add(n);
    if (!isInt(o.salePrice, 10)) p.push(`${label}: 판매가를 10원 이상 정수로 넣어 주세요.`);
    if (!isInt(o.originalPrice, 10)) p.push(`${label}: 정가를 10원 이상 정수로 넣어 주세요.`);
    else if (isInt(o.salePrice, 10) && o.originalPrice < o.salePrice) p.push(`${label}: 정가가 판매가보다 낮습니다.`);
    if (!isInt(o.stock, 0) || o.stock > 99999) p.push(`${label}: 재고는 0~99,999 사이 정수로 넣어 주세요.`);
    const barcode = cleanBarcode(o.barcode);
    if (barcode && !/^(\d{8}|\d{12,14})$/.test(barcode)) p.push(`${label}: 바코드는 숫자 8·12·13·14자리로 넣어 주세요.`);
    if (!barcode && !o.modelNo?.trim()) p.push(`${label}: 바코드나 모델번호(품번) 중 하나를 넣어 주세요.`);
    o.attributes.forEach((a) => {
      if (!a.type.trim() || !a.value.trim()) p.push(`${label}: 구매옵션 이름·값이 비어 있습니다.`);
    });
  });

  const { representation, extras, contents } = draft.images;
  if (!representation) p.push("대표 이미지가 없습니다.");
  else if (!imageOk(representation)) p.push("대표 이미지 주소가 https가 아니거나 200자를 넘습니다(쿠팡 규칙).");
  if (extras.length > MAX_DETAIL_IMAGES) p.push(`추가 이미지는 ${MAX_DETAIL_IMAGES}장까지입니다.`);
  if ([...extras, ...contents].some((u) => !imageOk(u))) p.push("추가·상세 이미지 주소 중 https가 아니거나 200자를 넘는 것이 있습니다.");
  if (!contents.length) p.push("상세 내용(섹션 이미지)이 없습니다.");

  if (defaults) {
    const d = defaults;
    if (!d.outboundShippingPlaceCode) p.push("출고지를 골라 주세요.");
    if (!d.returnCenter.code) p.push("반품지를 골라 주세요.");
    if (!d.deliveryCompanyCode) p.push("택배사를 골라 주세요.");
    for (const [k, v] of [["기본 배송비", d.deliveryCharge], ["무료배송 기준 금액", d.freeShipOverAmount], ["초도 반품배송비", d.deliveryChargeOnReturn], ["반품배송비", d.returnCharge]] as const) {
      if (!isInt(v, 0)) p.push(`${k}를 0 이상 정수로 넣어 주세요.`);
    }
    if (d.deliveryChargeOnReturn > 0 && (d.returnCharge < d.deliveryChargeOnReturn || d.returnCharge > d.deliveryChargeOnReturn * 1.5)) {
      p.push("반품배송비는 초도 반품배송비의 100~150% 사이여야 합니다(쿠팡 규칙).");
    }
    if (d.deliveryChargeType === "CONDITIONAL_FREE" && !(d.freeShipOverAmount > 0)) p.push("조건부 무료배송이면 무료배송 기준 금액을 넣어 주세요.");
    if (d.deliveryChargeType === "FREE" && d.deliveryCharge !== 0) p.push("무료배송이면 기본 배송비는 0원이어야 합니다.");
    if (!isInt(d.outboundShippingTimeDay, 1)) p.push("기준 출고일을 1일 이상으로 넣어 주세요.");
  }
  return p;
}

/** 쿠팡 상품 생성 요청 본문. checkDraft가 빈 배열일 때만 보낸다. */
export function buildCreateBody(draft: CoupangDraft, d: CoupangDefaults) {
  const now = draft.now ?? new Date();
  const images = [
    { imageOrder: 0, imageType: "REPRESENTATION", vendorPath: draft.images.representation },
    ...draft.images.extras.slice(0, MAX_DETAIL_IMAGES).map((u, i) => ({ imageOrder: i + 1, imageType: "DETAIL", vendorPath: u })),
  ];
  const contents = [
    {
      contentsType: "IMAGE_NO_SPACE",
      contentDetails: draft.images.contents.map((u) => ({ content: u, detailType: "IMAGE" })),
    },
  ];
  const notices = draft.notices.map((n) => ({ noticeCategoryName: n.category, noticeCategoryDetailName: n.detail, content: n.content }));
  const searchTags = (draft.searchTags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 20);

  return {
    displayCategoryCode: draft.categoryCode,
    sellerProductName: draft.name.trim(),
    displayProductName: draft.name.trim(),
    vendorId: draft.vendorId,
    saleStartedAt: kstDateTime(now),
    saleEndedAt: SALE_END_AT,
    brand: draft.brand?.trim() || GENERIC_BRAND,
    ...(draft.manufacturer?.trim() ? { manufacture: draft.manufacturer.trim() } : {}),
    deliveryMethod: d.deliveryMethod,
    deliveryCompanyCode: d.deliveryCompanyCode,
    deliveryChargeType: d.deliveryChargeType,
    deliveryCharge: d.deliveryChargeType === "FREE" ? 0 : d.deliveryCharge,
    freeShipOverAmount: d.deliveryChargeType === "CONDITIONAL_FREE" ? d.freeShipOverAmount : 0,
    deliveryChargeOnReturn: d.deliveryChargeOnReturn,
    returnCharge: d.returnCharge,
    remoteAreaDeliverable: d.remoteAreaDeliverable ? "Y" : "N",
    unionDeliveryType: d.unionDelivery ? "UNION_DELIVERY" : "NOT_UNION_DELIVERY",
    returnCenterCode: d.returnCenter.code,
    returnChargeName: d.returnCenter.name,
    companyContactNumber: d.returnCenter.phone,
    returnZipCode: d.returnCenter.zipCode,
    returnAddress: d.returnCenter.address,
    returnAddressDetail: d.returnCenter.addressDetail,
    outboundShippingPlaceCode: d.outboundShippingPlaceCode,
    vendorUserId: draft.wingUserId,
    requested: draft.requested,
    items: draft.options.slice(0, MAX_ITEMS).map((o) => ({
      itemName: o.name.trim(),
      originalPrice: o.originalPrice,
      salePrice: o.salePrice,
      maximumBuyCount: o.stock,
      maximumBuyForPerson: d.maximumBuyForPerson,
      maximumBuyForPersonPeriod: 1,
      outboundShippingTimeDay: d.outboundShippingTimeDay,
      unitCount: 1,
      adultOnly: d.adultOnly ? "ADULT_ONLY" : "EVERYONE",
      taxType: d.taxFree ? "FREE" : "TAX",
      parallelImported: "NOT_PARALLEL_IMPORTED",
      overseasPurchased: "NOT_OVERSEAS_PURCHASED",
      pccNeeded: "false",
      ...(o.sku ? { externalVendorSku: o.sku } : {}),
      ...(cleanBarcode(o.barcode) ? { barcode: cleanBarcode(o.barcode) } : { emptyBarcode: true, emptyBarcodeReason: EMPTY_BARCODE_REASON }),
      ...(o.modelNo?.trim() ? { modelNo: o.modelNo.trim() } : {}),
      images,
      attributes: o.attributes.map((a) => ({ attributeTypeName: a.type.trim(), attributeValueName: a.value.trim() })),
      contents,
      notices,
      ...(searchTags.length ? { searchTags } : {}),
      offerCondition: "NEW",
    })),
  };
}
