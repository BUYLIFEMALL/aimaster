"use server";

// D27 AI 견적 보조 설정 — 몰 대표 본인 Anthropic 키(서버에서 암호화해 저장, DB·브라우저는 원래 키를 모름), 모델, 최소 마진율.
// 저장 권한(대표만)은 DB 함수 mall_builder_ai_settings_save가 다시 확인한다.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";
import { isAiModel } from "@/lib/aiQuote";
import { looksLikeAnthropicKey, sealSecret } from "@/lib/secretBox";

export type AiSettingsState = { error: string | null; message: string | null; model: string; minMargin: string };

export async function saveAiSettingsAction(slug: string, prev: AiSettingsState, form: FormData): Promise<AiSettingsState> {
  const model = String(form.get("model") ?? "");
  const minMargin = String(form.get("min_margin") ?? "").replace(/[%\s]/g, "");
  const key = String(form.get("api_key") ?? "").trim();
  const remove = form.get("remove_key") === "on";
  const back = (error: string | null, message: string | null): AiSettingsState => ({ error, message, model, minMargin });
  if (!isAiModel(model)) return back("모델을 골라 주세요.", null);
  if (!/^\d{1,2}$/.test(minMargin)) return back("최소 마진율은 0~90 사이 숫자로 입력해 주세요.", null);
  if (key && !looksLikeAnthropicKey(key)) return back("Anthropic API 키는 sk-ant-로 시작합니다. 다시 확인해 주세요.", null);

  const store = await getStoreBySlug(slug);
  let enc: string | null = null;
  if (key && !remove) {
    try {
      enc = sealSecret(key, store.id);
    } catch (e) {
      return back(e instanceof Error ? e.message : "키를 암호화하지 못했습니다.", null);
    }
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_ai_settings_save", {
    p_store_id: store.id,
    p_model: model,
    p_min_margin: Number(minMargin),
    p_key_enc: enc,
    p_key_hint: key ? key.slice(-4) : null,
    p_clear_key: remove,
  });
  if (error) return back(error.message, null);
  revalidatePath(`/s/${slug}`, "layout");
  return back(null, remove ? "키를 지웠습니다." : "저장했습니다. 견적 상세에서 「AI 단가 제안」을 눌러 보세요.");
}
