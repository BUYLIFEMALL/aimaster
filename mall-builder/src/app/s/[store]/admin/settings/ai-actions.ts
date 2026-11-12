"use server";

// D27 AI 도우미 설정(2026-11-12 제공자 선택) — 제공자(OpenAI·Claude·Gemini)·모델·최소 마진율, 그리고 키.
// 키: 운영(AIMaster)은 메인 사이트에 등록한 몰 대표 키를 쓰므로 여기서 받지 않는다. Lab·배포 키트는 고른 제공자 키 하나를 서버에서 암호화해 저장.
// 저장 권한(대표만)·허용 모델은 DB 함수 mall_builder_ai_settings_save2가 다시 확인한다.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";
import { AI_PROVIDERS, isAiModel, isAiProvider, providerOf } from "@/lib/aiQuote";
import { looksLikeProviderKey, sealSecret } from "@/lib/secretBox";
import { PLATFORM_AIMASTER } from "@/lib/platform";

export type AiSettingsState = { error: string | null; message: string | null; provider: string; model: string; minMargin: string };

export async function saveAiSettingsAction(slug: string, prev: AiSettingsState, form: FormData): Promise<AiSettingsState> {
  const provider = String(form.get("provider") ?? "");
  const model = String(form.get("model") ?? "");
  const minMargin = String(form.get("min_margin") ?? "").replace(/[%\s]/g, "");
  const key = PLATFORM_AIMASTER ? "" : String(form.get("api_key") ?? "").trim();
  const remove = !PLATFORM_AIMASTER && form.get("remove_key") === "on";
  const back = (error: string | null, message: string | null): AiSettingsState => ({ error, message, provider, model, minMargin });
  if (!isAiProvider(provider)) return back("AI 제공자를 골라 주세요.", null);
  if (!isAiModel(model) || providerOf(model) !== provider) return back("모델을 골라 주세요.", null);
  if (!/^\d{1,2}$/.test(minMargin)) return back("최소 마진율은 0~90 사이 숫자로 입력해 주세요.", null);
  const label = AI_PROVIDERS.find((p) => p.id === provider)!;
  if (key && !looksLikeProviderKey(provider, key)) return back(`${label.label} API 키는 보통 ${label.keyHint}로 시작합니다. 다시 확인해 주세요.`, null);

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
  const { error } = await supabase.rpc("mall_builder_ai_settings_save2", {
    p_store_id: store.id,
    p_provider: provider,
    p_model: model,
    p_min_margin: Number(minMargin),
    p_key_enc: enc,
    p_key_hint: key ? key.slice(-4) : null,
    p_clear_key: remove,
  });
  if (error) return back(error.message, null);
  revalidatePath(`/s/${slug}`, "layout");
  return back(null, remove ? "키를 지웠습니다." : `저장했습니다. AI 도우미는 이제 ${label.label}로 동작합니다.`);
}
