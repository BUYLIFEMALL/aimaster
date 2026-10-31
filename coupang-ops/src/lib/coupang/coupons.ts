// 즉시할인 쿠폰(묶음 5). 경로·정리·검사만 — 외부 호출 없음(tests/coupons.test.mjs).
// 명세(2026-10-31 확인, /ko/api/promotions/instant-discount-coupon-*): 계약 GET fms v2 contract/list · 예산 GET fms v1 budgets · 생성 POST fms v2 coupon(비동기 requestedId, 시작은 다음날 0시부터)
//   옵션 추가 POST fms v1 coupons/{id}/items(적용 상품은 삭제 불가) · 요청 상태 GET fms v1 requested/{id} · 목록 GET fms v2 coupons · 파기 PUT fms v1 coupons/{id}?action=expire

const V1 = "/v2/providers/fms/apis/api/v1/vendors";
const V2 = "/v2/providers/fms/apis/api/v2/vendors";
export const contractsPath = (v: string) => `${V2}/${v}/contract/list`;
export const budgetPath = (v: string) => `${V1}/${v}/budgets`;
export const createPath = (v: string) => `${V2}/${v}/coupon`;
export const itemsPath = (v: string, couponId: number) => `${V1}/${v}/coupons/${couponId}/items`;
export const requestedPath = (v: string, requestedId: string) => `${V1}/${v}/requested/${encodeURIComponent(requestedId)}`;
export const listPath = (v: string) => `${V2}/${v}/coupons`;
export const expirePath = (v: string, couponId: number) => `${V1}/${v}/coupons/${couponId}`;

export const COUPON_TYPES = [
  { value: "RATE", label: "정률(%)" },
  { value: "PRICE", label: "정액(원)" },
  { value: "FIXED_WITH_QUANTITY", label: "수량별 정액(원)" },
];
export const COUPON_STATUSES = [
  { value: "APPLIED", label: "적용중" },
  { value: "STANDBY", label: "대기중" },
  { value: "PAUSED", label: "일시중지" },
  { value: "EXPIRED", label: "기간 만료" },
  { value: "DETACHED", label: "파기" },
];
export const COUPON_READ_GAP_SECONDS = 10;
export const MAX_COUPON_ITEMS = 100;

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const text = (v: unknown) => (v == null ? "" : String(v)).trim();
const content = (raw: unknown): Record<string, unknown>[] => {
  const d = (raw as { data?: unknown })?.data as { content?: unknown } | unknown[] | undefined;
  if (Array.isArray(d)) return d as Record<string, unknown>[];
  return Array.isArray(d?.content) ? (d.content as Record<string, unknown>[]) : [];
};

export type Contract = { contractId: number; start: string; end: string; type: string; useBudget: boolean; sellerShareRatio: number };
export type Coupon = { couponId: number; name: string; status: string; type: string; discount: number; maxDiscountPrice: number; startAt: string; endAt: string };
export type CouponDraft = { contractId: number; name: string; type: string; discount: number; maxDiscountPrice: number; startDate: string; endDate: string };
export type RequestState = { status: string; couponId: number; succeeded: number; failed: number; failedItems: string };

export const normalizeContracts = (raw: unknown): Contract[] =>
  content(raw).map((c) => ({ contractId: num(c.contractId), start: text(c.start), end: text(c.end), type: text(c.type), useBudget: c.useBudget === true, sellerShareRatio: num(c.sellerShareRatio) })).filter((c) => c.contractId > 0);

export const normalizeCoupons = (raw: unknown): Coupon[] =>
  content(raw).map((c) => ({ couponId: num(c.couponId), name: text(c.promotionName ?? c.name), status: text(c.status), type: text(c.type), discount: num(c.discount), maxDiscountPrice: num(c.maxDiscountPrice), startAt: text(c.startAt), endAt: text(c.endAt) })).filter((c) => c.couponId > 0);

export function normalizeBudget(raw: unknown): { total: number; used: number } | null {
  const d = (raw as { data?: unknown })?.data as Record<string, unknown> | undefined;
  const row = content(raw)[0] ?? d;
  if (!row || row.totalBudgetAmount === undefined) return null;
  return { total: num(row.totalBudgetAmount), used: num(row.usedBudgetAmount) };
}

export function requestedIdOf(raw: unknown): string {
  const d = (raw as { data?: { requestedId?: unknown; content?: { requestedId?: unknown } } })?.data;
  return text(d?.content?.requestedId ?? d?.requestedId);
}

export function normalizeRequest(raw: unknown): RequestState {
  const d = (raw as { data?: { content?: unknown } })?.data;
  const c = (d?.content ?? d ?? {}) as Record<string, unknown>;
  const failedItems = c.failedVendorItems == null ? "" : JSON.stringify(c.failedVendorItems).slice(0, 300);
  return { status: text(c.status), couponId: num(c.couponId), succeeded: num(c.succeeded), failed: num(c.failed), failedItems: failedItems === "[]" ? "" : failedItems };
}

/** 쿠팡 제약: 시작은 다음날 0시부터. 오늘 날짜는 호출부가 한국 시간으로 넘긴다 */
export function checkCoupon(d: CouponDraft, today: string, contract?: Contract): string {
  if (!d.contractId || !contract) return "쿠폰 계약을 골라 주세요.";
  const name = d.name.trim();
  if (!name || name.length > 45) return "쿠폰 이름은 1~45자로 넣어 주세요.";
  if (!COUPON_TYPES.some((t) => t.value === d.type)) return "할인 방식을 골라 주세요.";
  if (!Number.isInteger(d.discount) || d.discount <= 0) return "할인값을 1 이상 정수로 넣어 주세요.";
  if (d.type === "RATE" && d.discount > 99) return "정률 할인은 99%까지입니다.";
  if (!Number.isInteger(d.maxDiscountPrice) || d.maxDiscountPrice < 10) return "최대 할인금액은 10원 이상으로 넣어 주세요.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(d.endDate)) return "시작일과 종료일을 골라 주세요.";
  if (d.startDate <= today) return "시작일은 내일부터 고를 수 있습니다.";
  if (d.endDate < d.startDate) return "종료일이 시작일보다 빠릅니다.";
  if (contract.start && d.startDate < contract.start.slice(0, 10)) return "시작일이 계약 기간보다 빠릅니다.";
  if (contract.end && d.endDate > contract.end.slice(0, 10)) return "종료일이 계약 기간을 넘습니다.";
  return "";
}

export const couponBody = (d: CouponDraft) => ({
  contractId: d.contractId,
  name: d.name.trim(),
  maxDiscountPrice: d.maxDiscountPrice,
  discount: d.discount,
  startAt: `${d.startDate} 00:00:00`,
  endAt: `${d.endDate} 23:59:59`,
  type: d.type,
  wowExclusive: "false",
});

export const parseVendorItemIds = (raw: string) => [...new Set(raw.split(/[\s,]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
