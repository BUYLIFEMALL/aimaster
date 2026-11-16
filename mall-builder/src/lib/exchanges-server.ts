// M2-12b 교환 정보 읽기(서버) — 로그인 세션으로 읽으므로 RLS가 본인 주문 유저·주문 권한 직원만 보여 준다.
// 0102가 없는 DB(교환 표 없음)만 「기능 없음」으로 숨기고, 권한·서버 오류는 숨기지 않고 오류로 돌려준다.
import { createClient } from "@/lib/supabase/server";
import { deliveredAtFromEvents, type ExchangeItem, type ExchangeRow, type ExchangeVariant } from "@/lib/exchanges";

const EXCHANGE_COLUMNS =
  "id, item_id, qty, from_variant_id, to_variant_id, from_option, to_option, from_option_based, to_option_based, reason, memo, requested_by, step, collect_courier, collect_tracking, reship_courier, reship_tracking, fee, fee_status, restocked, reship_deducted, reject_note, created_at";

export type ExchangeData =
  | { state: "missing" }
  | { state: "error"; message: string }
  | { state: "ok"; exchanges: ExchangeRow[]; items: ExchangeItem[]; variants: ExchangeVariant[]; deliveredAt: string | null };

/** 교환 표가 아직 없는 DB인지(PostgREST 표 없음 PGRST205 / Postgres 42P01) */
export function isMissingTable(err: { code?: string | null; message?: string | null } | null): boolean {
  if (!err) return false;
  return err.code === "PGRST205" || err.code === "42P01";
}

export async function getExchangeData(orderId: string): Promise<ExchangeData> {
  const supabase = await createClient();
  const ex = await supabase.from("mall_builder_exchanges").select(EXCHANGE_COLUMNS).eq("order_id", orderId).order("created_at");
  if (ex.error) return isMissingTable(ex.error) ? { state: "missing" } : { state: "error", message: `교환 정보를 읽지 못했습니다: ${ex.error.message}` };
  const [it, ev] = await Promise.all([
    supabase.from("mall_builder_order_items").select("id, product_id, variant_id, name_snapshot, option_snapshot, qty, cancelled_qty").eq("order_id", orderId),
    supabase.from("mall_builder_order_events").select("from_status, to_status, created_at").eq("order_id", orderId),
  ]);
  if (it.error) return { state: "error", message: `주문 상품을 읽지 못했습니다: ${it.error.message}` };
  if (ev.error) return { state: "error", message: `주문 이력을 읽지 못했습니다: ${ev.error.message}` };
  const items = (it.data ?? []) as ExchangeItem[];
  const productIds = [...new Set(items.map((i) => i.product_id).filter((v): v is string => Boolean(v)))];
  let variants: ExchangeVariant[] = [];
  if (productIds.length) {
    const v = await supabase.from("mall_builder_product_variants").select("id, product_id, key, is_active").in("product_id", productIds).order("sort");
    if (v.error) return { state: "error", message: `상품 옵션을 읽지 못했습니다: ${v.error.message}` };
    variants = (v.data ?? []) as ExchangeVariant[];
  }
  return {
    state: "ok",
    exchanges: (ex.data ?? []) as unknown as ExchangeRow[],
    items,
    variants,
    deliveredAt: deliveredAtFromEvents((ev.data ?? []) as { from_status: string | null; to_status: string; created_at: string }[]),
  };
}
