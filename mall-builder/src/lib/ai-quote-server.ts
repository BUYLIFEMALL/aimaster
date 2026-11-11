// D27 AI 견적 보조 — 서버 전용: 견적 자료 모으기(가격 엔진 재사용) → 몰 대표 키 풀기 → Claude 호출(구조화 응답) → 검사 → 기록.
// 최상위 규칙: 그 몰 대표 본인 키만 쓴다(키가 없으면 등록 안내, 다른 키로 대신 처리하지 않음). 재시도 0(본인 키 이중 과금 방지).

import type { SupabaseClient } from "@supabase/supabase-js";
import { priceLine, viewerOf, type PricingProduct } from "./pricing";
import { getCustomerPriceMap, getPriceRuleMap, getStoreCustomer, getTierMap } from "./store";
import { callStructured, loadAi } from "./ai-client";
import { SuggestionSchema, buildQuotePrompt, checkSuggestion, type CheckedRow, type QuoteFact } from "./aiQuote";

export type AiQuoteResult =
  | { ok: false; error: string; needKey?: boolean }
  | { ok: true; rows: (CheckedRow & { name: string; option: string; qty: number; customer_unit: number | null; cost: number | null })[]; note: string; model: string; cost: { usd: number; krw: number }; minMargin: number };

/** 견적 품목 → AI에 보낼 사실들 */
async function gatherFacts(supabase: SupabaseClient, storeId: string, quoteId: string) {
  const { data: q } = await supabase.from("mall_builder_quotes").select("id, customer_id, request_note").eq("store_id", storeId).eq("id", quoteId).maybeSingle();
  if (!q) return null;
  const { data: items } = await supabase.from("mall_builder_quote_items").select("id, product_id, variant_id, name_snapshot, option_snapshot, qty").eq("quote_id", quoteId);
  const customer = q.customer_id ? await getStoreCustomer(storeId, q.customer_id as string) : null;
  const ids = [...new Set((items ?? []).map((i) => i.product_id as string | null).filter((x): x is string => !!x))];

  const [{ data: products }, { data: priv }, { data: variants }, tiers, grades, special] = await Promise.all([
    supabase.from("mall_builder_products").select("id, status, base_price, stock_mode, stock, option_groups, visibility, price_visibility, moq, order_unit, max_qty").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("mall_builder_product_private").select("product_id, cost").in("product_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("mall_builder_product_variants").select("id, product_id, key, values, extra_price, stock, sku, is_active").in("product_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    getTierMap(ids),
    getPriceRuleMap(storeId, ids, customer?.id ?? null),
    getCustomerPriceMap(customer?.id ?? null, ids),
  ]);
  const pById = new Map((products ?? []).map((p) => [p.id as string, p as PricingProduct & { id: string }]));
  const costBy = new Map((priv ?? []).map((c) => [c.product_id as string, c.cost == null ? null : Number(c.cost)]));
  const vById = new Map((variants ?? []).map((v) => [v.id as string, v]));

  // 이 거래처의 최근 6개월 구매 단가(취소·반품 제외, 같은 상품·옵션의 가장 최근)
  const since = new Date(Date.now() - 180 * 86400_000).toISOString();
  const { data: past } = customer
    ? await supabase
        .from("mall_builder_order_items")
        .select("product_id, variant_id, unit_price, mall_builder_orders!inner(customer_id, status, created_at)")
        .eq("mall_builder_orders.customer_id", customer.id)
        .gte("mall_builder_orders.created_at", since)
        .not("mall_builder_orders.status", "in", "(cancelled,returned)")
        .in("product_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
        .limit(500)
    : { data: [] };
  type Past = { product_id: string; variant_id: string | null; unit_price: number; mall_builder_orders: { created_at: string } | { created_at: string }[] };
  const lastBy = new Map<string, { price: number; date: string }>();
  for (const r of (past ?? []) as unknown as Past[]) {
    const o = Array.isArray(r.mall_builder_orders) ? r.mall_builder_orders[0] : r.mall_builder_orders;
    const key = `${r.product_id}|${r.variant_id ?? ""}`;
    const date = o.created_at.slice(0, 10);
    const cur = lastBy.get(key);
    if (!cur || cur.date < date) lastBy.set(key, { price: Number(r.unit_price), date });
  }

  const viewer = viewerOf(customer ? { approval_status: customer.approval_status, grade: customer.grade } : null, true);
  const facts: QuoteFact[] = (items ?? []).map((i) => {
    const p = i.product_id ? pById.get(i.product_id as string) : undefined;
    const v = i.variant_id ? vById.get(i.variant_id as string) : undefined;
    const extra = v ? Number(v.extra_price) : 0;
    let customerUnit: number | null = null;
    if (p) {
      const line = priceLine(
        { ...p, base_price: Number(p.base_price) },
        v ? { key: v.key as string, values: v.values as string[], extra_price: extra, stock: v.stock as number, sku: v.sku as string, is_active: v.is_active as boolean } : null,
        i.qty as number,
        { viewer, gradePrice: grades.get(p.id)?.gradePrice ?? null, gradeName: customer?.grade?.name, tiers: tiers.get(p.id) ?? [], customerPrice: special.byProduct.get(p.id) ?? special.base, floorPrice: grades.get(p.id)?.floor ?? null },
      );
      customerUnit = line.priceHidden ? null : line.unitPrice;
    }
    const stock = !p || p.stock_mode !== "product" ? null : v ? (v.stock as number) : (p.stock as number);
    return {
      item_id: i.id as string,
      name: i.name_snapshot as string,
      option: (i.option_snapshot as string) ?? "",
      qty: i.qty as number,
      list_unit: p ? Number(p.base_price) + extra : 0,
      customer_unit: customerUnit,
      cost: p ? costBy.get(p.id) ?? null : null,
      stock,
      last: lastBy.get(`${i.product_id}|${i.variant_id ?? ""}`) ?? null,
    };
  });
  const buyer = customer ? (customer.kind === "business" && customer.company ? customer.company : customer.name) : "거래처";
  return { facts, buyer, isBusiness: viewer === "business", requestNote: (q.request_note as string) ?? "" };
}

export async function suggestQuotePrices(supabase: SupabaseClient, storeId: string, quoteId: string): Promise<AiQuoteResult> {
  const ai = await loadAi(supabase, storeId);
  if (!ai.ok) return ai;

  const gathered = await gatherFacts(supabase, storeId, quoteId);
  if (!gathered || !gathered.facts.length) return { ok: false, error: "견적 품목을 찾지 못했습니다." };
  const { model, minMargin } = ai;
  const prompt = buildQuotePrompt(gathered.facts, { buyer: gathered.buyer, isBusiness: gathered.isBusiness, requestNote: gathered.requestNote, minMargin, year: new Date().getFullYear() });

  const called = await callStructured(ai, { system: prompt.system, content: prompt.user, schema: SuggestionSchema });
  if (!called.ok) return called;
  const response = { parsed_output: called.data, usage: called.usage };

  const checked = checkSuggestion(gathered.facts, response.parsed_output, minMargin);
  const cost = called.cost;
  const rows = checked.map((r) => {
    const f = gathered.facts.find((x) => x.item_id === r.item_id)!;
    return { ...r, name: f.name, option: f.option, qty: f.qty, customer_unit: f.customer_unit, cost: f.cost };
  });
  // 기록(실패해도 제안은 보여 줌)
  await supabase.rpc("mall_builder_ai_quote_log", {
    p_quote_id: quoteId,
    p_payload: {
      model,
      min_margin: minMargin,
      note: response.parsed_output.note.slice(0, 500),
      rows: rows.map((r) => ({ item_id: r.item_id, suggested: r.suggested, final: r.final, reason: r.reason, warnings: r.warnings })),
      usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
      cost,
    },
  });
  return { ok: true, rows, note: response.parsed_output.note, model, cost, minMargin };
}
