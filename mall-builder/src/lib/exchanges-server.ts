// M2-12b 교환 정보 읽기(서버) — 로그인 세션으로 읽으므로 RLS가 본인 주문 유저·주문 권한 직원만 보여 준다.
// 0102가 없는 DB(교환 표 없음)만 「기능 없음」으로 숨기고, 권한·서버 오류는 숨기지 않고 오류로 돌려준다.
import { createClient } from "@/lib/supabase/server";
import { FEE_PAYMENT_COLUMNS, deliveredAtFromEvents, type ExchangeItem, type ExchangeRow, type ExchangeVariant, type FeePaymentRow, type ExfeeFlowDeps } from "@/lib/exchanges";
import { parseSuccessParams } from "@/lib/payment";
import { requireUser } from "@/lib/store";

const EXCHANGE_COLUMNS =
  "id, item_id, qty, from_variant_id, to_variant_id, from_option, to_option, from_option_based, to_option_based, reason, memo, requested_by, step, collect_courier, collect_tracking, reship_courier, reship_tracking, fee, fee_status, restocked, reship_deducted, reject_note, created_at";

export type ExchangeData =
  | { state: "missing" }
  | { state: "error"; message: string }
  | {
      state: "ok"; exchanges: ExchangeRow[]; items: ExchangeItem[]; variants: ExchangeVariant[]; deliveredAt: string | null;
      /** 교환비 카드 결제(0104) — 표가 없는 DB면 payFeature false로 결제 기능만 숨김 */
      payFeature: boolean; payments: FeePaymentRow[]; cardEnabled: boolean;
    };

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
  const pay = await getFeePayments(supabase, orderId);
  if (pay.state === "error") return { state: "error", message: pay.message };
  return {
    state: "ok",
    exchanges: (ex.data ?? []) as unknown as ExchangeRow[],
    items,
    variants,
    deliveredAt: deliveredAtFromEvents((ev.data ?? []) as { from_status: string | null; to_status: string; created_at: string }[]),
    payFeature: pay.state === "ok",
    payments: pay.state === "ok" ? pay.payments : [],
    cardEnabled: pay.state === "ok" ? pay.cardEnabled : false,
  };
}

type Supa = Awaited<ReturnType<typeof createClient>>;

/** 성공·실패 주소 흐름의 실제 의존성 — 로그인 세션으로만 읽고 부른다(서버 키 0). 회원 확인은 requireUser(로그인 안 했으면 로그인 화면) */
export async function exfeeFlowDeps(loginNext: string): Promise<ExfeeFlowDeps> {
  const supabase = await createClient();
  return {
    userId: async () => (await requireUser(loginNext)).id,
    storeId: async (slug) => {
      const { data } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },
    orderOwner: async (storeId, orderId) => {
      const { data } = await supabase.from("mall_builder_orders").select("user_id").eq("store_id", storeId).eq("id", orderId).maybeSingle();
      return (data?.user_id as string | undefined) ?? null;
    },
    exchangeOrder: async (exchangeId) => {
      const { data } = await supabase.from("mall_builder_exchanges").select("order_id").eq("id", exchangeId).maybeSingle();
      return (data?.order_id as string | undefined) ?? null;
    },
    parse: parseSuccessParams,
    rpc: async (fn, args) => {
      const r = await supabase.rpc(fn, args);
      return { data: r.data, error: r.error };
    },
  };
}

/**
 * 교환비 카드 결제 기록(칸 나열 — 결제 키·멱등키 칸은 읽지 않음)과 몰 카드 설정. 시도 이력 표는 읽지 않는다.
 * 결제 기록 표가 없는 DB(0104 전)만 missing으로 숨기고, 그 밖의 오류는 숨기지 않는다.
 */
export async function getFeePayments(supabase: Supa, orderId: string):
  Promise<{ state: "missing" } | { state: "error"; message: string } | { state: "ok"; payments: FeePaymentRow[]; cardEnabled: boolean }> {
  const p = await supabase.from("mall_builder_exchange_fee_payments").select(FEE_PAYMENT_COLUMNS).eq("order_id", orderId);
  if (p.error) return isMissingTable(p.error) ? { state: "missing" } : { state: "error", message: "교환비 결제 정보를 읽지 못했습니다. 새로고침해 주세요." };
  const o = await supabase.from("mall_builder_orders").select("store_id").eq("id", orderId).maybeSingle();
  if (o.error || !o.data) return { state: "error", message: "주문 정보를 읽지 못했습니다. 새로고침해 주세요." };
  const s = await supabase.from("mall_builder_store_payment_settings").select("card_enabled, toss_client_key").eq("store_id", o.data.store_id as string).maybeSingle();
  if (s.error) return { state: "error", message: "카드 결제 설정을 읽지 못했습니다. 새로고침해 주세요." };
  const cardEnabled = Boolean(s.data?.card_enabled) && Boolean(s.data?.toss_client_key);
  return { state: "ok", payments: (p.data ?? []) as unknown as FeePaymentRow[], cardEnabled };
}
