// 쿠폰·포인트(D17·D18) — 주문서 화면 계산. 실제 금액은 DB 함수 mall_builder_place_order_v2(0038)가 같은 규칙으로 다시 계산한다.
// 규칙: 쿠폰은 주문당 1장, 대상 상품 금액에만(배송비 제외), 정률은 최대 할인액까지. 포인트는 (상품 금액 − 쿠폰)의 사용 비율 안에서 사용 단위로.
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

export type CouponDef = {
  id: string;
  name: string;
  discount_type: "amount" | "rate";
  value: number;
  max_discount: number | null;
  min_order: number;
  valid_days: number | null;
  ends_at: string | null;
  target: "all" | "category" | "product";
  target_ids: string[];
  allow_business: boolean;
  issue_mode: "manual" | "download" | "code" | "signup" | "birthday";
  code: string | null;
  is_active: boolean;
  created_at?: string;
};

export type PointSettings = {
  enabled: boolean;
  earn_rate: number;
  min_use: number;
  use_unit: number;
  max_use_rate: number;
  expire_months: number;
  expire_notice: boolean;
};

export const DEFAULT_POINT_SETTINGS: PointSettings = {
  enabled: false,
  earn_rate: 1,
  min_use: 1000,
  use_unit: 100,
  max_use_rate: 100,
  expire_months: 12,
  expire_notice: true,
};

export const ISSUE_MODE_LABEL: Record<CouponDef["issue_mode"], string> = {
  manual: "직접 발급",
  download: "손님이 받기",
  code: "쿠폰 코드",
  signup: "가입 축하(자동)",
  birthday: "생일(자동)",
};

export const POINT_KIND_LABEL: Record<string, string> = { earn: "적립", use: "사용", refund: "돌려줌", expire: "소멸", admin: "운영자" };

/** 주문서 한 줄 — 쿠폰 대상 판단에 상품·카테고리가 필요 */
export type BenefitLine = { productId: string; categoryIds: string[]; lineTotal: number };

export function couponEligible(coupon: Pick<CouponDef, "target" | "target_ids">, line: Pick<BenefitLine, "productId" | "categoryIds">): boolean {
  if (coupon.target === "all") return true;
  if (coupon.target === "product") return coupon.target_ids.includes(line.productId);
  return line.categoryIds.some((c) => coupon.target_ids.includes(c));
}

/** 쿠폰 할인액 — 못 쓰면 { amount: 0, error } */
export function couponDiscount(
  coupon: Pick<CouponDef, "discount_type" | "value" | "max_discount" | "min_order" | "target" | "target_ids" | "allow_business">,
  lines: BenefitLine[],
  isBusiness: boolean,
): { amount: number; eligible: number; error: string | null } {
  if (isBusiness && !coupon.allow_business) return { amount: 0, eligible: 0, error: "사업자 가격과 함께 쓸 수 없는 쿠폰입니다." };
  const eligible = lines.filter((l) => couponEligible(coupon, l)).reduce((s, l) => s + l.lineTotal, 0);
  if (eligible === 0) return { amount: 0, eligible, error: "쿠폰을 쓸 수 있는 상품이 없습니다." };
  if (eligible < coupon.min_order) return { amount: 0, eligible, error: `대상 상품 ${coupon.min_order.toLocaleString("ko-KR")}원 이상 주문 시 사용` };
  const raw = coupon.discount_type === "amount" ? coupon.value : Math.min(Math.floor((eligible * coupon.value) / 100), coupon.max_discount ?? eligible);
  return { amount: Math.min(raw, eligible), eligible, error: null };
}

/** 이번 주문에 쓸 수 있는 최대 포인트(사용 단위로 내림). 못 쓰면 0과 이유 */
export function maxPoints(settings: PointSettings | null, balance: number, productAfterCoupon: number): { max: number; reason: string | null } {
  if (!settings?.enabled) return { max: 0, reason: "이 몰은 포인트를 쓰지 않습니다." };
  if (balance < settings.min_use) return { max: 0, reason: `${settings.min_use.toLocaleString("ko-KR")}점 이상 모이면 쓸 수 있습니다.` };
  const byRate = Math.floor(Math.max(0, productAfterCoupon) * settings.max_use_rate / 100 / settings.use_unit) * settings.use_unit;
  const byBalance = Math.floor(balance / settings.use_unit) * settings.use_unit;
  return { max: Math.max(0, Math.min(byRate, byBalance)), reason: null };
}

/** 입력한 포인트를 규칙에 맞게 고침(음수·단위·최대) */
export function clampPoints(input: number, max: number, unit: number): number {
  if (!Number.isFinite(input) || input <= 0) return 0;
  return Math.min(max, Math.floor(input / unit) * unit);
}

/** 구매 확정 때 적립될 포인트(배송비 제외 결제 금액 × 적립률) */
export function earnPreview(settings: PointSettings | null, gradeRate: number | null, cashTotal: number, shipping: number): number {
  if (!settings?.enabled) return 0;
  const rate = gradeRate ?? settings.earn_rate;
  return Math.floor((Math.max(0, cashTotal - shipping) * rate) / 100);
}

/** 쿠폰 할인 설명(목록용) */
export function couponLabel(c: Pick<CouponDef, "discount_type" | "value" | "max_discount" | "min_order">): string {
  const off = c.discount_type === "amount" ? `${c.value.toLocaleString("ko-KR")}원 할인` : `${c.value}% 할인${c.max_discount ? `(최대 ${c.max_discount.toLocaleString("ko-KR")}원)` : ""}`;
  return c.min_order > 0 ? `${off} · ${c.min_order.toLocaleString("ko-KR")}원 이상` : off;
}

/** 운영자 입력 검사 — 쿠폰 만들기 */
export function validateCouponForm(f: {
  name: string; discount_type: string; value: number; max_discount: number | null; min_order: number;
  valid_days: number | null; ends_at: string | null; target: string; target_ids: string[]; issue_mode: string; code: string | null;
}): string | null {
  if (!f.name.trim() || f.name.trim().length > 40) return "쿠폰 이름을 1~40자로 입력해 주세요.";
  if (f.discount_type !== "amount" && f.discount_type !== "rate") return "할인 방식을 골라 주세요.";
  if (!Number.isInteger(f.value) || f.value <= 0) return "할인 값을 1 이상으로 입력해 주세요.";
  if (f.discount_type === "rate" && f.value > 90) return "할인율은 90%까지 입력할 수 있습니다.";
  if (f.max_discount != null && (!Number.isInteger(f.max_discount) || f.max_discount <= 0)) return "최대 할인액을 다시 입력해 주세요.";
  if (!Number.isInteger(f.min_order) || f.min_order < 0) return "최소 주문 금액을 다시 입력해 주세요.";
  if (f.valid_days != null && (!Number.isInteger(f.valid_days) || f.valid_days < 1 || f.valid_days > 3650)) return "사용 기간(일)은 1~3650일로 입력해 주세요.";
  if (f.ends_at && Number.isNaN(Date.parse(f.ends_at))) return "마감일을 다시 입력해 주세요.";
  if (!["all", "category", "product"].includes(f.target)) return "적용 대상을 골라 주세요.";
  if (f.target !== "all" && (f.target_ids.length < 1 || f.target_ids.length > 200)) return "대상 카테고리·상품을 1개 이상 골라 주세요.";
  if (!["manual", "download", "code", "signup", "birthday"].includes(f.issue_mode)) return "발급 방식을 골라 주세요.";
  if (f.issue_mode === "code" && !/^[A-Z0-9]{4,20}$/.test(f.code ?? "")) return "쿠폰 코드는 영문 대문자·숫자 4~20자로 입력해 주세요.";
  return null;
}

/** 생일(월·일) 입력 → "MM-DD" 또는 null(둘 다 비움). 연도는 받지 않는다 */
export function parseBirthMd(month: unknown, day: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  const m = String(month ?? "").trim();
  const d = String(day ?? "").trim();
  if (!m && !d) return { ok: true, value: null };
  const mi = Number(m);
  const di = Number(d);
  const last = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mi - 1];
  if (!Number.isInteger(mi) || !Number.isInteger(di) || !last || di < 1 || di > last) return { ok: false, error: "생일 월·일을 다시 골라 주세요." };
  return { ok: true, value: `${String(mi).padStart(2, "0")}-${String(di).padStart(2, "0")}` };
}
