"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getBalance, sendSms } from "@/lib/solapi/client";
import { normalizePhone } from "@/lib/desk/consent";

// 회원 본인 SOLAPI 계정(공용 표 user_solapi_accounts — 다른 AIMaster 프로그램에서 등록했으면 그대로 씀). 실거래 프로그램과 같은 방식.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface SolapiAccountActionState {
  error?: string;
  success?: string;
}

export async function saveSolapiAccountAction(_prev: SolapiAccountActionState, formData: FormData): Promise<SolapiAccountActionState> {
  const user = await requireProgramAccess();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const apiSecret = String(formData.get("apiSecret") ?? "").trim();
  const senderPhone = String(formData.get("senderPhone") ?? "").trim();
  if (!apiKey) return { error: "API Key를 넣어 주세요." };
  if (!apiSecret) return { error: "API Secret을 넣어 주세요." };
  if (!senderPhone) return { error: "SOLAPI에 등록한 발신번호를 넣어 주세요." };
  const db = (await createClient()) as unknown as SupabaseLike;
  const { data: existing } = await db.from("user_solapi_accounts").select("kakao_pf_id, rcs_brand_id").eq("user_id", user.id).maybeSingle();
  const { error } = await db.from("user_solapi_accounts").upsert(
    {
      user_id: user.id,
      api_key: apiKey,
      api_secret: apiSecret,
      sender_phone: senderPhone,
      kakao_pf_id: existing?.kakao_pf_id ?? null,
      rcs_brand_id: existing?.rcs_brand_id ?? null,
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: "저장했어요." };
}

export async function deleteSolapiAccountAction(): Promise<void> {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  await db.from("user_solapi_accounts").delete().eq("user_id", user.id);
  revalidatePath("/settings");
}

export async function checkSolapiBalanceAction(): Promise<{ error?: string; balance?: number; point?: number }> {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  const { data: account } = await db.from("user_solapi_accounts").select("api_key, api_secret").eq("user_id", user.id).maybeSingle();
  if (!account) return { error: "등록한 SOLAPI 계정이 없어요." };
  try {
    const r = await getBalance(account);
    return { balance: r.balance, point: r.point };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "잔액을 확인하지 못했어요." };
  }
}

/** 본인 번호로 시험 문자 1통(광고 아님) */
export async function testSolapiSmsAction(toPhone: string): Promise<{ error?: string; success?: boolean }> {
  const user = await requireProgramAccess();
  const to = normalizePhone(toPhone);
  if (!to) return { error: "시험 문자를 받을 본인 휴대폰 번호를 넣어 주세요." };
  const db = (await createClient()) as unknown as SupabaseLike;
  const { data: account } = await db.from("user_solapi_accounts").select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id").eq("user_id", user.id).maybeSingle();
  if (!account) return { error: "등록한 SOLAPI 계정이 없어요." };
  try {
    await sendSms(account, to.replace(/-/g, ""), "[AI 중개사무소 고객관리] SOLAPI 계정 시험 문자입니다.");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "시험 문자를 보내지 못했어요." };
  }
}
