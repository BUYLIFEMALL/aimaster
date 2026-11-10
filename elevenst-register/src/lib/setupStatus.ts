import "server-only";
import { createClient } from "@/lib/supabase/server";

// 공용 저장소(user_api_keys)에서 회원 본인 값만 읽는다(RLS 본인 행). 다른 프로그램에서 이미 등록한 값은 다시 묻지 않는다.
// - elevenst_api_key: 상품소싱기에서 쓰던 11번가 Open API 키(같은 키로 Seller API가 되는지는 2단계 연결 시험에서 확정)
// - fixed_ip_proxy_url: 쿠팡 운영에서 등록한 회원 본인 고정 IP(Fixie) 주소
export const ELEVENST_KEY = "elevenst_api_key";
export const PROXY_KEY = "fixed_ip_proxy_url";

export interface SetupStatus {
  elevenstKey: string; // 끝 4자리만, 없으면 ""
  proxy: string; // 토큰 가린 주소, 없으면 ""
}

function maskKey(v: string) {
  return v.length > 4 ? `••••${v.slice(-4)}` : "••••";
}

/** 고정 IP 주소의 토큰 부분을 가린다(`http://fixie:토큰@호스트:80` → `http://fixie:••••@호스트:80`) */
export function maskProxyUrl(v: string) {
  return v.replace(/\/\/([^:/@]+):[^@]+@/, "//$1:••••@");
}

export async function getSetupStatus(userId: string): Promise<SetupStatus> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_api_keys").select("provider, api_key").eq("user_id", userId).in("provider", [ELEVENST_KEY, PROXY_KEY]);
  const by = new Map((data ?? []).map((r: { provider: string; api_key: string }) => [r.provider, r.api_key]));
  const key = by.get(ELEVENST_KEY) ?? "";
  const proxy = by.get(PROXY_KEY) ?? "";
  return { elevenstKey: key ? maskKey(key) : "", proxy: proxy ? maskProxyUrl(proxy) : "" };
}
