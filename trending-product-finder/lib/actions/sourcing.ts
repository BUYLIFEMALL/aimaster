"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { searchProducts, type AliexpressProduct } from "@/lib/aliexpress/client";

export interface FindSourcingCandidatesState {
  error?: string;
  products?: AliexpressProduct[];
}

/** 키워드로 알리익스프레스 소싱 후보(원가 비교용)를 찾는다. 결과는 저장하지 않는다. */
export async function findSourcingCandidatesAction(formData: FormData): Promise<FindSourcingCandidatesState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const keyword = String(formData.get("keyword") ?? "").trim();
  if (!keyword) return { error: "키워드가 없습니다." };

  const [appKey, appSecret, trackingId] = await Promise.all([
    resolveApiKey(supabase, user.id, "aliexpress_app_key"),
    resolveApiKey(supabase, user.id, "aliexpress_app_secret"),
    resolveApiKey(supabase, user.id, "aliexpress_tracking_id"),
  ]);

  if (!appKey || !appSecret || !trackingId) {
    return { error: "알리익스프레스 API 키가 등록되어 있지 않습니다. 설정 페이지에서 본인 키를 등록해주세요." };
  }

  try {
    const products = await searchProducts(keyword, { appKey, appSecret, trackingId, pageSize: 10 });
    return { products };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알리익스프레스 검색에 실패했습니다." };
  }
}
