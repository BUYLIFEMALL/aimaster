import "server-only";
import { createClient } from "@/lib/supabase/server";
import { WING_FIELDS, WING_KEYS, maskKey, type WingField, type WingKeys } from "@/lib/coupang/keys";
import { normalizeDefaults } from "@/lib/coupang/defaults";

/** 회원 본인 쿠팡 키(서버 전용 — 화면에 원문을 넘기지 않는다). 하나라도 없으면 null */
export async function getWingKeys(userId: string): Promise<(WingKeys & { userId: string }) | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", userId)
    .in("provider", Object.values(WING_KEYS));
  const byProvider = new Map((data ?? []).map((r: { provider: string; api_key: string }) => [r.provider, r.api_key]));
  const keys = Object.fromEntries(WING_FIELDS.map((f) => [f, byProvider.get(WING_KEYS[f]) ?? ""])) as WingKeys;
  return WING_FIELDS.every((f) => keys[f]) ? { ...keys, userId } : null; // userId는 호출 수 기록용
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

/** 배송·반품 기본값(없으면 null) */
export async function getCoupangDefaults(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("coupang_ops_defaults").select("data").eq("user_id", userId).maybeSingle();
  return data?.data ? normalizeDefaults(data.data as Record<string, unknown>) : null;
}
