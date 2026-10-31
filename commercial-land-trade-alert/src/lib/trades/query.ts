import "server-only";
import type { Prefs } from "./prefs";

export interface TradeFilter {
  kind?: string;
  sgg?: string;
  q?: string;
  category?: string;
  mine?: boolean;
  sort?: string;
}

const quoted = (list: string[]) => `(${list.map((v) => `"${v.replace(/"/g, "")}"`).join(",")})`;

/** 목록·CSV가 함께 쓰는 조건. 회원이 고른 지역 안에서만 찾는다 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyTradeFilter(query: any, filter: TradeFilter, codes: string[], prefs: Prefs) {
  let q = query.in("sgg_cd", codes.length ? codes : [""]);
  if (filter.kind === "building" || filter.kind === "land") q = q.eq("kind", filter.kind);
  if (filter.sgg) q = q.eq("sgg_cd", filter.sgg);
  if (filter.category) q = q.eq("category", filter.category);
  if (filter.q) q = q.ilike("umd_nm", `%${filter.q.replace(/[%_,()]/g, "")}%`);
  if (filter.mine) {
    q = q.eq("cancelled", false).in("kind", prefs.kinds);
    const excluded = [...prefs.excluded_uses, ...prefs.excluded_jimoks];
    if (excluded.length) q = q.not("category", "in", quoted(excluded));
    if (!prefs.include_share) q = q.eq("is_share", false);
    if (prefs.min_amount !== null) q = q.gte("amount_manwon", prefs.min_amount);
    if (prefs.max_amount !== null) q = q.lte("amount_manwon", prefs.max_amount);
    if (prefs.min_area !== null) q = q.gte("area_m2", prefs.min_area);
    if (prefs.max_area !== null) q = q.lte("area_m2", prefs.max_area);
  }
  if (filter.sort === "amount") q = q.order("amount_manwon", { ascending: false });
  else if (filter.sort === "pyeong") q = q.order("price_per_pyeong", { ascending: false, nullsFirst: false });
  else q = q.order("deal_date", { ascending: false });
  return q.order("id", { ascending: true });
}
