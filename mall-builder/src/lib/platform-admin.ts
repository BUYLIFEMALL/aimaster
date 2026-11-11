// T0: 운영에서 「몰 만들기」는 AIMaster 관리자만(주인님 결정 2026-11-12). 화면에서 숨기고 DB(0058)도 다시 막는다.
import { PLATFORM_AIMASTER } from "./platform";
import { createAdminClient } from "./supabase/admin";

/** 몰을 새로 만들 수 있는 사람인가 — Lab·키트는 누구나, 운영은 profiles.is_admin만 */
export async function canCreateStore(userId: string): Promise<boolean> {
  if (!PLATFORM_AIMASTER) return true;
  const { data } = await createAdminClient().from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return data?.is_admin === true;
}

/** 운영에서 일반 회원에게 보여 줄 샘플몰 주소 */
export const SAMPLE_MALL_SLUG = process.env.NEXT_PUBLIC_SAMPLE_MALL_SLUG ?? "aimaster-b2b";
