// D34 입점형 마켓플레이스 — 공급사 상태·글자. DB(0053)가 권한·상태 변경을 다시 검사한다
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

export type SupplierStatus = "invited" | "active" | "paused" | "revoked";

export type SupplierRow = {
  id: string;
  store_id: string;
  user_id: string | null;
  name: string;
  email: string;
  biz_no: string;
  contact_name: string;
  phone: string;
  memo: string;
  status: SupplierStatus;
  auto_approve: boolean;
  hq_fee_rate: number | null; // M1-1(0068) 공급사별 본사 판매수수료율(비우면 몰 기본값)
  invite_expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
};

export const SUPPLIER_COLUMNS = "id, store_id, user_id, name, email, biz_no, contact_name, phone, memo, status, auto_approve, hq_fee_rate, invite_expires_at, accepted_at, created_at";

/** M1-2(0068) 공급가 = 판매가 × (1 − 본사율 − 리셀러율), 원 단위 버림 — DB mall_builder_private.rate_supply와 같은 계산 */
export function rateSupply(price: number, hqRate: number, resellerRate: number): number {
  const keep = Math.round((100 - hqRate - resellerRate) * 100); // 0.01% 단위 정수로 바꿔 소수 오차를 없앤다
  return Math.max(0, Math.floor((Math.max(0, price) * keep) / 10000));
}

/** 수수료율 방식 몰의 세 몫(판매가 기준) */
export function rateSplit(price: number, hqRate: number, resellerRate: number) {
  const supply = rateSupply(price, hqRate, resellerRate);
  const reseller = Math.floor((Math.max(0, price) * Math.round(resellerRate * 100)) / 10000);
  return { supply, reseller, hq: Math.max(0, price - supply - reseller) };
}

export const SUPPLIER_STATUS_LABEL: Record<SupplierStatus, string> = {
  invited: "수락 대기",
  active: "입점 중",
  paused: "쉬는 중",
  revoked: "초대 거둠",
};

/** 운영사가 고를 수 있는 다음 상태 — DB 함수와 같은 규칙 */
export function nextStatuses(s: SupplierStatus): SupplierStatus[] {
  if (s === "invited") return ["invited", "revoked"];
  if (s === "active" || s === "paused") return ["active", "paused"];
  return [];
}

/** 초대 링크가 아직 쓸 수 있는가 */
export function inviteAlive(row: Pick<SupplierRow, "status" | "invite_expires_at">, now = Date.now()): boolean {
  return row.status === "invited" && !!row.invite_expires_at && new Date(row.invite_expires_at).getTime() > now;
}

/** 공급사 초대 링크 토큰 모양(48자리 16진수) */
export const isInviteToken = (t: string) => /^[0-9a-f]{48}$/.test(t);

// ── D35 공급사 상품 승인 ──
export type Approval = "approved" | "pending" | "rejected";

export const APPROVAL_LABEL: Record<Approval, string> = {
  approved: "승인됨",
  pending: "승인 대기",
  rejected: "반려",
};

/** 공급사 상품이 유저에게 보이는가(DB mall_builder_product_visible과 같은 규칙의 요약) */
export function supplierProductLive(p: { approval: Approval; status: string }, supplierStatus: SupplierStatus): boolean {
  return p.approval === "approved" && (p.status === "on_sale" || p.status === "sold_out") && supplierStatus === "active";
}

/** 마진(판매가 − 공급가)과 마진율(%) — 판매가 0이면 0% */
export function marginOf(base: number, supply: number): { won: number; rate: number } {
  const won = base - supply;
  return { won, rate: base > 0 ? Math.round((won / base) * 1000) / 10 : 0 };
}

/** 옵션 추가 판매가 기본값 = 추가 공급가 × (판매가 / 공급가), 반올림. DB mall_builder_private.default_extra_sale과 같은 계산(0060) */
export function defaultExtraSale(extraSupply: number, base: number, supply: number): number {
  if (!(supply > 0) || !(base > 0)) return extraSupply;
  return Math.round((extraSupply * base) / supply);
}

// ── T1 공급사별 배송비(0060) — 입력값을 DB 함수 형식으로 ──
export type SupplierShippingType = "mall" | "free" | "fixed" | "conditional";
export const SUPPLIER_SHIPPING_LABEL: Record<SupplierShippingType, string> = {
  mall: "몰 기본 배송비 따르기",
  free: "무료 배송",
  fixed: "고정 배송비",
  conditional: "조건부 무료",
};
export function isSupplierShippingType(v: string): v is SupplierShippingType {
  return v in SUPPLIER_SHIPPING_LABEL;
}

// ── D37 공급사 정산(공급가 방식) ──
export type LedgerKind = "earn" | "reclaim" | "settle" | "adjust";
export const SUPPLIER_LEDGER_LABEL: Record<LedgerKind, string> = {
  earn: "구매 확정 적립",
  reclaim: "확정 뒤 취소·반품 차감",
  settle: "정산 지급",
  adjust: "조정",
};

/** 한국 시각 기준 「YYYY-MM」 */
export function monthKst(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type MonthRow = { month: string; earned: number; reclaimed: number; settled: number; net: number };

/** 월별 정산서 — 적립·차감·지급 합계와 순적립(적립+차감), 최근 달 먼저 */
export function monthlySummary(rows: { kind: LedgerKind; amount: number; created_at: string }[]): MonthRow[] {
  const m = new Map<string, MonthRow>();
  for (const r of rows) {
    const k = monthKst(r.created_at);
    const row = m.get(k) ?? { month: k, earned: 0, reclaimed: 0, settled: 0, net: 0 };
    if (r.kind === "earn") row.earned += r.amount;
    else if (r.kind === "reclaim") row.reclaimed += r.amount;
    else if (r.kind === "settle") row.settled += -r.amount;
    else row.reclaimed += r.amount;
    row.net = row.earned + row.reclaimed;
    m.set(k, row);
  }
  return [...m.values()].sort((a, b) => b.month.localeCompare(a.month));
}

// ── M3-S2·S3 공급사 판매 분해·대시보드(순수 함수, node --test 대상) ──
export type PeriodKey = "today" | "7d" | "30d" | "month" | "lastmonth" | "all";
export const PERIOD_LABEL: Record<PeriodKey, string> = { today: "오늘", "7d": "7일", "30d": "30일", month: "이번 달", lastmonth: "지난 달", all: "전체" };
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** 한국 시간 오늘(YYYY-MM-DD) */
export function todayKst(now = new Date()): string {
  return ymd(new Date(now.getTime() + 9 * 3600000));
}

/** 기간 단추 → 시작·끝 날짜(둘 다 포함, 한국 날짜). all이면 null */
export function periodRange(key: PeriodKey, today: string): { from: string | null; to: string | null } {
  const t = new Date(`${today}T00:00:00Z`);
  const back = (n: number) => ymd(new Date(t.getTime() - n * 86400000));
  if (key === "today") return { from: today, to: today };
  if (key === "7d") return { from: back(6), to: today };
  if (key === "30d") return { from: back(29), to: today };
  if (key === "month") return { from: `${today.slice(0, 7)}-01`, to: today };
  if (key === "lastmonth") {
    const first = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1));
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0));
    return { from: ymd(first), to: ymd(last) };
  }
  return { from: null, to: null };
}

export type SupplierSaleRow = { item_id: string; order_no: string; ordered_at: string; order_status: string; product_id: string | null; name: string; option: string | null; qty: number; sales: number; supply: number; reseller: number; hq: number; reseller_code: string | null };

/** 판매 분해 합계 + 리셀러 판매 비중 + 상품 순위(공급가 많은 순) */
export function summarizeSupplierSales(rows: SupplierSaleRow[]) {
  const live = rows.filter((r) => r.qty > 0);
  const sum = (k: "sales" | "supply" | "reseller" | "hq" | "qty") => live.reduce((a, r) => a + Number(r[k]), 0);
  const viaReseller = live.filter((r) => r.reseller_code);
  const byProduct = new Map<string, { name: string; qty: number; sales: number; supply: number }>();
  for (const r of live) {
    const k = r.product_id ?? `name:${r.name}`;
    const g = byProduct.get(k) ?? { name: r.name, qty: 0, sales: 0, supply: 0 };
    g.qty += r.qty;
    g.sales += r.sales;
    g.supply += r.supply;
    byProduct.set(k, g);
  }
  return {
    orders: new Set(live.map((r) => r.order_no)).size,
    qty: sum("qty"),
    sales: sum("sales"),
    supply: sum("supply"),
    reseller: sum("reseller"),
    hq: sum("hq"),
    resellerSales: viaReseller.reduce((a, r) => a + r.sales, 0),
    resellers: new Set(viaReseller.map((r) => r.reseller_code)).size,
    top: [...byProduct.values()].sort((a, b) => b.supply - a.supply || b.qty - a.qty).slice(0, 5),
  };
}
