// D27 AI 견적 보조 — 서버 전용: 견적 자료 모으기(가격 엔진 재사용) → 몰 대표 키 풀기 → Claude 호출(구조화 응답) → 검사 → 기록.
// 최상위 규칙: 그 몰 대표 본인 키만 쓴다(키가 없으면 등록 안내, 다른 키로 대신 처리하지 않음). 재시도 0(본인 키 이중 과금 방지).

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { priceLine, viewerOf, type PricingProduct } from "./pricing";
import { getCustomerPriceMap, getGradePriceMap, getStoreCustomer, getTierMap } from "./store";
import { openSecret } from "./secretBox";
import { SuggestionSchema, buildQuotePrompt, checkSuggestion, estimateCost, isAiModel, DEFAULT_AI_MODEL, type CheckedRow, type QuoteFact } from "./aiQuote";

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
    getGradePriceMap(storeId, customer?.grade_id ?? null, ids),
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
        { viewer, gradePrice: grades.get(p.id) ?? null, gradeName: customer?.grade?.name, tiers: tiers.get(p.id) ?? [], customerPrice: special.byProduct.get(p.id) ?? special.base },
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
  const { data: status } = await supabase.rpc("mall_builder_ai_status", { p_store_id: storeId });
  const st = (status ?? {}) as { has_key?: boolean; model?: string; min_margin?: number };
  if (!st.has_key) return { ok: false, needKey: true, error: "AI 키가 없습니다. 「쇼핑몰 정보」 아래 「AI 견적 보조」에 몰 대표 본인 Anthropic 키를 등록해 주세요." };
  const { data: enc } = await supabase.rpc("mall_builder_ai_key_enc", { p_store_id: storeId });
  if (typeof enc !== "string" || !enc) return { ok: false, error: "견적(주문) 권한이 있는 직원만 AI 제안을 받을 수 있습니다." };
  let apiKey: string;
  try {
    apiKey = openSecret(enc, storeId);
  } catch (e) {
    return { ok: false, needKey: true, error: e instanceof Error ? e.message : "키를 풀지 못했습니다." };
  }

  const gathered = await gatherFacts(supabase, storeId, quoteId);
  if (!gathered || !gathered.facts.length) return { ok: false, error: "견적 품목을 찾지 못했습니다." };
  const model = isAiModel(st.model) ? st.model : DEFAULT_AI_MODEL;
  const minMargin = Number(st.min_margin ?? 10);
  const prompt = buildQuotePrompt(gathered.facts, { buyer: gathered.buyer, isBusiness: gathered.isBusiness, requestNote: gathered.requestNote, minMargin, year: new Date().getFullYear() });

  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 120_000 });
  let response;
  try {
    response = await client.messages.parse({
      model,
      max_tokens: 8000,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
      output_config: { effort: "low", format: zodOutputFormat(SuggestionSchema) },
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, needKey: true, error: "등록한 Anthropic 키가 올바르지 않습니다. 키를 다시 등록해 주세요." };
    if (e instanceof Anthropic.PermissionDeniedError) return { ok: false, error: "이 키로는 선택한 모델을 쓸 수 없습니다. Anthropic 콘솔에서 권한·결제를 확인해 주세요." };
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "Anthropic 사용 한도에 걸렸습니다. 잠시 뒤 다시 눌러 주세요." };
    if (e instanceof Anthropic.APIError) return { ok: false, error: `AI 호출 실패(${e.status ?? "연결"}): ${e.message.slice(0, 160)}` };
    return { ok: false, error: "AI 호출에 실패했습니다. 잠시 뒤 다시 눌러 주세요." };
  }
  if (response.stop_reason === "refusal") return { ok: false, error: "AI가 이 요청에 답하지 않았습니다. 직접 단가를 입력해 주세요." };
  if (response.stop_reason === "max_tokens" || !response.parsed_output) return { ok: false, error: "AI 답을 읽지 못했습니다. 다시 눌러 주세요." };

  const checked = checkSuggestion(gathered.facts, response.parsed_output, minMargin);
  const cost = estimateCost(model, { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens });
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
