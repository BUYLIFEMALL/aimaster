"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { ATTR_REUSE_DAYS, normalizeLookupResult, sanitizeSuggestion, type AttrLookupResult } from "@/lib/smartstore/attributes";

// 상품속성 불러오기 요청 — 회원 확장이 판매자센터에서 읽어 온다. 권한 확인 + 본인 행만(RLS owner).

export type AttrLookupView = { id: string; status: "queued" | "running" | "done" | "failed"; result: AttrLookupResult | null; error: string | null };

export async function requestAttrLookupAction(input: { query: string; path?: string; categoryId?: string }): Promise<{ id?: string; error?: string }> {
  const user = await requireProgramAccess();
  const query = String(input.query ?? "").trim().slice(0, 40);
  const path = String(input.path ?? "").trim().slice(0, 200);
  const categoryId = /^\d{1,12}$/.test(String(input.categoryId ?? "")) ? String(input.categoryId) : null;
  if (!query && !categoryId) return { error: "카테고리 검색어를 먼저 넣어 주세요." };
  const supabase = await createClient();

  // 같은 조건으로 최근에 읽은 결과나 진행 중인 요청이 있으면 그대로 쓴다(판매자센터를 덜 부르게)
  const since = new Date(Date.now() - ATTR_REUSE_DAYS * 86_400_000).toISOString();
  let q = supabase.from("smartstore_register_attr_lookups").select("id,status").eq("user_id", user.id).in("status", ["queued", "running", "done"]).gte("created_at", since);
  q = categoryId ? q.eq("category_id", categoryId) : q.eq("query", query).eq("category_path", path).is("category_id", null);
  const { data: found } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (found) return { id: found.id };

  const { data, error } = await supabase
    .from("smartstore_register_attr_lookups")
    .insert({ user_id: user.id, query, category_path: path, category_id: categoryId })
    .select("id")
    .single();
  if (error || !data) return { error: "요청을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  return { id: data.id };
}

export async function getAttrLookupAction(id: string): Promise<AttrLookupView | null> {
  const user = await requireProgramAccess();
  if (!/^[0-9a-f-]{36}$/.test(String(id))) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("smartstore_register_attr_lookups")
    .select("id,status,result,error")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, status: data.status, result: normalizeLookupResult(data.result), error: data.error };
}

/**
 * 상품속성 AI 추천 — 회원 본인 Claude(Anthropic) 키로 한 번 부른다(운영자 키 폴백 없음).
 * 본인 상품 글 + 본인 속성 결과만 쓰고, 결과는 보기 안의 값만 걸러 화면에 돌려준다(저장·자동 전송 없음).
 */
export async function suggestAttributesAction(productId: string, lookupId: string): Promise<{ picks?: Record<string, string[]>; error?: string; needKey?: boolean }> {
  const user = await requireProgramAccess();
  if (!/^[0-9a-f-]{36}$/.test(String(productId)) || !/^[0-9a-f-]{36}$/.test(String(lookupId))) return { error: "잘못된 요청입니다." };
  const supabase = await createClient();
  const [{ data: product }, { data: lookup }, { data: key }] = await Promise.all([
    supabase.from("shop_products").select("name,product_label,category,key_features,specs,how_to_use,target_customer").eq("id", productId).eq("user_id", user.id).maybeSingle(),
    supabase.from("smartstore_register_attr_lookups").select("status,result").eq("id", lookupId).eq("user_id", user.id).maybeSingle(),
    supabase.from("user_api_keys").select("api_key").eq("user_id", user.id).eq("provider", "anthropic").maybeSingle(),
  ]);
  if (!product) return { error: "상품을 찾지 못했습니다." };
  const result = lookup?.status === "done" ? normalizeLookupResult(lookup.result) : null;
  if (!result?.attributes.length) return { error: "먼저 「속성 불러오기」를 해 주세요." };
  const apiKey = (key?.api_key ?? "").trim();
  if (!apiKey) return { needKey: true, error: "Claude(Anthropic) API 키가 없습니다. 메인 사이트 「API키생성|플랫폼연동」에서 본인 키를 등록해 주세요." };
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 1500) : "");
  try {
    const { suggestAttributes } = await import("@/lib/ai/claude");
    const raw = await suggestAttributes(apiKey, {
      name: s(product.name || product.product_label),
      category: s(product.category),
      keyFeatures: s(product.key_features),
      specs: s(product.specs),
      howToUse: s(product.how_to_use),
      target: s(product.target_customer),
    }, result.attributes);
    return { picks: sanitizeSuggestion(raw, result.attributes) };
  } catch (e) {
    console.error("[smartstore-register] suggest", (e as Error).name);
    return { error: `추천하지 못했습니다(${(e as Error).message.slice(0, 120)}). 직접 골라 주세요.` };
  }
}
