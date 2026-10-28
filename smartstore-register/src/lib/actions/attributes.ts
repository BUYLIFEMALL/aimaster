"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { ATTR_REUSE_DAYS, normalizeLookupResult, type AttrLookupResult } from "@/lib/smartstore/attributes";

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
