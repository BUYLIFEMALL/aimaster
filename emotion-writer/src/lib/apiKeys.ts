import "server-only";
import { createAdminClient } from "./supabase/admin";
import { PROVIDERS, type Provider } from "./studio/config";

export async function getUserApiKey(
  userId: string,
  provider: Provider,
): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error)
    throw new Error(
      "본인 API 키를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
    );
  return data?.api_key || null;
}
export async function getRegisteredApiKeys(
  userId: string,
): Promise<Record<Provider, boolean>> {
  const { data, error } = await createAdminClient()
    .from("user_api_keys")
    .select("provider,api_key")
    .eq("user_id", userId)
    .in("provider", [...PROVIDERS]);
  if (error) throw new Error("API 키 등록 상태를 확인하지 못했습니다.");
  return Object.fromEntries(
    PROVIDERS.map((p) => [
      p,
      data?.some((r) => r.provider === p && Boolean(r.api_key)) || false,
    ]),
  ) as Record<Provider, boolean>;
}

/**
 * Cloudflare Workers AI(FLUX-1 Schnell)용 공용 키 등록 여부 확인
 * user_api_keys의 cloudflare_workers_ai_token과 cloudflare_account_id 두 키가 모두 존재하는지 검사(평문 반환 0).
 */
export async function hasCloudflareWorkersAiKey(
  userId: string,
): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("user_api_keys")
    .select("provider,api_key")
    .eq("user_id", userId)
    .in("provider", ["cloudflare_workers_ai_token", "cloudflare_account_id"]);
  if (error) throw new Error("Cloudflare 키 등록 상태를 확인하지 못했습니다.");
  const hasToken =
    data?.some(
      (r) => r.provider === "cloudflare_workers_ai_token" && Boolean(r.api_key),
    ) || false;
  const hasAccount =
    data?.some(
      (r) => r.provider === "cloudflare_account_id" && Boolean(r.api_key),
    ) || false;
  return hasToken && hasAccount;
}
