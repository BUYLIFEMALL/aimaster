// 상세페이지 상품 + 회원 스토어 기본값 → 스마트스토어 「상품 등록」 칸에 넣을 값 목록.
// 칸 이름(ng-model/name)은 0단계 화면 분석 결과(trending-product-finder/docs/EC_W8_SMARTSTORE_FORM_ANALYSIS_20261026.md).
// 확장은 이 목록을 위에서부터 그대로 실행한다 — 화면 위치가 아니라 이름으로 칸을 찾는다.

export type RegisterMode = "fill_only" | "temp_save" | "register";

export const REGISTER_MODES: Record<RegisterMode, { label: string; hint: string }> = {
  fill_only: { label: "입력만", hint: "칸만 채우고 멈춥니다. 「저장하기」는 회원이 직접 누릅니다(기본값)." },
  temp_save: { label: "임시저장까지", hint: "칸을 채운 뒤 판매자센터 「임시저장」을 누릅니다. 실제 상품은 생기지 않습니다." },
  register: { label: "바로 등록", hint: "칸을 채운 뒤 「저장하기」까지 누릅니다. 전시 상태는 기본값을 따릅니다." },
};

export function toRegisterMode(v: unknown): RegisterMode {
  return v === "temp_save" || v === "register" ? v : "fill_only";
}

export type OriginType = "domestic" | "import" | "etc";

export interface StoreDefaults {
  stock: number;
  originType: OriginType;
  originCountry: string;
  importer: string;
  noticeGroup: string;
  noticeReference: boolean;
  deliveryTemplate: string;
  asPhone: string;
  asGuide: string;
  returnFee: number | null;
  exchangeFee: number | null;
  displayOnRegister: boolean;
}

export const EMPTY_DEFAULTS: StoreDefaults = {
  stock: 99,
  originType: "domestic",
  originCountry: "",
  importer: "",
  noticeGroup: "기타 재화",
  noticeReference: true,
  deliveryTemplate: "",
  asPhone: "",
  asGuide: "",
  returnFee: null,
  exchangeFee: null,
  displayOnRegister: false,
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(/,/g, "")) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/** 화면·DB에서 온 값을 안전한 기본값 묶음으로 정리(모르는 칸은 버림) */
export function normalizeDefaults(raw: unknown): StoreDefaults {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const originType: OriginType = r.originType === "import" || r.originType === "etc" ? r.originType : "domestic";
  return {
    stock: num(r.stock, 0, 99_999_999) ?? EMPTY_DEFAULTS.stock,
    originType,
    originCountry: str(r.originCountry, 40),
    importer: str(r.importer, 60),
    noticeGroup: str(r.noticeGroup, 40) || EMPTY_DEFAULTS.noticeGroup,
    noticeReference: r.noticeReference !== false,
    deliveryTemplate: str(r.deliveryTemplate, 60),
    asPhone: str(r.asPhone, 20).replace(/[^0-9-]/g, ""),
    asGuide: str(r.asGuide, 500),
    returnFee: num(r.returnFee, 0, 1_000_000),
    exchangeFee: num(r.exchangeFee, 0, 1_000_000),
    displayOnRegister: r.displayOnRegister === true,
  };
}

export interface ProductSource {
  id: string;
  name: string | null;
  product_label?: string | null;
  price: number | null;
  sale_price: number | null;
}

/** 확장이 할 수 있는 동작 */
export type StepAction = "type" | "radio" | "check" | "search_pick" | "html" | "images" | "button";

export interface FillStep {
  key: string;
  section: string;
  label: string;
  /** 칸을 찾는 기준 — ng-model 우선, 없으면 name */
  target: string;
  action: StepAction;
  value: string;
  required: boolean;
}

export interface BuildResult {
  steps: FillStep[];
  errors: string[];
  warnings: string[];
}

export const NAME_MAX = 100;

/** 판매자 관리 코드 — 같은 상품을 두 번 올리려 할 때 알아보는 표시 */
export function managementCode(productId: string): string {
  return `AIM-${productId.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

export function buildFillSteps(
  product: ProductSource,
  defaults: StoreDefaults,
  opts: { mode: RegisterMode; categoryKeyword: string; detailImageCount: number; mainImage: boolean },
): BuildResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: FillStep[] = [];
  const add = (s: Omit<FillStep, "required"> & { required?: boolean }) => steps.push({ required: false, ...s });

  const name = (product.name || product.product_label || "").trim();
  if (!name) errors.push("상품명이 비어 있습니다. 상세페이지 자동화에서 상품명을 넣어 주세요.");
  else if (name.length > NAME_MAX) errors.push(`상품명이 ${name.length}자입니다. 스마트스토어는 ${NAME_MAX}자까지입니다.`);
  if (/[\\*?"<>]/.test(name)) warnings.push("상품명에 \\ * ? \" < > 같은 기호가 있으면 스마트스토어가 거절할 수 있습니다.");

  const price = product.price;
  if (price == null || !Number.isInteger(price) || price < 10) errors.push("판매가(정상가)가 없거나 10원보다 작습니다.");
  const sale = product.sale_price;
  const discount = price != null && sale != null && sale > 0 && sale < price ? price - sale : 0;
  if (sale != null && price != null && sale >= price) warnings.push("할인가가 정상가보다 크거나 같아 즉시할인은 넣지 않습니다.");

  const keyword = opts.categoryKeyword.trim();
  if (!keyword) errors.push("카테고리 검색어를 넣어 주세요(예: 텀블러). 마지막 단계 카테고리까지 확장이 고릅니다.");
  if (!opts.mainImage) errors.push("대표 이미지가 없습니다. 상세페이지 자동화에서 대표 사진을 올려 주세요.");
  if (opts.detailImageCount === 0) warnings.push("완성된 섹션 이미지가 없어 상세설명이 비게 됩니다.");

  add({ key: "category", section: "카테고리", label: "카테고리", target: "vm.category", action: "search_pick", value: keyword, required: true });
  add({ key: "name", section: "상품명", label: "상품명", target: "vm.product.name", action: "type", value: name, required: true });
  add({ key: "price", section: "판매가", label: "판매가", target: "vm.product.salePrice", action: "type", value: price != null ? String(price) : "", required: true });
  if (discount > 0) {
    add({ key: "discount_on", section: "판매가", label: "즉시할인 설정함", target: "vm.viewData.isEnableImmediateDiscountPolicy", action: "radio", value: "true" });
    add({ key: "discount", section: "판매가", label: "할인 금액(원)", target: "immediateDiscountPolicy.value", action: "type", value: String(discount) });
  }
  add({ key: "stock", section: "재고수량", label: "재고수량", target: "vm.product.stockQuantity", action: "type", value: String(defaults.stock), required: true });
  add({ key: "images", section: "상품이미지", label: "대표·추가 이미지", target: "vm.openUploadModal", action: "images", value: "main", required: true });
  add({ key: "detail", section: "상세설명", label: `상세설명(섹션 이미지 ${opts.detailImageCount}장, HTML 작성)`, target: "vm.CONSTANTS.EDITOR_TYPE.NONE", action: "html", value: String(opts.detailImageCount), required: true });

  if (defaults.originType === "import") {
    if (!defaults.originCountry) warnings.push("원산지 「수입산」인데 나라가 비어 있습니다.");
    add({ key: "origin", section: "상품 주요정보", label: "원산지", target: "vm.viewData.originAreaInfo.originAreaExposureType", action: "search_pick", value: `수입산|${defaults.originCountry}` });
    if (defaults.importer) add({ key: "importer", section: "상품 주요정보", label: "수입사", target: "vm.viewData.originAreaInfo.importer", action: "type", value: defaults.importer });
  } else {
    add({ key: "origin", section: "상품 주요정보", label: "원산지", target: "vm.viewData.originAreaInfo.originAreaExposureType", action: "search_pick", value: defaults.originType === "etc" ? `기타|${defaults.originCountry}` : "국산" });
  }

  add({ key: "notice_group", section: "상품정보제공고시", label: "상품군", target: "vm.selectizeType", action: "search_pick", value: defaults.noticeGroup, required: true });
  if (defaults.noticeReference) add({ key: "notice_ref", section: "상품정보제공고시", label: "상품상세 참조로 전체 입력", target: "vm.reference", action: "check", value: "true" });

  if (defaults.deliveryTemplate) {
    add({ key: "delivery_tpl", section: "배송", label: `배송 템플릿 「${defaults.deliveryTemplate}」`, target: "savedTemplate.DELIVERY", action: "search_pick", value: defaults.deliveryTemplate, required: true });
  } else {
    warnings.push("배송 템플릿 이름이 없습니다. 판매자센터 기본 배송 설정이 그대로 쓰이니 「입력만」으로 확인해 주세요.");
  }
  if (defaults.returnFee != null) add({ key: "return_fee", section: "반품/교환", label: "반품 배송비(편도)", target: "vm.modelData.claimDeliveryInfo.returnDeliveryFee", action: "type", value: String(defaults.returnFee) });
  if (defaults.exchangeFee != null) add({ key: "exchange_fee", section: "반품/교환", label: "교환 배송비(왕복)", target: "vm.modelData.claimDeliveryInfo.exchangeDeliveryFee", action: "type", value: String(defaults.exchangeFee) });

  if (!defaults.asPhone) errors.push("A/S 전화번호가 없습니다. 「스토어 기본값」에서 넣어 주세요.");
  add({ key: "as_phone", section: "A/S", label: "A/S 전화번호", target: "vm.product.detailAttribute.afterServiceInfo.afterServiceTelephoneNumber", action: "type", value: defaults.asPhone, required: true });
  add({ key: "as_guide", section: "A/S", label: "A/S 안내", target: "vm.product.detailAttribute.afterServiceInfo.afterServiceGuideContent", action: "type", value: defaults.asGuide || "상품 상세페이지 참조", required: true });

  add({ key: "seller_code", section: "판매자 코드", label: "판매자 관리 코드", target: "vm.sellerCodeInfo.sellerManagementCode", action: "type", value: managementCode(product.id) });

  if (opts.mode === "register") {
    add({ key: "display", section: "노출 채널", label: defaults.displayOnRegister ? "전시중" : "전시중지(판매대기)", target: "channelProductDisplayStatusType", action: "radio", value: defaults.displayOnRegister ? "ON" : "SUSPENSION" });
    add({ key: "submit", section: "저장", label: "저장하기", target: "저장하기", action: "button", value: "" });
  } else if (opts.mode === "temp_save") {
    add({ key: "submit", section: "저장", label: "임시저장", target: "vm.createTempSave", action: "button", value: "" });
  }

  return { steps, errors, warnings };
}

/** 섹션 이미지를 상세설명 순서로 — section_sequence가 있으면 그 순서, 없는 것은 원래 순서로 뒤에 */
export function orderSections<T extends { section_key: string; section_order: number }>(rows: T[], sequence: string[] | null | undefined): T[] {
  const base = [...rows].sort((a, b) => a.section_order - b.section_order);
  if (!sequence?.length) return base;
  const rank = new Map(sequence.map((k, i) => [k, i]));
  const inSeq = base.filter((r) => rank.has(r.section_key)).sort((a, b) => rank.get(a.section_key)! - rank.get(b.section_key)!);
  return [...inSeq, ...base.filter((r) => !rank.has(r.section_key))];
}
