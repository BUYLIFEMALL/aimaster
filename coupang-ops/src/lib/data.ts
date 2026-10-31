import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PROXY_KEY, WING_FIELDS, WING_KEYS, maskKey, maskProxyUrl, type WingField, type WingKeys } from "@/lib/coupang/keys";
import { normalizeDefaults } from "@/lib/coupang/defaults";
import { normalizePrefs } from "@/lib/coupang/prefs";

/** 회원 본인 쿠팡 키(서버 전용 — 화면에 원문을 넘기지 않는다). 하나라도 없으면 null */
export async function getWingKeys(userId: string): Promise<(WingKeys & { userId: string; proxyUrl: string }) | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", userId)
    .in("provider", [...Object.values(WING_KEYS), PROXY_KEY]);
  const byProvider = new Map((data ?? []).map((r: { provider: string; api_key: string }) => [r.provider, r.api_key]));
  const keys = Object.fromEntries(WING_FIELDS.map((f) => [f, byProvider.get(WING_KEYS[f]) ?? ""])) as WingKeys;
  return WING_FIELDS.every((f) => keys[f]) ? { ...keys, userId, proxyUrl: byProvider.get(PROXY_KEY) ?? "" } : null; // userId는 호출 수 기록용
}

/** 예약 실행용(로그인 세션 없음): 회원 토큰으로 확인된 그 회원의 키만 서버 키로 읽는다 */
export async function getWingKeysForJob(userId: string): Promise<(WingKeys & { userId: string; proxyUrl: string }) | null> {
  const { data } = await createAdminClient().from("user_api_keys").select("provider, api_key").eq("user_id", userId).in("provider", [...Object.values(WING_KEYS), PROXY_KEY]);
  const byProvider = new Map((data ?? []).map((r: { provider: string; api_key: string }) => [r.provider, r.api_key]));
  const keys = Object.fromEntries(WING_FIELDS.map((f) => [f, byProvider.get(WING_KEYS[f]) ?? ""])) as WingKeys;
  return WING_FIELDS.every((f) => keys[f]) ? { ...keys, userId, proxyUrl: byProvider.get(PROXY_KEY) ?? "" } : null;
}

/** 화면 표시용: 저장 여부와 가린 값(업체코드·WING ID는 그대로, 키 두 개는 끝 4자리) */
export async function getWingKeyStatus(userId: string): Promise<{ saved: boolean; shown: Partial<Record<WingField, string>> }> {
  const keys = await getWingKeys(userId);
  if (!keys) return { saved: false, shown: {} };
  return {
    saved: true,
    shown: { vendorId: keys.vendorId, wingUserId: keys.wingUserId, accessKey: maskKey(keys.accessKey), secretKey: maskKey(keys.secretKey) },
  };
}

/** 화면 표시용 고정 IP 프록시 주소(비밀번호 가림). 없으면 빈 문자열 */
export async function getProxyStatus(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", PROXY_KEY).maybeSingle();
  return data?.api_key ? maskProxyUrl(data.api_key as string) : "";
}

/** 화면 표시용 AI 키 상태(끝 4자리만). 다른 프로그램에서 등록한 키도 그대로 보인다 */
export async function getAiKeyStatus(userId: string): Promise<Partial<Record<"anthropic" | "openai" | "gemini", string>>> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_api_keys").select("provider, api_key").eq("user_id", userId).in("provider", ["anthropic", "openai", "gemini"]);
  return Object.fromEntries((data ?? []).map((r: { provider: string; api_key: string }) => [r.provider, maskKey(r.api_key)]));
}

/** WING 키 만료일(S1). 없으면 빈 문자열. 예약 실행은 로그인 세션이 없어 서버 키로 그 회원 행만 읽는다 */
export async function getKeyExpiry(userId: string, asJob = false): Promise<string> {
  const db = asJob ? createAdminClient() : await createClient();
  const { data } = await db.from("coupang_ops_prefs").select("data").eq("user_id", userId).maybeSingle();
  return normalizePrefs(data?.data).wingKeyExpiry;
}

/** 배송·반품 기본값(없으면 null) */
export async function getCoupangDefaults(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("coupang_ops_defaults").select("data").eq("user_id", userId).maybeSingle();
  return data?.data ? normalizeDefaults(data.data as Record<string, unknown>) : null;
}
