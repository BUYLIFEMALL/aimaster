import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ELEVENST_KEY, maskKey } from "@/lib/elevenst/keys";

// 공용 저장소(user_api_keys)에서 회원 본인 값만 읽는다(RLS 본인 행). 다른 프로그램에서 이미 등록한 값은 다시 묻지 않는다.

export interface SetupStatus {
  elevenstKey: string; // 끝 4자리만, 없으면 ""
}

async function readRaw(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("user_api_keys").select("provider, api_key").eq("user_id", userId).eq("provider", ELEVENST_KEY);
  const by = new Map((data ?? []).map((r: { provider: string; api_key: string }) => [r.provider, r.api_key]));
  return { apiKey: by.get(ELEVENST_KEY) ?? "" };
}

export async function getSetupStatus(userId: string): Promise<SetupStatus> {
  const r = await readRaw(userId);
  return { elevenstKey: r.apiKey ? maskKey(r.apiKey) : "" };
}

/** 서버 호출용 본인 키(없으면 null). 화면에 내보내지 않는다 */
export async function getElevenstKeys(userId: string): Promise<{ apiKey: string } | null> {
  const r = await readRaw(userId);
  return r.apiKey ? { apiKey: r.apiKey } : null;
}
