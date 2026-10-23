import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { PublicDataKeys } from "./client";

/**
 * 회원이 설정에 등록한 본인 공공데이터 키를 모아 돌려준다. 등록하지 않은 항목은 비워 두며,
 * 그러면 client.ts가 운영자 공용 키(환경변수)로 호출한다. VWorld 키와 도메인은 짝이라 둘 다 있을 때만 쓴다.
 */
export async function resolveMemberPublicDataKeys(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<PublicDataKeys> {
  const { data } = await supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", userId)
    .in("provider", ["seoul_opendata_api_key", "data_go_kr_service_key", "vworld_api_key", "vworld_domain"]);
  const map = new Map((data ?? []).map((r) => [r.provider as string, r.api_key as string]));
  const vworld = map.get("vworld_api_key");
  const vworldDomain = map.get("vworld_domain");
  return {
    seoul: map.get("seoul_opendata_api_key") || undefined,
    dataGoKr: map.get("data_go_kr_service_key") || undefined,
    ...(vworld && vworldDomain ? { vworld, vworldDomain } : {}),
  };
}
