// 쿠폰·포인트(D17·D18) 서버 읽기 — 보안 규칙상 손님은 자기 것만, 운영자는 그 몰 것만 받는다
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_POINT_SETTINGS, type CouponDef, type PointSettings } from "./benefits";

export const COUPON_COLUMNS =
  "id, name, discount_type, value, max_discount, min_order, valid_days, ends_at, target, target_ids, allow_business, issue_mode, code, is_active, created_at";

export type CouponIssue = {
  id: string;
  issued_at: string;
  expires_at: string | null;
  used_at: string | null;
  order_id: string | null;
  discount: number | null;
  source: string;
  coupon: CouponDef;
};

export type PointEntry = { id: string; kind: string; amount: number; remaining: number; expires_at: string | null; note: string; order_id: string | null; created_at: string };

const num = (v: unknown) => (v == null ? null : Number(v));

function normCoupon(c: CouponDef): CouponDef {
  return { ...c, value: Number(c.value), max_discount: num(c.max_discount), min_order: Number(c.min_order), target_ids: c.target_ids ?? [] };
}

export async function getPointSettings(storeId: string): Promise<PointSettings & { saved: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_point_settings")
    .select("enabled, earn_rate, min_use, use_unit, max_use_rate, expire_months, expire_notice")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_POINT_SETTINGS, saved: false };
  return {
    enabled: data.enabled,
    earn_rate: Number(data.earn_rate),
    min_use: Number(data.min_use),
    use_unit: Number(data.use_unit),
    max_use_rate: Number(data.max_use_rate),
    expire_months: Number(data.expire_months),
    expire_notice: data.expire_notice,
    saved: true,
  };
}

export async function getPointBalance(customerId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_points_balance", { p_customer_id: customerId });
  return Number(data ?? 0);
}

export async function getPointLedger(customerId: string, limit = 50): Promise<PointEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_point_ledger")
    .select("id, kind, amount, remaining, expires_at, note, order_id, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as PointEntry[]).map((e) => ({ ...e, amount: Number(e.amount), remaining: Number(e.remaining) }));
}

/** 7일 안에 소멸될 포인트 합 */
export function expiringSoon(entries: PointEntry[], now = Date.now()): { points: number; first: string | null } {
  const soon = entries.filter((e) => e.remaining > 0 && e.expires_at && Date.parse(e.expires_at) > now && Date.parse(e.expires_at) <= now + 7 * 86400000);
  const first = soon.map((e) => e.expires_at as string).sort()[0] ?? null;
  return { points: soon.reduce((s, e) => s + e.remaining, 0), first };
}

export async function getMyCoupons(customerId: string): Promise<CouponIssue[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_coupon_issues")
    .select(`id, issued_at, expires_at, used_at, order_id, discount, source, coupon:mall_builder_coupons(${COUPON_COLUMNS})`)
    .eq("customer_id", customerId)
    .order("issued_at", { ascending: false })
    .limit(100);
  return ((data ?? []) as unknown as CouponIssue[])
    .filter((i) => i.coupon)
    .map((i) => ({ ...i, discount: num(i.discount), coupon: normCoupon(i.coupon) }));
}

/** 지금 쓸 수 있는 쿠폰(안 씀·기간 안·켜짐) */
export function usableCoupons(issues: CouponIssue[], now = Date.now()): CouponIssue[] {
  return issues.filter((i) => !i.used_at && i.coupon.is_active && (!i.expires_at || Date.parse(i.expires_at) > now));
}

export async function getStoreCoupons(storeId: string): Promise<(CouponDef & { issued: number; used: number })[]> {
  const supabase = await createClient();
  const [{ data: coupons }, { data: issues }] = await Promise.all([
    supabase.from("mall_builder_coupons").select(COUPON_COLUMNS).eq("store_id", storeId).order("created_at", { ascending: false }).limit(200),
    supabase.from("mall_builder_coupon_issues").select("coupon_id, used_at").eq("store_id", storeId).limit(10000),
  ]);
  const count = new Map<string, { issued: number; used: number }>();
  for (const i of (issues ?? []) as { coupon_id: string; used_at: string | null }[]) {
    const c = count.get(i.coupon_id) ?? { issued: 0, used: 0 };
    c.issued += 1;
    if (i.used_at) c.used += 1;
    count.set(i.coupon_id, c);
  }
  return ((coupons ?? []) as CouponDef[]).map((c) => ({ ...normCoupon(c), ...(count.get(c.id) ?? { issued: 0, used: 0 }) }));
}

/** 손님이 받을 수 있는 쿠폰(다운로드형) — 보안 규칙이 켜진·기간 안 것만 준다 */
export async function getDownloadableCoupons(storeId: string): Promise<CouponDef[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_coupons").select(COUPON_COLUMNS).eq("store_id", storeId).eq("issue_mode", "download").eq("is_active", true).limit(50);
  return ((data ?? []) as CouponDef[]).map(normCoupon);
}

export async function getProductCategoryMap(productIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!productIds.length) return map;
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_product_categories").select("product_id, category_id").in("product_id", productIds);
  for (const r of (data ?? []) as { product_id: string; category_id: string }[]) map.set(r.product_id, [...(map.get(r.product_id) ?? []), r.category_id]);
  return map;
}
