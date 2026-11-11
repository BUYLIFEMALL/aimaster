"use server";

// D27 견적 상세 「AI 단가 제안」 — 누를 때만 호출. 권한(「주문」 권한 직원)·키는 DB 함수가 다시 확인한다
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";
import { suggestQuotePrices, type AiQuoteResult } from "@/lib/ai-quote-server";

export type AiQuoteState = AiQuoteResult | { ok: null };

export async function aiSuggestAction(slug: string, quoteId: string): Promise<AiQuoteState> {
  try {
    const store = await getStoreBySlug(slug);
    const supabase = await createClient();
    return await suggestQuotePrices(supabase, store.id, quoteId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI 제안을 받지 못했습니다." };
  }
}
