// M2-8(2026-11-15) 운영사 유저 목록 — 주소 조건(탭·검색어·가입일 기간·페이지)을 읽고 검사한다.
// 화면(admin/customers)·조회 함수(store.ts getStoreCustomerPage)·엑셀 내려받기가 함께 쓴다. DB 변경 없음.
import { cleanDate, cleanSearch, kstDayStart, kstNextDayStart, phoneForms } from "./order-list.ts";

export const CUSTOMER_PAGE_SIZE = 50;
export const APPROVAL_TABS = ["pending", "approved", "rejected", "none"] as const;
export const MEMBER_TABS = ["pending", "rejected"] as const;

export type CustomerListQuery = {
  approval?: (typeof APPROVAL_TABS)[number]; // 사업자 승인 상태
  member?: (typeof MEMBER_TABS)[number]; // 폐쇄몰 입장 대기·반려(있으면 approval보다 먼저)
  q: string;
  from?: string; // 가입일 YYYY-MM-DD(한국 날짜)
  to?: string;
  page: number;
};

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const pick = <T extends string>(list: readonly T[], v: string): T | undefined => (list.includes(v as T) ? (v as T) : undefined);

export function parseCustomerListQuery(raw: Raw): CustomerListQuery {
  const member = pick(MEMBER_TABS, one(raw.member));
  let from = cleanDate(one(raw.from));
  let to = cleanDate(one(raw.to));
  if (from && to && from > to) [from, to] = [to, from];
  return {
    member,
    approval: member ? undefined : pick(APPROVAL_TABS, one(raw.approval)),
    q: cleanSearch(one(raw.q)),
    from,
    to,
    page: Math.min(Math.max(Number.parseInt(one(raw.page), 10) || 1, 1), 1000),
  };
}

/** 사업자번호 숫자 10자리만 넣으면 저장 모양(123-45-67890)으로도 찾는다 */
function businessNoForms(q: string): string[] {
  const d = q.replace(/\D/g, "");
  if (d !== q.replace(/-/g, "") || d.length !== 10) return [];
  return [`${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`];
}

/** 검색 조건(PostgREST or 문자열) — 이름·휴대폰·상호·사업자번호·대표자 */
export function customerSearchFilter(q: string): string | null {
  if (!q) return null;
  const terms = [q, ...phoneForms(q), ...businessNoForms(q)].filter((t, i, a) => a.indexOf(t) === i);
  const cols = ["name", "phone", "company", "business_no", "ceo_name"];
  return terms.flatMap((t) => cols.map((c) => `${c}.ilike.%${t}%`)).join(",");
}

export function customerListHref(base: string, cur: CustomerListQuery, patch: Partial<CustomerListQuery>): string {
  const n = { ...cur, ...patch };
  const sp = new URLSearchParams();
  if (n.member) sp.set("member", n.member);
  else if (n.approval) sp.set("approval", n.approval);
  if (n.q) sp.set("q", n.q);
  if (n.from) sp.set("from", n.from);
  if (n.to) sp.set("to", n.to);
  if (n.page > 1) sp.set("page", String(n.page));
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

export function customerPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE));
}

type Filterable<Q> = {
  eq(col: string, v: string): Q;
  gte(col: string, v: string): Q;
  lt(col: string, v: string): Q;
  or(filter: string): Q;
};
/** 조건을 조회에 붙인다 — 목록과 엑셀이 같은 조건을 쓰게 한 곳에 */
export function applyCustomerFilters<Q extends Filterable<Q>>(query: Q, f: CustomerListQuery): Q {
  let q = query;
  if (f.member) q = q.eq("member_status", f.member);
  else if (f.approval) q = q.eq("approval_status", f.approval);
  if (f.from) q = q.gte("created_at", kstDayStart(f.from));
  if (f.to) q = q.lt("created_at", kstNextDayStart(f.to));
  const search = customerSearchFilter(f.q);
  if (search) q = q.or(search);
  return q;
}
