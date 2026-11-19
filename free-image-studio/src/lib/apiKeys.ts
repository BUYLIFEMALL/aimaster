import "server-only";
import { createAdminClient } from "./supabase/admin";
import { CONVERT_PROVIDER_ORDER, type ConvertProvider, type KeyStatus } from "./convert/models";

// 회원 본인 키만 읽는다 — 공용 표 user_api_keys(메인 사이트 「API 설정」에서 한 번 등록, 모든 프로그램 공용).
// 항상 user_id와 provider를 함께 조건으로 건다. 키가 없으면 null이고, 다른 플랫폼·운영자·다른 회원 키로 대신하지 않는다.
// 기준: emotion-writer/src/lib/apiKeys.ts. 이 프로그램에는 키 입력 칸을 만들지 않는다.

export async function getUserApiKey(userId: string, provider: ConvertProvider): Promise<string | null> {
  const { data, error } = await createAdminClient().from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", provider).maybeSingle();
  if (error) throw new Error("본인 API 키를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  const key = typeof data?.api_key === "string" ? data.api_key.trim() : "";
  return key || null;
}

/** 어느 플랫폼 키가 등록돼 있는지만(값은 돌려주지 않는다) */
export async function getRegisteredConvertKeys(userId: string): Promise<KeyStatus> {
  const { data, error } = await createAdminClient()
    .from("user_api_keys")
    .select("provider,api_key")
    .eq("user_id", userId)
    .in("provider", [...CONVERT_PROVIDER_ORDER]);
  if (error) throw new Error("API 키 등록 상태를 확인하지 못했습니다.");
  return Object.fromEntries(CONVERT_PROVIDER_ORDER.map((p) => [p, data?.some((r) => r.provider === p && typeof r.api_key === "string" && r.api_key.trim() !== "") || false])) as KeyStatus;
}
