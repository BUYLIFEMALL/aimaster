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

/** 상세페이지 분석 카테고리(예: 패션잡화 > 남성가방 > 백팩)의 마지막 단계만 검색어로 */
export function lastCategory(c: string | null): string {
  return (c ?? "").split(/[>›/]/).map((s) => s.trim()).filter(Boolean).pop() ?? "";
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
  /** 반품 택배사(반품/교환 칸, 비우면 판매자센터 기본값) */
  returnCompany: string;
  displayOnRegister: boolean;
  /** 어린이제품인증 — 그 칸이 나오는 카테고리에서만 씀. ""=판매자센터 기본값 그대로, not_target=「인증대상 아님」(법적 선택이라 회원이 정함) */
  childCert: "" | "not_target";
  /** 구매/리뷰 혜택(비우면 넣지 않음) — 상품 구매 시 포인트(원), 리뷰 포인트(텍스트·사진/동영상, 원), 복수구매할인(○개 이상 ○원 할인) */
  purchasePoint: number | null;
  reviewText: number | null;
  reviewPhoto: number | null;
  multiQty: number | null;
  multiDiscount: number | null;
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
  returnCompany: "",
  displayOnRegister: false,
  childCert: "",
  purchasePoint: null,
  reviewText: null,
  reviewPhoto: null,
  multiQty: null,
  multiDiscount: null,
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
    returnCompany: str(r.returnCompany, 30),
    displayOnRegister: r.displayOnRegister === true,
    childCert: r.childCert === "not_target" ? "not_target" : "",
    purchasePoint: num(r.purchasePoint, 10, 1_000_000),
    reviewText: num(r.reviewText, 10, 20_000),
    reviewPhoto: num(r.reviewPhoto, 10, 20_000),
    multiQty: num(r.multiQty, 2, 999),
    multiDiscount: num(r.multiDiscount, 10, 10_000_000),
  };
}

export interface ProductSource {
  id: string;
  name: string | null;
  product_label?: string | null;
  price: number | null;
  sale_price: number | null;
  /** 상세페이지 분석 카테고리 경로(예: 패션잡화 > 남성가방 > 백팩) — 카테고리 목록에서 같은 경로 줄을 고르는 데 씀 */
  category?: string | null;
}

/** 확장이 할 수 있는 동작 */
export type StepAction = "type" | "radio" | "check" | "search_pick" | "html" | "images" | "button" | "select" | "template" | "choose" | "extra_images" | "meta" | "options" | "type_label" | "tags" | "attributes" | "custom_options" | "unit_pick" | "supplements" | "preorder" | "brand_input" | "model_text";

/** 동작별로 그 동작을 아는 가장 낮은 확장 버전 — 옛 확장이 모르는 동작을 건너뛰고 저장하지 않도록 서버가 작업을 넘기지 않는다 */
export const ACTION_MIN_EXT: Record<string, string> = { select: "v1.04", template: "v1.04", choose: "v1.06", extra_images: "v1.10", options: "v1.12", type_label: "v1.14", tags: "v1.14", attributes: "v1.14", custom_options: "v1.14", unit_pick: "v1.14", supplements: "v1.14", preorder: "v1.14", brand_input: "v1.15", model_text: "v1.19" };

/** 상품 주요정보(2026-10-27 v1.14) — 상품마다 다르므로 보내기 화면에서 받는다. 칸 이름은 판매자센터 저장본에서 확인 */
export interface MainInfo { brand: string; manufacturer: string; model: string; used: boolean }
export function normalizeMainInfo(raw: Record<string, unknown> | null | undefined): MainInfo {
  const s = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 50) : "");
  return { brand: s(raw?.brand), manufacturer: s(raw?.manufacturer), model: s(raw?.model), used: raw?.used === true || raw?.used === "used" };
}

/** 카테고리별 상품속성 — 「속성이름: 값」 한 줄씩(값 여러 개는 쉼표), 최대 30줄 */
export interface AttrPair { name: string; value: string }
export function normalizeAttributes(raw: unknown): AttrPair[] {
  const lines = Array.isArray(raw) ? raw.map((x) => (x && typeof x === "object" ? `${(x as AttrPair).name}:${(x as AttrPair).value}` : String(x))) : String(raw ?? "").split("\n");
  const out: AttrPair[] = [];
  for (const line of lines) {
    const i = line.search(/[:：]/);
    if (i <= 0) continue;
    const name = line.slice(0, i).trim().slice(0, 40), value = line.slice(i + 1).trim().slice(0, 100);
    if (name && value && !out.some((p) => p.name === name)) out.push({ name, value });
  }
  return out.slice(0, 30);
}

/** 추가상품 — 한 줄에 「추가상품명 | 값1,값2 | 가격1,가격2」, 최대 5줄 */
export interface SuppleGroup { name: string; values: string[]; prices: number[] }
export function normalizeSupplements(raw: unknown): { groups: SuppleGroup[]; errors: string[] } {
  const errors: string[] = [];
  const lines = Array.isArray(raw) ? raw.map((g) => (g && typeof g === "object" ? `${(g as SuppleGroup).name}|${(g as SuppleGroup).values?.join(",")}|${(g as SuppleGroup).prices?.join(",")}` : String(g))) : String(raw ?? "").split("\n");
  const groups: SuppleGroup[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const [n = "", v = "", p = ""] = line.split("|").map((x) => x.trim());
    const name = n.slice(0, 20);
    const values = v.split(",").map((x) => x.trim()).filter(Boolean);
    const prices = p.split(",").map((x) => x.trim()).filter(Boolean).map((x) => Number(x.replace(/[^0-9-]/g, "")));
    if (!name || !values.length) { errors.push(`추가상품 줄 「${line.trim().slice(0, 30)}」에 이름과 값을 넣어 주세요(이름 | 값1,값2 | 가격1,가격2).`); continue; }
    if (prices.length !== values.length || prices.some((x) => !Number.isInteger(x) || x < 0)) { errors.push(`추가상품 「${name}」의 가격 수가 값 수(${values.length}개)와 같아야 합니다.`); continue; }
    if (prices.some((x) => x % 10 !== 0)) { errors.push(`추가상품 「${name}」 가격은 10원 단위로 넣어 주세요.`); continue; }
    groups.push({ name, values, prices });
  }
  if (groups.length > 5) errors.push("추가상품은 5줄까지 넣을 수 있습니다.");
  return { groups: groups.slice(0, 5), errors };
}

/** 예약구매 — 주문기간(YYYY-MM-DD 둘)과 기간 끝난 뒤 상태 */
export interface PreOrder { start: string; end: string; after: "CLOSE" | "SALE" }
export function normalizePreOrder(r: { on?: unknown; start?: unknown; end?: unknown; after?: unknown }): { preOrder: PreOrder | null; error?: string } {
  if (r.on !== "on" && r.on !== true) return { preOrder: null };
  const d = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  const start = d(r.start), end = d(r.end);
  if (!start || !end) return { preOrder: null, error: "예약구매 주문기간(시작일·마감일)을 넣어 주세요." };
  if (end < start) return { preOrder: null, error: "예약구매 마감일이 시작일보다 빠릅니다." };
  return { preOrder: { start, end, after: r.after === "SALE" ? "SALE" : "CLOSE" } };
}

/** 검색설정 태그 — 쉼표·줄바꿈으로 나눠 「#」·공백 정리, 같은 것 한 번, 최대 10개(스마트스토어 한도), 한 개 30자 이내 */
export const TAGS_MAX = 10;
export function normalizeTags(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw.map(String) : String(raw ?? "").split(/[,\n]/);
  return [...new Set(list.map((t) => t.replace(/^#+/, "").replace(/\s+/g, " ").trim().slice(0, 30)).filter(Boolean))].slice(0, TAGS_MAX);
}

/**
 * 칸 목록을 만든 코드의 세대 — 오래 열어 둔 탭은 그 시점 배포의 옛 코드로 작업을 만든다(2026-10-27 실제 사고: 고시 A/S 전화·어린이인증·추가 이미지가 빠진 작업).
 * 칸 구성이 바뀌어 옛 작업을 실행하면 안 될 때 이 숫자를 올린다. 이 표시가 없거나 낮은 작업은 확장에 넘기지 않는다.
 */
export const STEP_BUILDER = 5; // 2: 옵션 단계(v1.12) · 3: 배송 직접 입력 확장(v1.14) · 4: 브랜드·제조사 brand_input · 5: 모델명 model_text(v1.19), 모델명 제외(v1.15)
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
  /** 카테고리 단계만 — 상세페이지 분석 경로(「>」로 잇기) */
  path?: string;
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
  opts: { mode: RegisterMode; categoryKeyword: string; detailImageCount: number; mainImage: boolean; extraImageCount?: number; options?: OptionSpec | null; tags?: string[]; mainInfo?: MainInfo; attributes?: AttrPair[]; customOptions?: string[]; supplements?: SuppleGroup[]; preOrder?: PreOrder | null },
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

  const catPath = (product.category ?? "").split(/[>›]/).map((s) => s.trim()).filter(Boolean).join(">");
  add({ key: "category", section: "카테고리", label: "카테고리", target: "vm.category", action: "search_pick", value: keyword, required: true, ...(catPath ? { path: catPath } : {}) });
  if (opts.preOrder) add({ key: "preorder", section: "예약구매", label: `예약구매 ${opts.preOrder.start} ~ ${opts.preOrder.end}(끝난 뒤 ${opts.preOrder.after === "SALE" ? "판매 중" : "판매종료"})`, target: "예약구매", action: "preorder", value: JSON.stringify(opts.preOrder) });
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
  if (opts.customOptions?.length) add({ key: "custom_options", section: "옵션", label: `직접입력형 옵션 ${opts.customOptions.join("·")}`, target: "직접입력형", action: "custom_options", value: JSON.stringify(opts.customOptions) });
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

  const mi = opts.mainInfo;
  // 브랜드·제조사는 자동완성 상자 아래 숨은 칸(ng-model vm.bindModel)에 넣는다. 모델명은 글자 칸이 없고 「찾기」 창(네이버 카탈로그)에서만 고를 수 있어 자동 입력하지 않는다(2026-10-27 실측).
  if (mi?.brand) add({ key: "brand", section: "상품 주요정보", label: `브랜드 「${mi.brand}」`, target: "brand", action: "brand_input", value: mi.brand });
  if (mi?.manufacturer) add({ key: "manufacturer", section: "상품 주요정보", label: `제조사 「${mi.manufacturer}」`, target: "manufacturer", action: "brand_input", value: mi.manufacturer });
  // 모델명은 「찾기」 창의 「텍스트로 직접입력」으로 넣는다(카탈로그 고르기는 카테고리·속성까지 덮어써 자동화하지 않음) — 2026-10-28 ego lite로 창 구조 확인
  if (mi?.model) add({ key: "model_name", section: "상품 주요정보", label: `모델명 「${mi.model}」`, target: "모델명", action: "model_text", value: mi.model });
  if (mi?.used) add({ key: "sale_type", section: "상품 주요정보", label: "상품상태 「중고상품」", target: "상품상태", action: "choose", value: "중고상품" });
  if (opts.attributes?.length) add({ key: "attributes", section: "상품 주요정보", label: `상품속성 ${opts.attributes.length}개(${opts.attributes.map((p) => p.name).slice(0, 3).join("·")}${opts.attributes.length > 3 ? "…" : ""})`, target: "상품속성", action: "attributes", value: JSON.stringify(opts.attributes) });
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
  if (defaults.returnCompany) add({ key: "return_company", section: "반품/교환", label: `반품 택배사 「${defaults.returnCompany}」`, target: "vm.modelData.claimDeliveryInfo.returnDeliveryCompany.id", action: "select", value: defaults.returnCompany });
  if (defaults.returnFee != null) add({ key: "return_fee", section: "반품/교환", label: "반품 배송비(편도)", target: "vm.modelData.claimDeliveryInfo.returnDeliveryFee", action: "type", value: String(defaults.returnFee) });
  if (defaults.exchangeFee != null) add({ key: "exchange_fee", section: "반품/교환", label: "교환 배송비(왕복)", target: "vm.modelData.claimDeliveryInfo.exchangeDeliveryFee", action: "type", value: String(defaults.exchangeFee) });

  if (!defaults.asPhone) errors.push("A/S 전화번호가 없습니다. 「스토어 기본값」에서 넣어 주세요.");
  add({ key: "as_phone", section: "A/S", label: "A/S 전화번호", target: "vm.product.detailAttribute.afterServiceInfo.afterServiceTelephoneNumber", action: "type", value: defaults.asPhone, required: true });
  add({ key: "as_guide", section: "A/S", label: "A/S 안내", target: "vm.product.detailAttribute.afterServiceInfo.afterServiceGuideContent", action: "type", value: defaults.asGuide || "상품 상세페이지 참조", required: true });

  const tags = normalizeTags(opts.tags ?? []);
  const sup = opts.supplements ?? [];
  if (sup.length) add({ key: "supplements", section: "추가상품", label: `추가상품 ${sup.reduce((n, g) => n + g.values.length, 0)}개(${sup.map((g) => g.name).join("·")})`, target: "추가상품", action: "supplements", value: JSON.stringify(sup) });
  const BEN = "구매/리뷰 혜택";
  if (defaults.purchasePoint != null) {
    add({ key: "point_on", section: BEN, label: "상품 구매 시 포인트 지급", target: "vm.viewData.isUsePurchasePointPolicy", action: "check", value: "true" });
    add({ key: "point_unit", section: BEN, label: "구매 포인트 단위 「원」", target: "PURCHASE_POINT_DISCOUNT_UNIT_TYPE", action: "unit_pick", value: "원" });
    add({ key: "point_value", section: BEN, label: `구매 포인트 ${defaults.purchasePoint.toLocaleString("ko-KR")}원`, target: "vm.product.customerBenefit.purchasePointPolicy.value", action: "type", value: String(defaults.purchasePoint) });
  }
  if (defaults.reviewText != null || defaults.reviewPhoto != null) {
    add({ key: "review_on", section: BEN, label: "상품리뷰 작성 시 포인트 지급", target: "vm.viewData.isUseReviewPointPolicy", action: "check", value: "true" });
    if (defaults.reviewText != null) add({ key: "review_text", section: BEN, label: `텍스트 리뷰 ${defaults.reviewText.toLocaleString("ko-KR")}원`, target: "vm.product.customerBenefit.reviewPointPolicy.textReviewPoint", action: "type", value: String(defaults.reviewText) });
    if (defaults.reviewPhoto != null) add({ key: "review_photo", section: BEN, label: `포토/동영상 리뷰 ${defaults.reviewPhoto.toLocaleString("ko-KR")}원`, target: "vm.product.customerBenefit.reviewPointPolicy.photoVideoReviewPoint", action: "type", value: String(defaults.reviewPhoto) });
  }
  if (defaults.multiQty != null && defaults.multiDiscount != null) {
    add({ key: "multi_on", section: BEN, label: "복수구매할인 설정함", target: "vm.viewData.isUseMultiPurchaseDiscountPolicy", action: "radio", value: "true" });
    add({ key: "multi_qty_unit", section: BEN, label: "복수구매 기준 단위 「개」", target: "MULTI_PUCHASE_ORDER_UNIT_TYPE", action: "unit_pick", value: "개" });
    add({ key: "multi_qty", section: BEN, label: `${defaults.multiQty}개 이상 구매 시`, target: "vm.product.customerBenefit.multiPurchaseDiscountPolicy.orderValue", action: "type", value: String(defaults.multiQty) });
    add({ key: "multi_unit", section: BEN, label: "복수구매 할인 단위 「원」", target: "MULTI_PUCHASE_DISCOUNT_UNIT_TYPE", action: "unit_pick", value: "원" });
    add({ key: "multi_discount", section: BEN, label: `복수구매 ${defaults.multiDiscount.toLocaleString("ko-KR")}원 할인`, target: "vm.product.customerBenefit.multiPurchaseDiscountPolicy.discountMethod.value", action: "type", value: String(defaults.multiDiscount) });
  }
  if (tags.length) add({ key: "tags", section: "검색설정", label: `검색 태그 ${tags.length}개`, target: "vm.directInputTag", action: "tags", value: JSON.stringify(tags) });
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
