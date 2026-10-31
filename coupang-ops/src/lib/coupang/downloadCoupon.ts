// 다운로드 쿠폰(명세 2026-10-31 확인, /ko/api/promotions/downloadable-coupon-*). 외부 호출 없음(tests/downloadCoupon.test.mjs).
// 생성 POST coupons → 옵션 적용 PUT coupon-items(실패하면 쿠폰이 파기됨, 적용 상품은 뒤에 못 바꿈) · 파기 POST coupons/expire · 상태 GET coupons/transactionStatus
const BASE = "/v2/providers/marketplace_openapi/apis/api/v1";
export const DL_CREATE_PATH = `${BASE}/coupons`;
export const DL_ITEMS_PATH = `${BASE}/coupon-items`;
export const DL_EXPIRE_PATH = `${BASE}/coupons/expire`;
export const DL_STATUS_PATH = `${BASE}/coupons/transactionStatus`;
export const MAX_POLICIES = 3;
export const MAX_DL_ITEMS = 100;
const HOUR_MS = 3_600_000;

export type DlPolicy = { title: string; description: string; minimumPrice: number; discount: number; maximumDiscountPrice: number; maximumPerDaily: number };
export type DlDraft = { contractId: number; title: string; typeOfDiscount: "RATE" | "PRICE"; startAt: string; endAt: string; policies: DlPolicy[]; vendorItemIds: number[] };

/** datetime-local 값(한국 시각으로 입력) → 쿠팡 형식 */
export const dlTime = (local: string) => `${local.replace("T", " ").slice(0, 16)}:00`;
const kstLocal = (ms: number) => new Date(ms + 9 * HOUR_MS).toISOString().slice(0, 16);

export function checkDownloadCoupon(d: DlDraft, nowMs = Date.now()): string {
  if (!d.contractId) return "쿠폰 계약을 골라 주세요.";
  if (!d.title.trim() || d.title.length > 45) return "쿠폰 이름은 1~45자로 넣어 주세요. 고객에게 보입니다.";
  if (!d.startAt || !d.endAt) return "시작·종료 시각을 골라 주세요.";
  if (d.startAt < kstLocal(nowMs + HOUR_MS)) return "시작은 지금부터 1시간 뒤로 잡아 주세요(쿠팡 반영 시간).";
  if (d.endAt <= d.startAt) return "종료가 시작보다 빠릅니다.";
  if (!d.policies.length || d.policies.length > MAX_POLICIES) return `할인 정책은 1~${MAX_POLICIES}개입니다.`;
  for (const p of d.policies) {
    if (!p.title.trim()) return "정책 이름을 넣어 주세요. 장바구니에서 고객에게 보입니다.";
    if (!Number.isInteger(p.minimumPrice) || p.minimumPrice <= 0) return "최소 구매금액을 넣어 주세요.";
    if (d.typeOfDiscount === "RATE" && (!Number.isInteger(p.discount) || p.discount < 1 || p.discount > 99)) return "정률 할인은 1~99%입니다.";
    if (d.typeOfDiscount === "RATE" && (!Number.isInteger(p.maximumDiscountPrice) || p.maximumDiscountPrice <= 0)) return "정률 할인은 최대 할인금액이 필요합니다.";
    if (d.typeOfDiscount === "PRICE" && (!Number.isInteger(p.discount) || p.discount <= 0 || p.discount % 10 !== 0)) return "정액 할인은 10원 단위입니다.";
    if (!Number.isInteger(p.maximumPerDaily) || p.maximumPerDaily < 1 || p.maximumPerDaily > 9999) return "1인 1일 발급 개수는 1~9,999개입니다.";
  }
  if (!d.vendorItemIds.length || d.vendorItemIds.length > MAX_DL_ITEMS) return `옵션ID는 1~${MAX_DL_ITEMS}개를 넣어 주세요.`;
  return "";
}

export const dlCreateBody = (d: DlDraft, wingUserId: string) => ({
  title: d.title.trim(),
  contractId: String(d.contractId),
  couponType: "DOWNLOAD",
  startDate: dlTime(d.startAt),
  endDate: dlTime(d.endAt),
  userId: wingUserId,
  policies: d.policies.map((p) => ({
    title: p.title.trim(),
    typeOfDiscount: d.typeOfDiscount,
    description: p.description.trim() || p.title.trim(),
    minimumPrice: p.minimumPrice,
    discount: p.discount,
    maximumDiscountPrice: d.typeOfDiscount === "RATE" ? p.maximumDiscountPrice : p.discount,
    maximumPerDaily: p.maximumPerDaily,
  })),
});

export const dlItemsBody = (couponId: number, wingUserId: string, ids: number[]) => ({ couponItems: [{ couponId: String(couponId), userId: wingUserId, vendorItemIds: ids }] });
export const dlExpireBody = (couponId: number, wingUserId: string) => ({ expireCouponList: [{ couponId: String(couponId), reason: "expired", userId: wingUserId }] });

/** 응답이 객체 또는 한 칸 배열로 온다(명세 예시가 둘 다 있음) */
export function dlResult(raw: unknown): { ok: boolean; couponId: number; transactionId: string; error: string } {
  const r = ((Array.isArray(raw) ? raw[0] : raw) ?? {}) as { requestResultStatus?: unknown; body?: { couponId?: unknown; requestTransactionId?: unknown }; errorMessage?: unknown };
  return { ok: r.requestResultStatus === "SUCCESS", couponId: Number(r.body?.couponId) || 0, transactionId: String(r.body?.requestTransactionId ?? ""), error: String(r.errorMessage ?? "") };
}

export function dlStatus(raw: unknown): { status: string; couponId: number; succeeded: number; failed: number; reasons: string[] } {
  const t = ((raw as { transactionStatusResponse?: unknown })?.transactionStatusResponse ?? {}) as Record<string, unknown>;
  const fails = Array.isArray(t.couponFailedVendorItemIdResponses) ? (t.couponFailedVendorItemIdResponses as { vendorItemId?: unknown; failureReason?: unknown }[]) : [];
  return { status: String(t.status ?? ""), couponId: Number(t.couponId) || 0, succeeded: Number(t.succeeded) || 0, failed: Number(t.failed) || 0, reasons: fails.map((f) => `${f.vendorItemId}: ${f.failureReason}`) };
}

/** 장기 미배송 배송완료(명세 /ko/api/shipments/process-orders-long-past-...): 배송지시 뒤 30일 지난 배송지시·배송중만, 시각에 따라 32일까지 걸릴 수 있음 */
export const longUndeliveryPath = (vendorId: string) => `/v2/providers/openapi/apis/api/v4/vendors/${encodeURIComponent(vendorId)}/completeLongTermUndelivery`;
export const LONG_UNDELIVERY_DAYS = 30;
export function checkLongUndelivery(shipmentBoxId: number, invoice: string): string {
  if (!Number.isSafeInteger(shipmentBoxId) || shipmentBoxId <= 0) return "배송번호를 숫자로 넣어 주세요.";
  if (!invoice.trim()) return "송장번호를 넣어 주세요.";
  return "";
}
