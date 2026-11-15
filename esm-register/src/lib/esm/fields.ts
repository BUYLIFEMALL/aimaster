// 상세페이지 상품 + 회원 기본값 → ESM+ 「상품등록 2.0」(https://item.esmplus.com/goods/new) 칸에 넣을 단계 목록.
// 칸 구조는 화면 분석 docs/ESM_FORM_ANALYSIS_20261115.md(2026-11-15 ego 읽기 전용).
// ESM+는 React 앱이라 입력칸 id가 매번 바뀐다 → 확장은 「구역 제목(section) → 칸 이름(target) → 칸·버튼」으로 찾는다.
// 확장은 이 목록을 위에서부터 그대로 실행한다. 순서가 중요하다(카테고리를 먼저 골라야 옵션·인증·고시 칸이 생김).

export type RegisterMode = "fill_only" | "temp_save" | "register";

export const REGISTER_MODES: Record<RegisterMode, { label: string; hint: string }> = {
  fill_only: { label: "입력만", hint: "칸만 채우고 멈춥니다. 「임시저장」「등록하기」는 회원이 직접 누릅니다(기본값)." },
  temp_save: { label: "임시저장까지", hint: "칸을 채운 뒤 ESM+ 「임시저장」을 누릅니다. 실제 상품은 생기지 않습니다." },
  register: { label: "바로 등록", hint: "칸을 채운 뒤 「등록하기」까지 누릅니다. G마켓·옥션에 실제 상품이 생깁니다." },
};

export function toRegisterMode(v: unknown): RegisterMode {
  return v === "temp_save" || v === "register" ? v : "fill_only";
}

/** 상세페이지 분석 카테고리(예: 리빙 > 주방용품 > 텀블러)의 마지막 단계만 검색어로 */
export function lastCategory(c: string | null): string {
  return (c ?? "").split(/[>›/]/).map((s) => s.trim()).filter(Boolean).pop() ?? "";
}

export type Sites = "both" | "gmarket" | "auction";
export type ShipPolicy = "" | "당일발송" | "순차발송" | "요청일 발송" | "주문제작 발송" | "발송일 미정";
export const SHIP_POLICIES: Exclude<ShipPolicy, "">[] = ["당일발송", "순차발송", "요청일 발송", "주문제작 발송", "발송일 미정"];
export type OriginMode = "detail" | "none";

/** 회원 기본값 — ESM+ 「배송정보관리」에 미리 만든 값의 「보이는 이름」을 적어 두면 확장이 그 글자로 고른다(새로 만들지 않음) */
export interface StoreDefaults {
  sites: Sites;
  stock: number;
  vat: "과세상품" | "면세상품";
  /** 판매기간 버튼(""=ESM+ 기본값 그대로) */
  saleDays: "" | "15" | "30" | "60" | "90" | "120";
  /** 상품정보 제공고시 상품군(ESM+ 목록 글자 그대로) */
  noticeGroup: string;
  /** 「'상품 상세설명 참조'로 전체 입력」 */
  noticeReference: boolean;
  /** 인증정보 「인증대상이 아님」(법적 선택 — 회원이 정함) */
  certNotTarget: boolean;
  /** 영업허가증 칸이 생기는 카테고리에서 「허가 대상이 아님」 */
  licenseNotTarget: boolean;
  /** 배송정보 템플릿 이름(있으면 템플릿으로, 없으면 아래 칸을 하나씩) */
  deliveryTemplate: string;
  deliveryCompany: string;
  shipPolicy: ShipPolicy;
  /** 출고지 이름(ESM+ 판매자 주소록) */
  shipOrigin: string;
  bundle: "" | "설정함" | "설정안함(개별배송)";
  /** 배송비 정책 번호(ESM+ 배송정보관리 — 화면의 「(37246700)」 같은 숫자) */
  feePolicyNo: string;
  /** 반품 교환지 이름 */
  returnPlace: string;
  /** 반품/교환 배송비(편도) — null=ESM+ 기본값, 0=무료 */
  returnFee: number | null;
  /** 원산지: detail=「상품 상세설명 참조」, none=「원산지 의무표시 대상 아님」 */
  origin: OriginMode;
  /** 외부제휴채널 상품등록(등록함이면 그 채널 주문에 2% 이용료) — ""=ESM+ 기본값 */
  affiliate: "" | "등록함" | "등록안함";
}

export const EMPTY_DEFAULTS: StoreDefaults = {
  sites: "both",
  stock: 99,
  vat: "과세상품",
  saleDays: "",
  noticeGroup: "기타 재화",
  noticeReference: true,
  certNotTarget: true,
  licenseNotTarget: true,
  deliveryTemplate: "",
  deliveryCompany: "",
  shipPolicy: "",
  shipOrigin: "",
  bundle: "",
  feePolicyNo: "",
  returnPlace: "",
  returnFee: null,
  origin: "detail",
  affiliate: "",
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const num = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(/[,\s원]/g, "")) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list as readonly string[]).includes(String(v)) ? (v as T) : d;

/** 화면·DB에서 온 값을 안전한 기본값 묶음으로 정리(모르는 칸은 버림) */
export function normalizeDefaults(raw: unknown): StoreDefaults {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    sites: pick(r.sites, ["both", "gmarket", "auction"] as const, "both"),
    stock: num(r.stock, 1, 99_999) ?? EMPTY_DEFAULTS.stock,
    vat: pick(r.vat, ["과세상품", "면세상품"] as const, "과세상품"),
    saleDays: pick(r.saleDays, ["", "15", "30", "60", "90", "120"] as const, ""),
    noticeGroup: str(r.noticeGroup, 60) || EMPTY_DEFAULTS.noticeGroup,
    noticeReference: r.noticeReference !== false,
    certNotTarget: r.certNotTarget !== false,
    licenseNotTarget: r.licenseNotTarget !== false,
    deliveryTemplate: str(r.deliveryTemplate, 60),
    deliveryCompany: str(r.deliveryCompany, 30),
    shipPolicy: pick(r.shipPolicy, ["", ...SHIP_POLICIES] as const, ""),
    shipOrigin: str(r.shipOrigin, 40),
    bundle: pick(r.bundle, ["", "설정함", "설정안함(개별배송)"] as const, ""),
    feePolicyNo: str(r.feePolicyNo, 20).replace(/[^0-9]/g, ""),
    returnPlace: str(r.returnPlace, 40),
    returnFee: num(r.returnFee, 0, 1_000_000),
    origin: r.origin === "none" ? "none" : "detail",
    affiliate: pick(r.affiliate, ["", "등록함", "등록안함"] as const, ""),
  };
}

export interface ProductSource {
  id: string;
  name: string | null;
  product_label?: string | null;
  price: number | null;
  sale_price: number | null;
  /** 상세페이지 분석 카테고리 경로 — 카테고리 검색 결과에서 같은 경로 줄을 고르는 데 씀 */
  category?: string | null;
}

/** 단독형 옵션 하나(옵션명 + 값들) — 2차에서 조합형·추가금 */
export interface SimpleOption { name: string; values: string[] }
export function normalizeOption(raw: { name?: unknown; values?: unknown } | null | undefined): { option: SimpleOption | null; error?: string } {
  const name = str(raw?.name, 25);
  const list = Array.isArray(raw?.values) ? raw!.values.map(String) : String(raw?.values ?? "").split(",");
  const values = [...new Set(list.map((v) => v.replace(/\s+/g, " ").trim().slice(0, 25)).filter(Boolean))];
  if (!name && !values.length) return { option: null };
  if (!name) return { option: null, error: "옵션명을 넣어 주세요(예: 색상)." };
  if (values.length < 2) return { option: null, error: "옵션값은 쉼표로 2개 이상 넣어 주세요(예: 블랙, 화이트)." };
  if (values.length > 50) return { option: null, error: "옵션값은 50개까지 넣을 수 있습니다." };
  return { option: { name, values } };
}

/** 확장이 할 수 있는 동작 */
export type StepAction =
  | "sites"          // 판매사이트 체크(G마켓·옥션)
  | "type"           // 구역 안 칸 이름(target)의 글 칸에 값
  | "category"       // 카테고리 검색칸에 검색어 → 결과 목록에서 경로가 가장 길게 겹치는 줄
  | "choose"         // 구역 안 칸 이름(target) 줄의 버튼·라디오 중 글자(value)가 같은 것
  | "list_pick"      // 구역 안 칸 이름(target)의 고르기 버튼을 열고 목록(role=option)에서 글자(value) 포함 줄
  | "images"         // 상품이미지 파일 칸에 대표+추가 사진(value=장수)
  | "detail_images"  // 상세설명 「이미지 업로드」 탭에 섹션 사진 순서대로(value=장수)
  | "option_simple"  // 옵션 선택형 설정함 → 직접 입력·단독형 → 옵션명·값 → 옵션 목록으로 적용
  | "notice_fill"    // 고시 「'상품 상세설명 참조'로 전체 입력」
  | "submit";        // 임시저장 / 등록하기

/** 동작별 최소 확장 버전 — 옛 확장이 모르는 동작이 든 작업은 넘기지 않는다 */
export const ACTION_MIN_EXT: Record<string, string> = {};

export interface FillStep {
  key: string;
  /** 구역 제목(ESM+ h2/h3 글자에서 「필수」「도움말」을 뺀 것) */
  section: string;
  /** 화면·기록에 보이는 이름 */
  label: string;
  /** 구역 안에서 칸을 찾는 이름 글자 */
  target: string;
  action: StepAction;
  value: string;
  required: boolean;
  /** 카테고리 단계만 — 상세페이지 분석 경로(「>」로 잇기) */
  path?: string;
}

export interface BuildResult { steps: FillStep[]; errors: string[]; warnings: string[] }

/** 상품명 한도 — ESM+ 「최대 한글 50자, 영문/숫자 100자(프로모션 문구 포함)」: 한글 2·그 밖 1로 세어 100 */
export function nameUnits(name: string): number {
  let n = 0;
  for (const ch of name) n += /[ㄱ-힝]/.test(ch) ? 2 : 1;
  return n;
}
export const NAME_UNITS_MAX = 100;

/** ESM+ 상품이미지 최대 장수(대표 포함) */
export const IMAGES_MAX = 15;

/** 판매자 관리코드 — 결과 대조·같은 상품 두 번 올리기 알아보기 */
export function managementCode(productId: string): string {
  return `AIM-${productId.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

/** 칸 목록 세대 — 칸 구성이 바뀌어 옛 작업을 실행하면 안 될 때 올린다(오래 열어 둔 탭이 만든 작업 막기) */
export const STEP_BUILDER = 1;
const BUILDER_KEY = "_builder";
export function withBuilderMark(steps: FillStep[]): FillStep[] {
  return [...steps, { key: BUILDER_KEY, section: "", label: "", target: "", action: "type", value: String(STEP_BUILDER), required: false }];
}
export function isCurrentBuild(steps: { key: string; value?: string }[]): boolean {
  return steps.some((s) => s.key === BUILDER_KEY && Number(s.value) >= STEP_BUILDER);
}
export function withoutBuilderMark<T extends { key: string }>(steps: T[]): T[] {
  return steps.filter((s) => s.key !== BUILDER_KEY);
}

/** "v1.04" → 104, 형식이 틀리면 0 */
export function extVersionNumber(v: string | null | undefined): number {
  const m = /^v?(\d+)\.(\d{2})$/.exec((v ?? "").trim());
  return m ? Number(m[1]) * 100 + Number(m[2]) : 0;
}
export function extMinVersion(steps: { action: string }[]): string | null {
  let best: string | null = null;
  for (const s of steps) { const v = ACTION_MIN_EXT[s.action]; if (v && (!best || extVersionNumber(v) > extVersionNumber(best))) best = v; }
  return best;
}
export function extCanRun(steps: { action: string }[], extVersion: string | null | undefined): boolean {
  const need = extMinVersion(steps);
  return !need || extVersionNumber(extVersion) >= extVersionNumber(need);
}

export function buildFillSteps(
  product: ProductSource,
  d: StoreDefaults,
  opts: { mode: RegisterMode; categoryKeyword: string; detailImageCount: number; mainImage: boolean; extraImageCount?: number; option?: SimpleOption | null; brand?: string },
): BuildResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: FillStep[] = [];
  const add = (s: Omit<FillStep, "required"> & { required?: boolean }) => steps.push({ required: false, ...s });

  const name = (product.name || product.product_label || "").replace(/\s+/g, " ").trim();
  if (!name) errors.push("상품명이 비어 있습니다. 상세페이지 자동화에서 상품명을 넣어 주세요.");
  else if (nameUnits(name) > NAME_UNITS_MAX) errors.push(`상품명이 깁니다. ESM+는 한글 50자(영문·숫자 100자)까지입니다.`);

  const price = product.price;
  const sale = product.sale_price;
  // ESM+ 판매가는 실제 파는 값 — 할인가가 있으면 할인가를 판매가로(할인 설정은 쓰지 않음)
  const sellPrice = sale != null && sale > 0 && price != null && sale < price ? sale : price;
  if (sellPrice == null || !Number.isInteger(sellPrice) || sellPrice < 10) errors.push("판매가가 없거나 10원보다 작습니다.");
  else if (sellPrice % 10 !== 0) errors.push("판매가는 10원 단위로 넣어 주세요(ESM 규칙).");

  const keyword = opts.categoryKeyword.trim();
  if (!keyword) errors.push("카테고리 검색어를 넣어 주세요(예: 텀블러). 검색 결과에서 확장이 고릅니다.");
  if (!opts.mainImage) errors.push("대표 이미지가 없습니다. 상세페이지 자동화에서 대표 사진을 올려 주세요.");
  if (opts.detailImageCount === 0) errors.push("완성된 섹션 이미지가 없어 상세설명이 비게 됩니다(ESM+ 필수).");

  const siteLabel = d.sites === "gmarket" ? "G마켓" : d.sites === "auction" ? "옥션" : "G마켓·옥션";
  add({ key: "sites", section: "판매사이트", label: `판매사이트 ${siteLabel}`, target: "판매사이트", action: "sites", value: d.sites, required: true });
  add({ key: "name", section: "상품명", label: "상품명", target: "상품명", action: "type", value: name, required: true });
  add({ key: "seller_code", section: "상품명", label: "판매자 관리코드", target: "판매자 관리코드", action: "type", value: managementCode(product.id) });

  // 카테고리 먼저 — 고르면 옵션·인증·고시 칸이 생긴다
  const catPath = (product.category ?? "").split(/[>›]/).map((s) => s.trim()).filter(Boolean).join(">");
  add({ key: "category", section: "카테고리", label: "카테고리", target: "카테고리", action: "category", value: keyword, required: true, ...(catPath ? { path: catPath } : {}) });

  add({ key: "price", section: "판매가", label: "판매가", target: "판매가", action: "type", value: sellPrice != null ? String(sellPrice) : "", required: true });
  add({ key: "discount", section: "판매가", label: "할인 설정안함", target: "할인", action: "choose", value: "설정안함" });
  if (d.saleDays) {
    add({ key: "sale_period", section: "판매가", label: "판매기간 설정함", target: "판매기간", action: "choose", value: "설정함" });
    add({ key: "sale_days", section: "판매가", label: `판매기간 ${d.saleDays}일`, target: "기간설정", action: "choose", value: `${d.saleDays}일` });
  }
  add({ key: "vat", section: "판매가", label: `부가세 「${d.vat}」`, target: "부가세", action: "choose", value: d.vat });
  add({ key: "star", section: "스타배송", label: "스타배송 사용안함", target: "스타배송", action: "choose", value: "사용안함" });
  if (d.sites !== "auction") add({ key: "stock_g", section: "재고수량", label: "G마켓 재고", target: "G마켓", action: "type", value: String(d.stock) });
  if (d.sites !== "gmarket") add({ key: "stock_a", section: "재고수량", label: "옥션 재고", target: "A옥션", action: "type", value: String(d.stock) });

  if (opts.option) add({ key: "option", section: "옵션", label: `옵션 「${opts.option.name}」 ${opts.option.values.length}개`, target: "선택형", action: "option_simple", value: JSON.stringify(opts.option) });
  else add({ key: "option_off", section: "옵션", label: "옵션 선택형 설정안함", target: "선택형", action: "choose", value: "설정안함" });

  const extra = Math.min(IMAGES_MAX - 1, Math.max(0, Math.floor(opts.extraImageCount ?? 0)));
  add({ key: "images", section: "상품이미지", label: `상품이미지 ${1 + extra}장(대표 1·추가 ${extra})`, target: "상품이미지", action: "images", value: String(1 + extra), required: true });
  add({ key: "detail", section: "상품 상세설명", label: `상세설명 섹션 이미지 ${opts.detailImageCount}장(이미지 업로드)`, target: "이미지 업로드", action: "detail_images", value: String(opts.detailImageCount), required: true });

  if (opts.brand) add({ key: "brand", section: "상품 주요정보", label: `브랜드 「${opts.brand}」`, target: "브랜드 및 제조사", action: "type", value: opts.brand });
  else add({ key: "brand_none", section: "상품 주요정보", label: "브랜드 없음", target: "브랜드 없음", action: "choose", value: "브랜드 없음" });

  if (d.certNotTarget) add({ key: "cert", section: "인증정보", label: "인증정보 「인증대상이 아님」", target: "G마켓 인증정보", action: "choose", value: "인증대상이 아님" });
  else warnings.push("인증정보는 기본값이 「직접」이라 ESM+ 화면에서 확인해 주세요(「입력만」 권장).");
  if (d.licenseNotTarget) add({ key: "license", section: "인증정보", label: "영업허가증 「허가 대상이 아님」(칸이 있을 때만)", target: "G마켓 영업허가증", action: "choose", value: "허가 대상이 아님" });

  add({ key: "notice_group", section: "상품정보 제공고시", label: `고시 상품군 「${d.noticeGroup}」`, target: "상품군", action: "list_pick", value: d.noticeGroup, required: true });
  if (d.noticeReference) add({ key: "notice_ref", section: "상품정보 제공고시", label: "고시 「상품 상세설명 참조」로 전체 입력", target: "상품 상세설명 참조", action: "notice_fill", value: "true", required: true });

  if (d.deliveryTemplate) {
    add({ key: "delivery_tpl", section: "배송", label: `배송정보 템플릿 「${d.deliveryTemplate}」`, target: "배송정보 템플릿", action: "list_pick", value: d.deliveryTemplate, required: true });
  } else {
    add({ key: "delivery_method", section: "배송", label: "배송방법 「택배,소포,등기」", target: "배송방법 선택", action: "choose", value: "택배,소포,등기" });
    if (d.deliveryCompany) add({ key: "delivery_company", section: "배송", label: `택배사 「${d.deliveryCompany}」`, target: "택배사", action: "list_pick", value: d.deliveryCompany });
    if (d.shipPolicy) add({ key: "ship_policy", section: "배송", label: `발송정책 「${d.shipPolicy}」`, target: "발송정책", action: "choose", value: d.shipPolicy });
    if (d.shipOrigin) add({ key: "ship_origin", section: "배송", label: `출고지 「${d.shipOrigin}」`, target: "출고지", action: "list_pick", value: d.shipOrigin });
    if (d.bundle) add({ key: "bundle", section: "배송", label: `묶음배송 「${d.bundle}」`, target: "묶음배송", action: "choose", value: d.bundle });
    if (d.feePolicyNo) add({ key: "fee_policy", section: "배송", label: `배송비 정책 ${d.feePolicyNo}`, target: "배송비 선택", action: "list_pick", value: d.feePolicyNo });
    if (!d.deliveryCompany && !d.feePolicyNo) warnings.push("배송 템플릿도 택배사·배송비 정책도 없습니다. ESM+ 기본 배송 설정이 쓰이니 「입력만」으로 확인해 주세요.");
  }
  if (d.returnPlace) add({ key: "return_place", section: "반품/교환", label: `반품 교환지 「${d.returnPlace}」`, target: "반품 교환지", action: "list_pick", value: d.returnPlace });
  if (d.returnFee != null) {
    add({ key: "return_fee_type", section: "반품/교환", label: d.returnFee === 0 ? "반품/교환 배송비 무료" : "반품/교환 배송비 유료", target: "반품/교환 배송비(편도)", action: "choose", value: d.returnFee === 0 ? "무료" : "유료" });
    if (d.returnFee > 0) add({ key: "return_fee", section: "반품/교환", label: `반품/교환 배송비 ${d.returnFee.toLocaleString("ko-KR")}원`, target: "반품/교환 배송비(편도)", action: "type", value: String(d.returnFee) });
  }

  add({ key: "origin", section: "상품 추가 정보", label: d.origin === "none" ? "원산지 「의무표시 대상 아님」" : "원산지 「상품 상세설명 참조」", target: "원산지 구분", action: "choose", value: d.origin === "none" ? "원산지 의무표시 대상 아님" : "상품 상세설명 참조" });
  if (d.affiliate) add({ key: "affiliate", section: "노출 채널", label: `외부제휴채널 「${d.affiliate}」`, target: "외부제휴채널", action: "choose", value: d.affiliate });

  if (opts.mode === "register") add({ key: "submit", section: "", label: "등록하기", target: "등록하기", action: "submit", value: "register" });
  else if (opts.mode === "temp_save") add({ key: "submit", section: "", label: "임시저장", target: "임시저장", action: "submit", value: "temp_save" });

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
