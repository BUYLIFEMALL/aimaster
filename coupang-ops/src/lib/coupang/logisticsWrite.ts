// 출고지·반품지 생성·수정, 회수 송장, 반품 철회 이력(명세 2026-10-31 확인, /ko/api/logistics/*·/ko/api/returns/*). 외부 호출 없음(tests/logisticsWrite.test.mjs).
// ⚠ 출고지 수정은 도서산간(remoteInfos)을 보내지 않는다: 조회 응답에 remoteInfoId가 비어 수정이 불가했다(2026-10-29 실측). 추가배송비 변경은 WING에서.
const V5 = (vendorId: string) => `/v2/providers/openapi/apis/api/v5/vendors/${encodeURIComponent(vendorId)}`;
const V4 = (vendorId: string) => `/v2/providers/openapi/apis/api/v4/vendors/${encodeURIComponent(vendorId)}`;
export const outboundCreatePath = (v: string) => `${V5(v)}/outboundShippingCenters`;
export const outboundUpdatePath = (v: string, code: string) => `${V5(v)}/outboundShippingCenters/${encodeURIComponent(code)}`;
export const returnCreatePath = (v: string) => `${V5(v)}/returnShippingCenters`;
export const returnUpdatePath = (v: string, code: string) => `${V5(v)}/returnShippingCenters/${encodeURIComponent(code)}`;
export const pickupInvoicePath = (v: string) => `${V4(v)}/return-exchange-invoices/manual`;
export const withdrawalsPath = (v: string) => `${V4(v)}/returnWithdrawRequests`;

/** 반품지에 등록할 수 있는 택배사(명세 표) */
export const RETURN_COURIERS = [
  { code: "CJGLS", name: "CJ대한통운" },
  { code: "HANJIN", name: "한진택배" },
  { code: "HYUNDAI", name: "롯데택배" },
  { code: "KGB", name: "로젠택배" },
  { code: "EPOST", name: "우체국" },
  { code: "ILYANG", name: "일양택배" },
];

export type PlaceForm = { name: string; phone: string; zip: string; address: string; addressDetail: string };
export type RemoteFee = { courier: string; jeju: number; notJeju: number };

export function checkPlace(f: PlaceForm): string {
  if (!f.name.trim() || f.name.trim().length > 50) return "이름은 1~50자로 넣어 주세요.";
  if (!/^\d{2,4}-\d{3,4}-\d{4}$/.test(f.phone.trim())) return "전화번호는 02-1234-5678처럼 넣어 주세요.";
  if (!/^\d{5,6}$/.test(f.zip.trim())) return "우편번호는 숫자 5~6자리입니다.";
  if (!f.address.trim() || f.address.length > 150) return "주소를 150자 안으로 넣어 주세요.";
  if (f.addressDetail.length > 200) return "상세주소는 200자까지입니다.";
  return "";
}

const address = (f: PlaceForm) => ({ addressType: "JIBUN", countryCode: "KR", companyContactNumber: f.phone.trim(), phoneNumber2: "", returnZipCode: f.zip.trim(), returnAddress: f.address.trim(), returnAddressDetail: f.addressDetail.trim() });

/** 도서산간 배송비: 0원 또는 1,000~8,000원(100원 단위), 우체국은 0원 또는 100~400원 */
export function checkRemote(r: RemoteFee): string {
  if (!r.courier) return "도서산간 택배사를 골라 주세요.";
  const [min, max] = r.courier === "EPOST" ? [100, 400] : [1000, 8000];
  for (const v of [r.jeju, r.notJeju]) {
    if (!Number.isInteger(v) || v % 100 !== 0 || (v !== 0 && (v < min || v > max))) return `도서산간 배송비는 0원 또는 ${min.toLocaleString()}~${max.toLocaleString()}원(100원 단위)입니다.`;
  }
  return "";
}

export const outboundCreateBody = (vendorId: string, userId: string, f: PlaceForm, remote: RemoteFee) => ({
  vendorId,
  userId,
  shippingPlaceName: f.name.trim(),
  global: "false",
  usable: "true",
  placeAddresses: [address(f)],
  remoteInfos: [{ deliveryCode: remote.courier, jeju: String(remote.jeju), notJeju: String(remote.notJeju) }],
});

export const outboundUpdateBody = (vendorId: string, userId: string, code: string, f: PlaceForm) => ({
  vendorId,
  userId,
  outboundShippingPlaceCode: Number(code),
  shippingPlaceName: f.name.trim(),
  usable: true,
  placeAddresses: [address(f)],
});

export type ReturnContract = { courier: string; contractNumber: string; contractCustomerNumber: string; fee: number };

export function checkReturnContract(c: ReturnContract, required: boolean): string {
  if (!RETURN_COURIERS.some((x) => x.code === c.courier)) return "반품지 택배사를 골라 주세요.";
  if (required && !c.contractNumber.trim()) return "택배사 계약코드를 넣어 주세요. 계약이 없으면 반품지 없이도 상품을 등록할 수 있습니다.";
  if (c.courier === "EPOST" && required && !c.contractCustomerNumber.trim()) return "우체국은 업체코드가 필요합니다.";
  if (!Number.isInteger(c.fee) || c.fee <= 0) return "계약 요금을 1원 이상으로 넣어 주세요. 고객에게 받는 금액이 아니라 택배사와 계약한 금액입니다.";
  return "";
}

const WEIGHTS = ["05kg", "10kg", "20kg"];
const KINDS = ["vendorCreditFee", "vendorCashFee", "consumerCashFee", "returnFee"];
const goodsflow = (c: ReturnContract) => ({
  deliverCode: c.courier,
  ...(c.contractNumber.trim() ? { contractNumber: c.contractNumber.trim() } : {}),
  contractCustomerNumber: c.contractCustomerNumber.trim(),
  // 무게·요금 칸이 12개라 화면에서는 한 값으로 받는다. 무게별로 다르면 WING에서 고친다
  ...Object.fromEntries(KINDS.flatMap((k) => WEIGHTS.map((w) => [`${k}${w}`, String(c.fee)]))),
});

export const returnCreateBody = (vendorId: string, userId: string, f: PlaceForm, c: ReturnContract) => ({ vendorId, userId, shippingPlaceName: f.name.trim(), goodsflowInfoOpenApiDto: goodsflow(c), placeAddresses: [address(f)] });
export const returnUpdateBody = (vendorId: string, userId: string, code: string, f: PlaceForm, c: ReturnContract) => ({ vendorId, userId, returnCenterCode: code, shippingPlaceName: f.name.trim(), usable: "true", goodsflowInfoOpenApiDto: goodsflow(c), placeAddresses: [address(f)] });

/** 물류 쓰기 응답: data.resultCode SUCCESS/FAIL, resultMessage에 새 코드 */
export function placeResult(raw: unknown): { ok: boolean; message: string } {
  const d = ((raw as { data?: { resultCode?: unknown; resultMessage?: unknown } })?.data ?? {}) as { resultCode?: unknown; resultMessage?: unknown };
  return { ok: String(d.resultCode ?? "").toUpperCase() === "SUCCESS", message: String(d.resultMessage ?? "") };
}

// 회수 송장: 반품은 RETURNS_UNCHECKED, 교환은 회수 상태 BeforeDirection일 때만. 굿스플로 자동 연동을 쓰면 필요 없다
export const PICKUP_RETURN_STATUS = "RETURNS_UNCHECKED";
export const PICKUP_EXCHANGE_COLLECT = "BeforeDirection";
export const pickupBody = (type: "RETURN" | "EXCHANGE", receiptId: number, courier: string, invoice: string, regNumber: string) => ({
  returnExchangeDeliveryType: type,
  receiptId,
  deliveryCompanyCode: courier,
  invoiceNumber: invoice,
  ...(regNumber.trim() ? { regNumber: regNumber.trim() } : {}),
});

// 반품 철회 이력: 최대 7일(시작·종료일 포함)
const DUTY: Record<string, string> = { COM: "판매자", CUS: "고객", COU: "쿠팡" };
const kstDay = (nowMs: number, back: number) => new Date(nowMs + 9 * 3_600_000 - back * 86_400_000).toISOString().slice(0, 10);
export const withdrawalsQuery = (nowMs: number) => `dateFrom=${kstDay(nowMs, 6)}&dateTo=${kstDay(nowMs, 0)}&pageIndex=1&sizePerPage=100`;
export type Withdrawal = { cancelId: number; orderId: number; dutyLabel: string; createdAt: string; vendorItemIds: number[] };
export const normalizeWithdrawals = (raw: unknown): Withdrawal[] =>
  (Array.isArray((raw as { data?: unknown })?.data) ? (raw as { data: Record<string, unknown>[] }).data : []).map((x) => ({
    cancelId: Number(x.cancelId) || 0,
    orderId: Number(x.orderId) || 0,
    dutyLabel: DUTY[String(x.refundDeliveryDuty ?? "")] ?? String(x.refundDeliveryDuty ?? ""),
    createdAt: String(x.createdAt ?? ""),
    vendorItemIds: Array.isArray(x.vendorItemIds) ? x.vendorItemIds.map(Number) : [],
  }));

// 즉시할인 쿠폰 적용 옵션(명세 instant-discount-coupon-query-a-list-of-items-status)
export const couponItemsPath = (v: string, couponId: number) => `/v2/providers/fms/apis/api/v1/vendors/${encodeURIComponent(v)}/coupons/${couponId}/items`;
export const COUPON_ITEM_STATUSES = ["STANDBY", "APPLIED", "PAUSED", "EXPIRED"];
export const normalizeCouponItems = (raw: unknown): { vendorItemIds: number[]; total: number } => {
  const d = ((raw as { data?: { content?: unknown; pagination?: { totalElements?: unknown } } })?.data ?? {}) as { content?: unknown; pagination?: { totalElements?: unknown } };
  const ids = (Array.isArray(d.content) ? d.content : []).map((x: { vendorItemId?: unknown }) => Number(x.vendorItemId)).filter((n) => n > 0);
  return { vendorItemIds: ids, total: Number(d.pagination?.totalElements) || ids.length };
};
