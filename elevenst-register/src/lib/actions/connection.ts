"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { ELEVENST_KEY, PROXY_KEY, validateElevenstKey, validateProxyUrl } from "@/lib/elevenst/keys";
import { getElevenstKeys } from "@/lib/setupStatus";
import { ElevenstApiError, elevenstRequest, outgoingIp } from "@/lib/elevenst/client";
import { parseAreas, type Area } from "@/lib/elevenst/areas";

// 모든 쓰기는 프로그램 이용 권한 확인 + 본인 행(user_id)만(CLAUDE.md 멀티테넌시 원칙 1·2).

async function saveKey(provider: string, value: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { error } = await supabase.from("user_api_keys").upsert({ user_id: user.id, provider, api_key: value }, { onConflict: "user_id,provider" });
  if (error) return { error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/connect");
  revalidatePath("/home");
  return { ok: true };
}

async function deleteKey(provider: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { error } = await supabase.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", provider);
  if (error) return { error: "지우지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/connect");
  revalidatePath("/home");
  return { ok: true };
}

export async function saveElevenstKeyAction(raw: string): Promise<{ ok?: boolean; error?: string }> {
  const { key, error } = validateElevenstKey(raw);
  return key ? saveKey(ELEVENST_KEY, key) : { error };
}

export async function deleteElevenstKeyAction(): Promise<{ ok?: boolean; error?: string }> {
  return deleteKey(ELEVENST_KEY);
}

export async function saveProxyAction(raw: string): Promise<{ ok?: boolean; error?: string }> {
  const { url, error } = validateProxyUrl(raw);
  return url ? saveKey(PROXY_KEY, url) : { error };
}

export async function deleteProxyAction(): Promise<{ ok?: boolean; error?: string }> {
  return deleteKey(PROXY_KEY);
}

export type ConnectionResult =
  | { ok: true; outbound: Area[]; inbound: Area[]; checkedAt: string }
  | { ok: false; step: "keys" | "outbound" | "inbound"; error: string };

/** 연결 시험 = 출고지 주소 조회(키·IP 확인) + 반품/교환지 주소 조회. 읽기만 하고 11번가에 아무것도 만들지 않는다 */
export async function testConnectionAction(): Promise<ConnectionResult> {
  const user = await requireProgramAccess();
  const keys = await getElevenstKeys(user.id);
  if (!keys) return { ok: false, step: "keys", error: "먼저 11번가 API 키를 저장해 주세요." };
  let outbound: Area[] = [];
  try {
    const r = await elevenstRequest(keys, "GET", "/rest/areaservice/outboundarea");
    outbound = parseAreas(r.text).areas;
  } catch (e) {
    const ip = e instanceof ElevenstApiError && e.status !== 0 ? await outgoingIp(keys.proxyUrl) : "";
    const msg = e instanceof ElevenstApiError ? e.message : "11번가에 연결하지 못했습니다.";
    return { ok: false, step: "outbound", error: ip ? `${msg} 지금 11번가로 나가는 IP는 ${ip}입니다.` : msg };
  }
  try {
    const r = await elevenstRequest(keys, "GET", "/rest/areaservice/inboundarea");
    return { ok: true, outbound, inbound: parseAreas(r.text).areas, checkedAt: new Date().toISOString() };
  } catch (e) {
    return { ok: false, step: "inbound", error: `키와 IP는 맞습니다(출고지 ${outbound.length}곳 확인). 반품/교환지 조회만 실패했습니다: ${e instanceof ElevenstApiError ? e.message : "연결 오류"}` };
  }
}
