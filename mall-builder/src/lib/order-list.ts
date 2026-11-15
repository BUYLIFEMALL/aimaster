// M2-1(2026-11-15) 운영사 주문 목록 — 주소 조건(상태·검색어·기간·송장 없음·페이지)을 읽고 검사한다.
// 화면(admin/orders)과 조회 함수(store.ts getStoreOrders)가 함께 쓴다. DB 변경 없음.

export const ORDER_PAGE_SIZE = 50;

/** 「송장 없음」으로 볼 상태 — 발송해야 하거나 배송 중인데 송장 번호가 비어 있는 주문 */
export const NO_TRACKING_STATUSES = ["paid", "preparing", "shipping"] as const;

export type OrderListQuery = {
  status?: string;
  q: string; // 정리된 검색어(없으면 "")
  from?: string; // YYYY-MM-DD(한국 날짜)
  to?: string;
  noTracking: boolean;
  page: number; // 1부터
};

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** 검색어 정리 — PostgREST 조건 문자열을 깨뜨리는 글자(쉼표·괄호·따옴표·%·*·역슬래시)는 지우고 40자까지 */
export function cleanSearch(q: string): string {
  return q.replace(/[,()'"%*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
}

/** YYYY-MM-DD이고 실제 있는 날짜면 그대로, 아니면 undefined */
export function cleanDate(v: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? undefined : v;
}

export function parseOrderListQuery(raw: Raw, statuses: readonly string[]): OrderListQuery {
  const status = one(raw.status);
  let from = cleanDate(one(raw.from));
  let to = cleanDate(one(raw.to));
  if (from && to && from > to) [from, to] = [to, from]; // 거꾸로 넣으면 바꿔 줌
  const page = Math.min(Math.max(Number.parseInt(one(raw.page), 10) || 1, 1), 1000);
  return {
    status: statuses.includes(status) ? status : undefined,
    q: cleanSearch(one(raw.q)),
    from,
    to,
    noTracking: one(raw.no_tracking) === "1",
    page,
  };
}

/** 한국 날짜 하루의 시작·다음 날 시작(UTC ISO) — created_at ≥ start, < end */
export function kstDayStart(day: string): string {
  return new Date(`${day}T00:00:00+09:00`).toISOString();
}
export function kstNextDayStart(day: string): string {
  return new Date(new Date(`${day}T00:00:00+09:00`).getTime() + 86_400_000).toISOString();
}

/** 휴대폰 숫자만 넣으면 저장 모양(010-1234-5678)으로도 찾는다 */
function phoneForms(q: string): string[] {
  const d = q.replace(/\D/g, "");
  if (d !== q.replace(/-/g, "") || !/^01\d{8,9}$/.test(d)) return [];
  return [d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`];
}

/** 검색 조건(PostgREST or 문자열) — 주문번호·입금자·받는 분·받는 분 연락처·비회원 이름·연락처 */
export function orderSearchFilter(q: string): string | null {
  if (!q) return null;
  const terms = [q, ...phoneForms(q)].filter((t, i, a) => a.indexOf(t) === i);
  const cols = ["order_no", "depositor", "guest_name", "guest_phone", "receiver->>receiver", "receiver->>phone"];
  return terms.flatMap((t) => cols.map((c) => `${c}.ilike.%${t}%`)).join(",");
}

/** 조건을 유지한 목록 주소(탭·페이지 이동) — 바꿀 값만 넘긴다 */
export function orderListHref(base: string, cur: OrderListQuery, patch: Partial<OrderListQuery>): string {
  const n = { ...cur, ...patch };
  const sp = new URLSearchParams();
  if (n.status) sp.set("status", n.status);
  if (n.q) sp.set("q", n.q);
  if (n.from) sp.set("from", n.from);
  if (n.to) sp.set("to", n.to);
  if (n.noTracking) sp.set("no_tracking", "1");
  if (n.page > 1) sp.set("page", String(n.page));
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE));
}

/** 조건(상태·송장 없음·기간·검색어)을 조회에 붙인다 — 목록(store.ts)과 엑셀 내려받기(M2-2)가 같은 조건을 쓰게 한 곳에 */
type Filterable<Q> = {
  eq(col: string, v: string): Q;
  in(col: string, v: string[]): Q;
  gte(col: string, v: string): Q;
  lt(col: string, v: string): Q;
  or(filter: string): Q;
};
export function applyOrderFilters<Q extends Filterable<Q>>(query: Q, f: OrderListQuery): Q {
  let q = query;
  if (f.status) q = q.eq("status", f.status);
  if (f.noTracking) q = q.in("status", [...NO_TRACKING_STATUSES]).eq("tracking_no", "");
  if (f.from) q = q.gte("created_at", kstDayStart(f.from));
  if (f.to) q = q.lt("created_at", kstNextDayStart(f.to));
  const search = orderSearchFilter(f.q);
  if (search) q = q.or(search);
  return q;
}
