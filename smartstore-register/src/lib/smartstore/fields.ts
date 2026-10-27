import { optionRowCount, type OptionSpec } from "./options";
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

/** 배송비 종류 — 판매자센터 「배송비」 고르기 상자의 보이는 글자 */
export type DeliveryFeeType = "" | "FREE" | "PAID" | "CONDITIONAL_FREE" | "QUANTITY" | "RANGE";
export const DELIVERY_FEE_LABEL: Record<Exclude<DeliveryFeeType, "">, string> = { FREE: "무료", PAID: "유료", CONDITIONAL_FREE: "조건부 무료", QUANTITY: "수량별", RANGE: "구간별" };
/** 배송 직접 입력 확장(2026-10-27 v1.14) — 판매자센터 화면 보기 글자 그대로 */
export type PayType = "" | "착불" | "선결제" | "착불 또는 선결제";
export type JejuMode = "" | "off" | "2" | "3";

export interface StoreDefaults {
  stock: number;
  originType: OriginType;
  originCountry: string;
  importer: string;
  noticeGroup: string;
  noticeReference: boolean;
  deliveryTemplate: string;
  /** 템플릿 이름이 없을 때 직접 넣는 배송 칸 */
  deliveryCompany: string;
  deliveryFeeType: DeliveryFeeType;
  baseFee: number | null;
  freeOver: number | null;
  /** 수량별: ○개마다 기본 배송비 반복 부과 */
  qtyEvery: number | null;
  /** 구간별(2구간): ○개까지 추가배송비 없음 / 초과 구매 시 추가배송비 */
  rangeUpTo: number | null;
  rangeExtraFee: number | null;
  payType: PayType;
  bundle: "" | "가능" | "불가";
  /** 제주/도서산간 추가배송비: off=설정안함, 2=2권역(금액 1개), 3=3권역(제주·제주 외 도서산간) */
  jejuMode: JejuMode;
  jejuFee: number | null;
  islandFee: number | null;
  regionFee: string;
  installFee: "" | "있음" | "없음";
  asPhone: string;
  asGuide: string;
  returnFee: number | null;
  exchangeFee: number | null;
  displayOnRegister: boolean;
  /** 어린이제품인증 — 그 칸이 나오는 카테고리에서만 씀. ""=판매자센터 기본값 그대로, not_target=「인증대상 아님」(법적 선택이라 회원이 정함) */
  childCert: "" | "not_target";
}

export const EMPTY_DEFAULTS: StoreDefaults = {
  stock: 99,
  originType: "domestic",
  originCountry: "",
  importer: "",
  noticeGroup: "기타 재화",
  noticeReference: true,
  deliveryTemplate: "",
  deliveryCompany: "",
  deliveryFeeType: "",
  baseFee: null,
  freeOver: null,
  qtyEvery: null,
  rangeUpTo: null,
  rangeExtraFee: null,
  payType: "",
  bundle: "",
  jejuMode: "",
  jejuFee: null,
  islandFee: null,
  regionFee: "",
  installFee: "",
  asPhone: "",
  asGuide: "",
  returnFee: null,
  exchangeFee: null,
  displayOnRegister: false,
  childCert: "",
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
    deliveryCompany: str(r.deliveryCompany, 30),
    deliveryFeeType: (["FREE", "PAID", "CONDITIONAL_FREE", "QUANTITY", "RANGE"] as const).find((v) => v === r.deliveryFeeType) ?? "",
    baseFee: num(r.baseFee, 0, 100_000),
    freeOver: num(r.freeOver, 10, 999_999_990),
    qtyEvery: num(r.qtyEvery, 1, 99_999),
    rangeUpTo: num(r.rangeUpTo, 1, 99_999),
    rangeExtraFee: num(r.rangeExtraFee, 0, 1_000_000),
    payType: (["착불", "선결제", "착불 또는 선결제"] as const).find((v) => v === r.payType) ?? "",
    bundle: r.bundle === "가능" || r.bundle === "불가" ? r.bundle : "",
    jejuMode: r.jejuMode === "off" || r.jejuMode === "2" || r.jejuMode === "3" ? r.jejuMode : "",
    jejuFee: num(r.jejuFee, 0, 1_000_000),
    islandFee: num(r.islandFee, 0, 1_000_000),
    regionFee: str(r.regionFee, 200),
    installFee: r.installFee === "있음" || r.installFee === "없음" ? r.installFee : "",
    asPhone: str(r.asPhone, 20).replace(/[^0-9-]/g, ""),
    asGuide: str(r.asGuide, 500),
    returnFee: num(r.returnFee, 0, 1_000_000),
    exchangeFee: num(r.exchangeFee, 0, 1_000_000),
    displayOnRegister: r.displayOnRegister === true,
    childCert: r.childCert === "not_target" ? "not_target" : "",
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
export type StepAction = "type" | "radio" | "check" | "search_pick" | "html" | "images" | "button" | "select" | "template" | "choose" | "extra_images" | "meta" | "options" | "type_label";

/** 동작별로 그 동작을 아는 가장 낮은 확장 버전 — 옛 확장이 모르는 동작을 건너뛰고 저장하지 않도록 서버가 작업을 넘기지 않는다 */
export const ACTION_MIN_EXT: Record<string, string> = { select: "v1.04", template: "v1.04", choose: "v1.06", extra_images: "v1.10", options: "v1.12", type_label: "v1.14" };

/**
 * 칸 목록을 만든 코드의 세대 — 오래 열어 둔 탭은 그 시점 배포의 옛 코드로 작업을 만든다(2026-10-27 실제 사고: 고시 A/S 전화·어린이인증·추가 이미지가 빠진 작업).
 * 칸 구성이 바뀌어 옛 작업을 실행하면 안 될 때 이 숫자를 올린다. 이 표시가 없거나 낮은 작업은 확장에 넘기지 않는다.
 */
export const STEP_BUILDER = 3; // 2: 옵션 단계(v1.12) · 3: 배송 직접 입력 확장(v1.14)
const BUILDER_KEY = "_builder";

/** 저장할 단계 목록 끝에 「만든 세대」 표시를 붙인다(화면 미리보기에는 붙이지 않음) */
export function withBuilderMark<T extends { key: string }>(steps: T[]): (T | FillStep)[] {
  return [...steps, { key: BUILDER_KEY, section: "", label: "", target: "", action: "meta", value: String(STEP_BUILDER), required: false }];
}

/** 지금 코드가 만든 작업인가 */
export function isCurrentBuild(steps: { key: string; value?: string }[]): boolean {
  return steps.some((s) => s.key === BUILDER_KEY && Number(s.value) >= STEP_BUILDER);
}

/** 확장에 넘길 때는 표시를 뺀다(옛 확장이 모르는 단계를 보지 않게) */
export function withoutBuilderMark<T extends { key: string }>(steps: T[]): T[] {
  return steps.filter((s) => s.key !== BUILDER_KEY);
}

/** 스마트스토어 추가 이미지 최대 장수 */
export const EXTRA_IMAGES_MAX = 9;

/** 이 작업에 필요한 가장 낮은 확장 버전(없으면 null) */
export function extMinVersion(steps: { action: string }[]): string | null {
  let best: string | null = null;
  for (const s of steps) { const v = ACTION_MIN_EXT[s.action]; if (v && (!best || extVersionNumber(v) > extVersionNumber(best))) best = v; }
  return best;
}

/** "v1.04" → 104, 형식이 틀리면 0 */
export function extVersionNumber(v: string | null | undefined): number {
  const m = /^v?(\d+)\.(\d{2})$/.exec((v ?? "").trim());
  return m ? Number(m[1]) * 100 + Number(m[2]) : 0;
}

/** 이 작업을 이 확장 버전이 안전하게 실행할 수 있는가 */
export function extCanRun(steps: { action: string }[], extVersion: string | null | undefined): boolean {
  const need = extMinVersion(steps);
  return !need || extVersionNumber(extVersion) >= extVersionNumber(need);
}

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
  opts: { mode: RegisterMode; categoryKeyword: string; detailImageCount: number; mainImage: boolean; extraImageCount?: number; options?: OptionSpec | null },
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
  if (opts.options) {
    const o = opts.options;
    add({ key: "options", section: "옵션", label: `옵션 ${o.type === "simple" ? "단독형" : "조합형"} ${optionRowCount(o)}줄(${o.groups.map((g) => g.name).join("·")})`, target: "옵션", action: "options", value: JSON.stringify(o) });
  }
  add({ key: "images", section: "상품이미지", label: "대표·추가 이미지", target: "vm.openUploadModal", action: "images", value: "main", required: true });
  const extra = Math.min(EXTRA_IMAGES_MAX, Math.max(0, Math.floor(opts.extraImageCount ?? 0)));
  if (extra > 0) add({ key: "extra_images", section: "상품이미지", label: `추가 이미지 ${extra}장`, target: "image.add", action: "extra_images", value: String(extra) });
  add({ key: "detail", section: "상세설명", label: `상세설명(섹션 이미지 ${opts.detailImageCount}장, HTML 작성)`, target: "vm.CONSTANTS.EDITOR_TYPE.NONE", action: "html", value: String(opts.detailImageCount), required: true });

  if (defaults.originType === "import") {
    if (!defaults.originCountry) warnings.push("원산지 「수입산」인데 나라가 비어 있습니다.");
    add({ key: "origin", section: "상품 주요정보", label: "원산지", target: "vm.viewData.originAreaInfo.originAreaExposureType", action: "search_pick", value: `수입산|${defaults.originCountry}` });
    if (defaults.importer) add({ key: "importer", section: "상품 주요정보", label: "수입사", target: "vm.viewData.originAreaInfo.importer", action: "type", value: defaults.importer });
  } else {
    add({ key: "origin", section: "상품 주요정보", label: "원산지", target: "vm.viewData.originAreaInfo.originAreaExposureType", action: "search_pick", value: defaults.originType === "etc" ? `기타|${defaults.originCountry}` : "국산" });
  }

  if (defaults.childCert === "not_target") add({ key: "child_cert", section: "상품 주요정보", label: "어린이제품인증 「인증대상 아님」", target: "어린이제품인증", action: "choose", value: "어린이제품 인증대상 아님" });

  add({ key: "notice_group", section: "상품정보제공고시", label: "상품군", target: "vm.selectizeType", action: "search_pick", value: defaults.noticeGroup, required: true });
  if (defaults.noticeReference) add({ key: "notice_ref", section: "상품정보제공고시", label: "상품상세 참조로 전체 입력", target: "vm.reference", action: "check", value: "true" });
  // 「상품상세 참조로 전체 입력」을 체크해도 고시의 「A/S 책임자와 전화번호」는 비어 저장이 거절된다(2026-10-27 실제 시험) → A/S 전화번호를 넣는다
  if (defaults.asPhone) add({ key: "notice_phone", section: "상품정보제공고시", label: "고시 A/S 책임자 전화번호", target: "vm.content.customerServicePhoneNumber", action: "type", value: defaults.asPhone, required: true });

  // 배송 — 템플릿 이름이 있으면 「배송비 템플릿」 목록 창에서 고르고, 없으면 칸을 직접 채운다.
  // 주의: vm.savedTemplate['DELIVERY']는 고르는 칸이 아니라 「템플릿 추가」(새 템플릿 저장) 체크 상자라 건드리지 않는다.
  if (defaults.deliveryTemplate) {
    add({ key: "delivery_tpl", section: "배송", label: `배송 템플릿 「${defaults.deliveryTemplate}」`, target: "vm.templateModal()", action: "template", value: defaults.deliveryTemplate, required: true });
  } else if (defaults.deliveryFeeType || defaults.deliveryCompany) {
    if (defaults.deliveryCompany) add({ key: "delivery_company", section: "배송", label: `택배사 「${defaults.deliveryCompany}」`, target: "vm.modelData.deliveryCompany.id", action: "select", value: defaults.deliveryCompany, required: true });
    const fee = defaults.deliveryFeeType;
    if (fee) {
      add({ key: "delivery_fee_type", section: "배송", label: `배송비 「${DELIVERY_FEE_LABEL[fee]}」`, target: "vm.modelData.deliveryFee.deliveryFeeType", action: "select", value: DELIVERY_FEE_LABEL[fee], required: true });
      if (fee !== "FREE") {
        if (defaults.baseFee == null || defaults.baseFee < 10) errors.push("배송비가 유료·조건부 무료인데 기본 배송비가 없습니다(10원 이상). 「스토어 기본값」에서 넣어 주세요.");
        else add({ key: "delivery_base_fee", section: "배송", label: "기본 배송비", target: "vm.modelData.deliveryFee.baseFee", action: "type", value: String(defaults.baseFee), required: true });
      }
      if (fee === "CONDITIONAL_FREE") {
        if (defaults.freeOver == null) errors.push("조건부 무료인데 「○원 이상 무료」 금액이 없습니다. 「스토어 기본값」에서 넣어 주세요.");
        else add({ key: "delivery_free_over", section: "배송", label: "무료 조건 금액", target: "vm.modelData.deliveryFee.freeConditionalAmount", action: "type", value: String(defaults.freeOver), required: true });
      }
      // 수량별·구간별: 배송비 종류를 고른 뒤 나타나는 「배송비 조건」 칸(ng-model은 판매자센터 저장본에서 확인)
      if (fee === "QUANTITY") {
        if (defaults.qtyEvery == null) errors.push("수량별인데 「○개마다」 수량이 없습니다. 「스토어 기본값」에서 넣어 주세요.");
        else add({ key: "delivery_qty", section: "배송", label: `${defaults.qtyEvery}개마다 기본 배송비`, target: "vm.modelData.deliveryFee.repeatQuantity", action: "type", value: String(defaults.qtyEvery), required: true });
      }
      if (fee === "RANGE") {
        if (defaults.rangeUpTo == null || defaults.rangeExtraFee == null) errors.push("구간별인데 「○개까지」 수량이나 초과 추가배송비가 없습니다. 「스토어 기본값」에서 넣어 주세요.");
        else {
          add({ key: "delivery_range_qty", section: "배송", label: `${defaults.rangeUpTo}개까지 추가배송비 없음`, target: "vm.modelData.deliveryFee.freeSectionLastQuantity", action: "type", value: String(defaults.rangeUpTo), required: true });
          add({ key: "delivery_range_fee", section: "배송", label: "초과 구매 시 추가배송비", target: "vm.modelData.deliveryFee.secondExtraFee", action: "type", value: String(defaults.rangeExtraFee), required: true });
        }
      }
      if (defaults.payType && fee !== "FREE") add({ key: "delivery_pay", section: "배송", label: `결제방식 「${defaults.payType}」`, target: "결제방식", action: "choose", value: defaults.payType });
    }
    if (defaults.bundle) add({ key: "delivery_bundle", section: "배송", label: `묶음배송 「${defaults.bundle}」`, target: "묶음배송", action: "choose", value: defaults.bundle === "불가" ? "불가(개별계산)" : "가능" });
    if (defaults.jejuMode === "off") add({ key: "delivery_jeju", section: "배송", label: "제주/도서산간 추가배송비 「설정안함」", target: "제주/도서산간 추가배송비", action: "choose", value: "설정안함" });
    if (defaults.jejuMode === "2" || defaults.jejuMode === "3") {
      add({ key: "delivery_jeju", section: "배송", label: `제주/도서산간 추가배송비 ${defaults.jejuMode}권역`, target: "제주/도서산간 추가배송비", action: "choose", value: "설정함" });
      add({ key: "delivery_jeju_zone", section: "배송", label: `배송권역 ${defaults.jejuMode}권역`, target: "배송권역", action: "choose", value: `${defaults.jejuMode}권역` });
      if (defaults.jejuFee == null) errors.push("제주/도서산간 추가배송비를 설정함으로 했는데 금액이 없습니다.");
      else if (defaults.jejuMode === "2") add({ key: "delivery_jeju_fee", section: "배송", label: "제주 및 도서산간 추가배송비", target: "vm.modelData.deliveryFee.deliveryFeeByArea.area2extraFee", action: "type", value: String(defaults.jejuFee) });
      else {
        add({ key: "delivery_jeju_fee", section: "배송", label: "제주 추가배송비", target: "vm.modelData.deliveryFee.deliveryFeeByArea.area2extraFee", action: "type", value: String(defaults.jejuFee) });
        if (defaults.islandFee != null) add({ key: "delivery_island_fee", section: "배송", label: "제주 외 도서산간 추가배송비", target: "vm.modelData.deliveryFee.deliveryFeeByArea.area3extraFee", action: "type", value: String(defaults.islandFee) });
      }
    }
    if (defaults.regionFee) add({ key: "delivery_region", section: "배송", label: "지역별 차등 배송비", target: "vm.modelData.deliveryFee.differentialFeeByArea", action: "type", value: defaults.regionFee });
    if (defaults.installFee) add({ key: "delivery_install", section: "배송", label: `별도 설치비 「${defaults.installFee}」`, target: "별도 설치비", action: "choose", value: defaults.installFee });
  } else {
    warnings.push("배송 템플릿 이름도 배송비 설정도 없습니다. 판매자센터 기본 배송 설정이 그대로 쓰이니 「입력만」으로 확인해 주세요.");
  }
  if (defaults.returnFee != null) add({ key: "return_fee", section: "반품/교환", label: "반품 배송비(편도)", target: "vm.modelData.claimDeliveryInfo.returnDeliveryFee", action: "type", value: String(defaults.returnFee) });
  if (defaults.exchangeFee != null) add({ key: "exchange_fee", section: "반품/교환", label: "교환 배송비(왕복)", target: "vm.modelData.claimDeliveryInfo.exchangeDeliveryFee", action: "type", value: String(defaults.exchangeFee) });

  if (!defaults.asPhone) errors.push("A/S 전화번호가 없습니다. 「스토어 기본값」에서 넣어 주세요.");
  add({ key: "as_phone", section: "A/S", label: "A/S 전화번호", target: "vm.product.detailAttribute.afterServiceInfo.afterServiceTelephoneNumber", action: "type", value: defaults.asPhone, required: true });
  add({ key: "as_guide", section: "A/S", label: "A/S 안내", target: "vm.product.detailAttribute.afterServiceInfo.afterServiceGuideContent", action: "type", value: defaults.asGuide || "상품 상세페이지 참조", required: true });

  add({ key: "seller_code", section: "판매자 코드", label: "판매자 관리 코드", target: "vm.sellerCodeInfo.sellerManagementCode", action: "type", value: managementCode(product.id) });

  if (opts.mode === "register") {
    add({ key: "display", section: "노출 채널", label: defaults.displayOnRegister ? "전시중" : "전시중지(판매대기)", target: "vm.singleChannelProductMap[channelServiceType].channelProductDisplayStatusType", action: "radio", value: defaults.displayOnRegister ? "ON" : "SUSPENSION" });
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
