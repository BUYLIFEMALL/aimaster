// 서버 전용 호출부에서 사용. 회원 소유자 조건은 모든 쿼리에 직접 지정한다.
import type { SupabaseClient } from "@supabase/supabase-js";
import { CompatibleChatError, credentialValue, KEY_FIELDS, selectCompatible } from "./config";
type Store = Pick<SupabaseClient, "from">;

export async function compatibleKeys(store: Store, userId: string) {
  const { data, error } = await store.from("user_api_keys").select("provider,api_key").eq("user_id", userId).in("provider", KEY_FIELDS.map((p) => p.key));
  if (error) throw new CompatibleChatError("본인 공용 키 등록 상태를 불러오지 못했습니다.", 500);
  return KEY_FIELDS.reduce<Record<string, { registered: boolean; maskedKey?: string }>>((result, field) => {
    const value = data?.find((row) => row.provider === field.key)?.api_key as string | undefined;
    result[field.key] = value ? { registered: true, maskedKey: value.length > 8 ? `${value.slice(0, 4)}••••••${value.slice(-4)}` : "••••••" } : { registered: false };
    return result;
  }, {});
}

export async function saveCompatibleKey(store: Store, userId: string, provider: unknown, value: unknown) {
  const key = credentialValue(provider, value);
  const { error } = await store.from("user_api_keys").upsert({ user_id: userId, provider: key.provider, api_key: key.value, updated_at: new Date().toISOString() }, { onConflict: "user_id,provider" });
  if (error) throw new CompatibleChatError("공용 키를 저장하지 못했습니다. 등록 항목 준비 상태를 확인해 주세요.", 500);
}

export async function deleteCompatibleKey(store: Store, userId: string, provider: unknown) {
  if (typeof provider !== "string" || !KEY_FIELDS.some((p) => p.key === provider)) throw new CompatibleChatError("삭제할 공용 키 항목이 올바르지 않습니다.");
  const { error } = await store.from("user_api_keys").delete().eq("user_id", userId).eq("provider", provider);
  if (error) throw new CompatibleChatError("본인 공용 키를 삭제하지 못했습니다.", 500);
}

export async function compatibleCredentials(store: Store, userId: string, provider: unknown, model: unknown) {
  const selected = selectCompatible(provider, model);
  const fields: string[] = [selected.config.key];
  if (selected.provider === "cloudflare") fields.push("cloudflare_account_id");
  const { data, error } = await store.from("user_api_keys").select("provider,api_key").eq("user_id", userId).in("provider", fields);
  if (error) throw new CompatibleChatError("본인 AI 연결 정보를 확인하지 못했습니다.", 500);
  const value = (name: string) => (data?.find((row) => row.provider === name)?.api_key as string | undefined)?.trim();
  const apiKey = value(selected.config.key);
  const accountId = value("cloudflare_account_id");
  if (!apiKey || (selected.provider === "cloudflare" && !accountId)) throw new CompatibleChatError(`${selected.config.name}의 본인 키${selected.provider === "cloudflare" ? "와 계정 ID" : ""}를 [API키등록·플랫폼연동]에서 등록해 주세요.`, 400, true);
  return { apiKey, accountId, provider: selected.provider, model: selected.model };
}
