"use server";

// D29 AI 도우미 서버 액션 — 누를 때만 부른다. 결과는 화면 칸에 채우기만 하고 저장은 운영자가 한다.
// 권한: 메뉴 권한(상품·게시판·첫 화면)을 여기서 확인하고, 키 암호문은 DB 함수(0049)가 다시 확인한다.
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCategoryRows, getFaqs, getNotices, getShippingPolicies, getStoreBySlug, getStoreProducts } from "@/lib/store";
import type { Block } from "@/lib/blocks";
import { HomeDraftSchema, buildHomePrompt, draftToBlocks, type HomeFacts } from "@/lib/aiHome";
import { describePolicy } from "@/lib/shipping";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { MAX_ANSWER } from "@/lib/reviews";
import { InquiryDraftSchema, buildInquiryPrompt, cleanInquiryDraft, type InquiryDraft, type InquiryFacts } from "@/lib/aiInquiry";
import { canSeeMenu, type MyStaff } from "@/lib/staff";
import { callStructured, loadAi, type AiFail } from "@/lib/ai-client";
import { MAX_MEMO, ProductDraftSchema, buildProductPrompt, cleanDraft, isOwnImageUrl, type ProductDraft } from "@/lib/aiProduct";

export type AiCost = { model: string; usd: number; krw: number };
export type ProductDraftState = AiFail | { ok: true; draft: ProductDraft; cost: AiCost };

async function staffFor(slug: string, menu: string) {
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const me = ((await supabase.rpc("mall_builder_my_staff", { p_store_id: store.id })).data ?? null) as MyStaff;
  return { store, supabase, allowed: canSeeMenu(menu, me) };
}

/** 상품 등록·수정 「AI로 채우기」 */
export async function aiProductDraftAction(slug: string, input: { memo: string; imageUrl: string | null }): Promise<ProductDraftState> {
  try {
    const memo = String(input.memo ?? "").trim();
    if (memo.length < 2) return { ok: false, error: "상품에 대한 메모를 한두 줄 적어 주세요(무엇인지·특징·규격 등)." };
    if (memo.length > MAX_MEMO) return { ok: false, error: `메모는 ${MAX_MEMO}자까지 적을 수 있습니다.` };
    const { store, supabase, allowed } = await staffFor(slug, "/products");
    if (!allowed) return { ok: false, error: "「상품」 권한이 있는 직원만 쓸 수 있습니다." };
    const ai = await loadAi(supabase, store.id);
    if (!ai.ok) return ai;

    const image = isOwnImageUrl(input.imageUrl, process.env.NEXT_PUBLIC_SUPABASE_URL) ? input.imageUrl : null;
    const categories = (await getCategoryRows(store.id)).map((c) => c.name);
    const prompt = buildProductPrompt({ memo, storeName: store.name, categoryNames: categories, hasImage: !!image, year: new Date().getFullYear() });
    const content: Anthropic.ContentBlockParam[] = [
      ...(image ? [{ type: "image" as const, source: { type: "url" as const, url: image } }] : []),
      { type: "text", text: prompt.user },
    ];
    const called = await callStructured(ai, { system: prompt.system, content, schema: ProductDraftSchema, maxTokens: 6000 });
    if (!called.ok) return called;
    return { ok: true, draft: cleanDraft(called.data), cost: { model: ai.model, ...called.cost } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI 초안을 받지 못했습니다." };
  }
}

export type InquiryDraftState = AiFail | { ok: true; draft: InquiryDraft; cost: AiCost };

/** 문의 「AI 답변 초안」 — 손님 이름·연락처는 보내지 않는다 */
export async function aiInquiryDraftAction(slug: string, inquiryId: string): Promise<InquiryDraftState> {
  try {
    const { store, supabase, allowed } = await staffFor(slug, "/inquiries");
    if (!allowed) return { ok: false, error: "「게시판」 권한이 있는 직원만 쓸 수 있습니다." };
    const { data: q } = await supabase
      .from("mall_builder_inquiries")
      .select("id, kind, title, body, product_id, order_id")
      .eq("store_id", store.id)
      .eq("id", inquiryId)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!q) return { ok: false, error: "문의를 찾지 못했습니다." };
    const ai = await loadAi(supabase, store.id);
    if (!ai.ok) return ai;

    const [{ data: p }, { data: o }, faqs, policies] = await Promise.all([
      q.product_id
        ? supabase.from("mall_builder_products").select("name, summary, description, base_price, price_visibility").eq("id", q.product_id).maybeSingle()
        : Promise.resolve({ data: null }),
      q.order_id ? supabase.from("mall_builder_orders").select("status, created_at").eq("id", q.order_id).maybeSingle() : Promise.resolve({ data: null }),
      getFaqs(store.id),
      getShippingPolicies(store.id),
    ]);
    const facts: InquiryFacts = {
      kind: q.kind as InquiryFacts["kind"],
      title: q.title as string,
      body: q.body as string,
      storeName: store.name,
      // 가격 비공개 상품은 판매가를 보내지 않는다(답변에 가격이 새지 않게)
      product: p ? { name: p.name as string, summary: (p.summary as string) ?? "", description: (p.description as string) ?? "", price: p.price_visibility === "all" ? Number(p.base_price) : null } : null,
      order: o ? { status: ORDER_STATUS_LABEL[o.status as keyof typeof ORDER_STATUS_LABEL] ?? String(o.status), created: String(o.created_at).slice(0, 10) } : null,
      faqs: faqs.filter((f) => f.is_published).map((f) => ({ question: f.question, answer: f.answer })),
      shipping: policies.map((s) => `${s.name}: ${describePolicy(s)}`),
    };
    const prompt = buildInquiryPrompt(facts, new Date().getFullYear());
    const called = await callStructured(ai, { system: prompt.system, content: prompt.user, schema: InquiryDraftSchema, maxTokens: 4000 });
    if (!called.ok) return called;
    return { ok: true, draft: cleanInquiryDraft(called.data, MAX_ANSWER), cost: { model: ai.model, ...called.cost } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI 초안을 받지 못했습니다." };
  }
}

export type HomeDraftState = AiFail | { ok: true; blocks: Block[]; dropped: number; note: string; cost: AiCost };

/** 첫 화면 「AI 초안 만들기」 — 블록을 돌려줄 뿐 저장·게시는 운영자가 편집기에서 한다 */
export async function aiHomeDraftAction(slug: string, industry: string): Promise<HomeDraftState> {
  try {
    const text = String(industry ?? "").trim();
    if (text.length < 2) return { ok: false, error: "업종·분위기를 한 줄 적어 주세요(예: 사무용품 도매, 깔끔하고 신뢰감 있게)." };
    const { store, supabase, allowed } = await staffFor(slug, "/home");
    if (!allowed) return { ok: false, error: "「첫 화면」 권한이 있는 직원만 쓸 수 있습니다." };
    const ai = await loadAi(supabase, store.id);
    if (!ai.ok) return ai;

    const [categoryRows, products, notices, { data: reviews }] = await Promise.all([
      getCategoryRows(store.id),
      getStoreProducts(store.id),
      getNotices(store.id, 1),
      supabase.rpc("mall_builder_store_recent_reviews", { p_store_id: store.id, p_limit: 1, p_min_rating: 1 }),
    ]);
    const onSale = products.filter((p) => p.status === "on_sale");
    const facts: HomeFacts = {
      storeName: store.name,
      industry: text,
      categories: categoryRows.filter((c) => c.is_visible).map((c) => ({ id: c.id, name: c.name })),
      productNames: onSale.slice(0, 20).map((p) => p.name),
      productCount: onSale.length,
      hasReviews: Array.isArray(reviews) && reviews.length > 0,
      hasNotices: notices.length > 0,
    };
    const prompt = buildHomePrompt(facts, new Date().getFullYear());
    const called = await callStructured(ai, { system: prompt.system, content: prompt.user, schema: HomeDraftSchema, maxTokens: 6000 });
    if (!called.ok) return called;
    const { blocks, dropped } = draftToBlocks(called.data, facts);
    if (!blocks.length) return { ok: false, error: "AI 초안에서 쓸 수 있는 블록이 없었습니다. 업종을 조금 더 자세히 적어 다시 눌러 주세요." };
    return { ok: true, blocks, dropped, note: called.data.note.slice(0, 300), cost: { model: ai.model, ...called.cost } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI 초안을 받지 못했습니다." };
  }
}
