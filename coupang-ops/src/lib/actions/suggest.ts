"use server";

import { requireProgramAccess } from "@/lib/access";
import { missingKeyMessage, providerOfModel } from "@/lib/ai/models";
import { cleanSuggestion, type SuggestAttr, type Suggestion } from "@/lib/coupang/suggest";
import { createClient } from "@/lib/supabase/server";

export type SuggestResult = ({ ok: true } & Suggestion) | { ok: false; error: string };

/** 회원이 고른 AI의 본인 키로 1번 부른다. 저장하지 않고 화면의 빈 칸에만 채운다 */
export async function suggestProductInfoAction(input: { name: string; category: string; attrs: SuggestAttr[]; model: string }): Promise<SuggestResult> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const provider = providerOfModel(input.model);
  if (!provider) return { ok: false, error: "AI 모델을 다시 골라 주세요." };
  const { data: key } = await supabase.from("user_api_keys").select("api_key").eq("user_id", user.id).eq("provider", provider).maybeSingle();
  const apiKey = String(key?.api_key ?? "").trim();
  if (!apiKey) return { ok: false, error: missingKeyMessage(provider) };
  const ai = { provider, model: String(input.model), apiKey };
  const name = String(input.name ?? "").trim().slice(0, 200);
  if (!name) return { ok: false, error: "상품명을 먼저 넣어 주세요." };
  const attrs = (input.attrs ?? []).slice(0, 40).map((a) => ({ name: String(a.name), values: (a.values ?? []).slice(0, 60).map(String) }));
  try {
    const { suggestProductInfo } = await import("@/lib/ai/llm");
    return { ok: true, ...cleanSuggestion(await suggestProductInfo(ai, { name, category: String(input.category ?? "").slice(0, 200), attrs }), attrs) };
  } catch (e) {
    console.error("[coupang-ops] suggest", (e as Error).name);
    return { ok: false, error: `추천을 만들지 못했습니다(${(e as Error).message.slice(0, 120)}).` };
  }
}
