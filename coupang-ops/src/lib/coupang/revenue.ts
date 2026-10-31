// 매출·정산(C5-1). 경로·정리·계산만 — 외부 호출 없음(tests/revenue.test.mjs).
// 명세 2026-10-31 확인: 매출내역 GET v1 revenue-history(vendorId, recognitionDateFrom/To 최대 한 달·전일까지, token 필수(첫 쪽은 빈 값), maxPerPage 최대 50)
//   06-27~07-27(차이 30일)은 거절된다고 명세 오류 예시에 있어 차이 29일까지만 보낸다.
// 지급내역 GET marketplace_openapi v1 settlement-histories(revenueRecognitionYearMonth=YYYY-MM). 예금주·계좌 칸은 읽지 않는다.
// 금액은 서버에 저장하지 않는다. 원가는 회원 브라우저에만 둔다.

export const REVENUE_PATH = "/v2/providers/openapi/apis/api/v1/revenue-history";
export const SETTLEMENT_PATH = "/v2/providers/marketplace_openapi/apis/api/v1/settlement-histories";
export const REVENUE_READ_GAP_SECONDS = 10;
export const REVENUE_MAX_DIFF_DAYS = 29;
/** 소진 예측에서 재고를 읽을 옵션 수(옵션당 1회 호출) */
export const RUNOUT_MAX_OPTIONS = 20;
export const DEFAULT_TARGET_MARGIN = 15;
const DAY_MS = 86_400_000;
const KST_MS = 9 * 3_600_000;

const day = (ms: number) => new Date(ms + KST_MS).toISOString().slice(0, 10);
export function defaultRevenueRange(nowMs: number): { from: string; to: string } {
  return { from: day(nowMs - (REVENUE_MAX_DIFF_DAYS + 1) * DAY_MS), to: day(nowMs - DAY_MS) };
}
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/** 빈 문자열이면 보낼 수 있다 */
export function checkRevenueRange(from: string, to: string, nowMs: number): string {
  const d = /^\d{4}-\d{2}-\d{2}$/;
  if (!d.test(from) || !d.test(to) || Number.isNaN(daysBetween(from, to))) return "기간을 날짜로 넣어 주세요.";
  if (daysBetween(from, to) < 0) return "시작일이 종료일보다 늦습니다.";
  if (daysBetween(from, to) > REVENUE_MAX_DIFF_DAYS) return `쿠팡은 한 번에 ${REVENUE_MAX_DIFF_DAYS + 1}일까지 조회할 수 있습니다.`;
  if (to >= day(nowMs)) return "매출은 어제 날짜까지만 조회할 수 있습니다.";
  return "";
}

export const revenueQuery = (vendorId: string, opt: { from: string; to: string; token?: string }) =>
  new URLSearchParams({ vendorId, recognitionDateFrom: opt.from, recognitionDateTo: opt.to, token: opt.token ?? "", maxPerPage: "50" }).toString();
export const settlementQuery = (month: string) => new URLSearchParams({ revenueRecognitionYearMonth: month }).toString();

const s = (v: unknown) => (v == null ? "" : String(v)).trim();
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export type RevenueLine = {
  key: string;
  orderId: string;
  refund: boolean;
  saleDate: string;
  settlementDate: string;
  vendorItemId: number;
  productName: string;
  optionName: string;
  qty: number;
  /** 반품은 음수로 맞춘다(명세 예시는 반품도 양수) */
  saleAmount: number;
  fee: number;
  feeRatio: number | null;
  settlement: number;
  coupon: number;
};
export type RevenueOrderShipping = { orderId: string; amount: number; settlement: number };

export function normalizeRevenue(raw: unknown): { lines: RevenueLine[]; shipping: RevenueOrderShipping[]; nextToken: string } {
  const r = (raw ?? {}) as { data?: unknown; nextToken?: unknown; hasNext?: unknown };
  const lines: RevenueLine[] = [];
  const shipping: RevenueOrderShipping[] = [];
  for (const o of (Array.isArray(r.data) ? r.data : []) as Record<string, unknown>[]) {
    const orderId = s(o.orderId);
    if (!orderId || orderId === "0") continue; // 명세 예시의 빈 줄
    const refund = s(o.saleType) === "REFUND";
    const sign = (v: unknown) => (refund ? -Math.abs(n(v)) : n(v));
    const d = (o.deliveryFee ?? {}) as Record<string, unknown>;
    if (n(d.amount) || n(d.settlementAmount)) shipping.push({ orderId, amount: sign(d.amount), settlement: sign(d.settlementAmount) });
    ((Array.isArray(o.items) ? o.items : []) as Record<string, unknown>[]).forEach((it, i) => {
      const vendorItemId = n(it.vendorItemId);
      if (!vendorItemId) return;
      lines.push({
        key: `${orderId}-${refund ? "R" : "S"}-${vendorItemId}-${i}`,
        orderId,
        refund,
        saleDate: s(o.saleDate),
        settlementDate: s(o.settlementDate),
        vendorItemId,
        productName: s(it.productName),
        optionName: s(it.vendorItemName),
        qty: refund ? -Math.abs(n(it.quantity)) : n(it.quantity),
        saleAmount: sign(it.saleAmount),
        fee: sign(n(it.serviceFee) + n(it.serviceFeeVat)),
        feeRatio: it.serviceFeeRatio == null ? null : n(it.serviceFeeRatio),
        settlement: sign(it.settlementAmount),
        coupon: sign(n(it.sellerDiscountCoupon) + n(it.downloadableCoupon)),
      });
    });
  }
  return { lines, shipping, nextToken: r.hasNext === false ? "" : s(r.nextToken) };
}

export type OptionSummary = {
  vendorItemId: number;
  productName: string;
  optionName: string;
  soldQty: number;
  refundQty: number;
  netQty: number;
  sales: number;
  fee: number;
  coupon: number;
  settlement: number;
  /** 실제 수수료율(%, 부가세 포함). 판매가 없으면 null */
  feeRate: number | null;
  /** 원가를 넣기 전이면 null */
  profit: number | null;
  margin: number | null;
};

/** 옵션별 집계. 순이익 = 정산액 − 판매자 쿠폰 − 원가 × 순판매수량. 원가가 없으면 순이익을 지어내지 않는다 */
export function summarizeOptions(lines: RevenueLine[], costs: Record<string, number>): OptionSummary[] {
  const map = new Map<number, OptionSummary>();
  for (const l of lines) {
    const cur = map.get(l.vendorItemId) ?? { vendorItemId: l.vendorItemId, productName: l.productName, optionName: l.optionName, soldQty: 0, refundQty: 0, netQty: 0, sales: 0, fee: 0, coupon: 0, settlement: 0, feeRate: null, profit: null, margin: null };
    if (l.refund) cur.refundQty += Math.abs(l.qty);
    else cur.soldQty += l.qty;
    cur.netQty += l.qty;
    cur.sales += l.saleAmount;
    cur.fee += l.fee;
    cur.coupon += l.coupon;
    cur.settlement += l.settlement;
    map.set(l.vendorItemId, cur);
  }
  return [...map.values()]
    .map((o) => {
      const cost = costs[String(o.vendorItemId)];
      const profit = Number.isFinite(cost) && cost >= 0 ? o.settlement - o.coupon - cost * o.netQty : null;
      return {
        ...o,
        feeRate: o.sales > 0 ? Math.round((o.fee / o.sales) * 1000) / 10 : null,
        profit,
        margin: profit !== null && o.sales > 0 ? Math.round((profit / o.sales) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => b.sales - a.sales);
}

/** 규칙으로만 찾는 주의 항목(AI 호출 없음). 표본이 작으면 반품률은 경고하지 않는다 */
export function revenueWarnings(rows: OptionSummary[], targetMargin: number): { vendorItemId: number; text: string }[] {
  const out: { vendorItemId: number; text: string }[] = [];
  for (const o of rows) {
    const name = o.optionName || o.productName;
    if (o.margin !== null && o.margin < targetMargin) out.push({ vendorItemId: o.vendorItemId, text: `「${name}」 이익률 ${o.margin}%로 목표 ${targetMargin}%보다 낮습니다.` });
    if (o.soldQty >= 5 && o.refundQty / o.soldQty >= 0.1) out.push({ vendorItemId: o.vendorItemId, text: `「${name}」 반품 ${o.refundQty}개 / 판매 ${o.soldQty}개로 반품률이 ${Math.round((o.refundQty / o.soldQty) * 100)}%입니다.` });
  }
  return out;
}

/** 남은 일수. 순판매가 없으면 계산하지 않는다 */
export function runoutDays(stock: number, netQty: number, periodDays: number): number | null {
  if (netQty <= 0 || periodDays <= 0) return null;
  return Math.floor(stock / (netQty / periodDays));
}

const tsvCell = (v: unknown) => String(v ?? "").replace(/[\t\r\n]+/g, " ").trim();

/** shop-order-report에 올릴 탭 구분 표. 그쪽 CSV 읽기가 따옴표를 처리하지 않아 쉼표가 든 옵션명을 지키려고 탭을 쓴다. 개인정보 없음 */
export function revenueToTsv(lines: RevenueLine[]): string {
  const head = ["주문번호", "상품주문번호", "주문일", "주문상태", "등록상품명", "등록옵션명", "구매수", "결제액", "정산예정금액"];
  const rows = lines.map((l) => [l.orderId, l.key, l.saleDate, l.refund ? "반품완료" : "구매확정", l.productName, l.optionName, Math.abs(l.qty), Math.abs(l.saleAmount), Math.abs(l.settlement)].map(tsvCell).join("\t"));
  return [head.join("\t"), ...rows].join("\r\n");
}

const SETTLEMENT_TYPE: Record<string, string> = { MONTHLY: "월 정산", WEEKLY: "주 정산", DAILY: "일 정산", ADDITIONAL: "추가 지급", RESERVE: "최종액 지급" };
export type SettlementRow = { type: string; date: string; from: string; to: string; totalSale: number; fee: number; finalAmount: number; done: boolean };

/** 지급내역. 예금주·은행·계좌 칸은 읽지 않는다. 응답이 배열이거나 data 안에 올 수 있어 둘 다 받는다 */
export function normalizeSettlements(raw: unknown): SettlementRow[] {
  const list = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data;
  return ((Array.isArray(list) ? list : []) as Record<string, unknown>[])
    .map((x) => ({
      type: SETTLEMENT_TYPE[s(x.settlementType)] ?? s(x.settlementType),
      date: s(x.settlementDate),
      from: s(x.revenueRecognitionDateFrom),
      to: s(x.revenueRecognitionDateTo),
      totalSale: n(x.totalSale),
      fee: n(x.serviceFee),
      finalAmount: n(x.finalAmount),
      done: s(x.status) === "DONE",
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const cleanTargetMargin = (raw: unknown) => {
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 && v <= 100 ? v : DEFAULT_TARGET_MARGIN;
};
