"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROXY_KEY, WING_FIELDS, WING_KEYS, validateProxyUrl, validateWingKeys } from "@/lib/coupang/keys";
import { checkDefaults, normalizeDefaults } from "@/lib/coupang/defaults";
import { defaultKeyExpiry, isExpiryDate, normalizePrefs } from "@/lib/coupang/prefs";

/** 만료일만 바꾼다(다른 설정은 저장 직전에 다시 읽어 유지) */
async function writeKeyExpiry(userId: string, expiry: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("coupang_ops_prefs").select("data").eq("user_id", userId).maybeSingle();
  const { error } = await supabase.from("coupang_ops_prefs").upsert({ user_id: userId, data: { ...normalizePrefs(data?.data), wingKeyExpiry: expiry }, updated_at: new Date().toISOString() });
  return !error;
}

export async function saveKeyExpiryAction(expiry: string): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  if (!isExpiryDate(expiry)) return { error: "만료일을 골라 주세요." };
  if (!(await writeKeyExpiry(user.id, expiry))) return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/connect");
  revalidatePath("/home");
  return { ok: true };
}

// 모든 쓰기는 프로그램 이용 권한 확인 + 본인 행(user_id)만(CLAUDE.md 멀티테넌시 원칙 1·2).

export async function saveWingKeysAction(_prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const { keys, error } = validateWingKeys(Object.fromEntries(formData.entries()));
  if (!keys) return { error };
  const supabase = await createClient();
  const rows = WING_FIELDS.map((f) => ({ user_id: user.id, provider: WING_KEYS[f], api_key: keys[f] }));
  const { error: dbError } = await supabase.from("user_api_keys").upsert(rows, { onConflict: "user_id,provider" });
  if (dbError) return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  await writeKeyExpiry(user.id, defaultKeyExpiry(Date.now())).catch(() => false); // 만료일 저장 실패가 키 저장을 막지 않는다
  revalidatePath("/connect");
  return { ok: true };
}

export async function saveProxyAction(raw: string): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const { url, error } = validateProxyUrl(raw);
  if (!url) return { error };
  const supabase = await createClient();
  const { error: dbError } = await supabase.from("user_api_keys").upsert({ user_id: user.id, provider: PROXY_KEY, api_key: url }, { onConflict: "user_id,provider" });
  if (dbError) return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/connect");
  return { ok: true };
}

export async function deleteProxyAction(): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { error } = await supabase.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", PROXY_KEY);
  if (error) return { error: "지우지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/connect");
  return { ok: true };
}

const AI_KEY_PROVIDERS = ["anthropic", "openai", "gemini"];

export async function saveAiKeyAction(provider: string, apiKey: string): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const key = String(apiKey ?? "").trim();
  if (!AI_KEY_PROVIDERS.includes(provider) || !key) return { error: "API 키를 넣어 주세요." };
  const supabase = await createClient();
  const { error } = await supabase.from("user_api_keys").upsert({ user_id: user.id, provider, api_key: key }, { onConflict: "user_id,provider" });
  if (error) return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/connect");
  return { ok: true };
}

export async function deleteAiKeyAction(provider: string): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  if (!AI_KEY_PROVIDERS.includes(provider)) return { error: "알 수 없는 키입니다." };
  const supabase = await createClient();
  const { error } = await supabase.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", provider);
  if (error) return { error: "삭제하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/connect");
  return { ok: true };
}

export async function deleteWingKeysAction(): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .in("provider", Object.values(WING_KEYS));
  if (error) return { error: "지우지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/connect");
  return { ok: true };
}

export async function saveDefaultsAction(_prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string; problems?: string[] }> {
  const user = await requireProgramAccess();
  const data = normalizeDefaults(Object.fromEntries(formData.entries()));
  const problems = checkDefaults(data);
  if (problems.length) return { problems };
  const supabase = await createClient();
  const { error } = await supabase
    .from("coupang_ops_defaults")
    .upsert({ user_id: user.id, data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/defaults");
  return { ok: true };
}
