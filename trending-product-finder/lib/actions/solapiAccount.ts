"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getBalance, sendSms } from "@/lib/solapi/client";

export interface SolapiAccountActionState {
  error?: string;
}

/** SOLAPI 계정(apiKey/apiSecret/발신번호/카카오 채널)을 등록·수정한다. 사용자당 1개(user_id
 * unique, 공용 테이블)라 upsert로 처리한다. */
export async function saveSolapiAccountAction(formData: FormData): Promise<SolapiAccountActionState> {
  const user = await requireProgramAccess();

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const apiSecret = String(formData.get("apiSecret") ?? "").trim();
  const senderPhone = String(formData.get("senderPhone") ?? "").trim();
  const kakaoPfId = String(formData.get("kakaoPfId") ?? "").trim() || null;
  const rcsBrandId = String(formData.get("rcsBrandId") ?? "").trim() || null;

  if (!apiKey) return { error: "API Key를 입력해주세요." };
  if (!apiSecret) return { error: "API Secret을 입력해주세요." };
  if (!senderPhone) return { error: "SOLAPI에 등록된 발신번호를 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("user_solapi_accounts").upsert(
    {
      user_id: user.id,
      api_key: apiKey,
      api_secret: apiSecret,
      sender_phone: senderPhone,
      kakao_pf_id: kakaoPfId,
      rcs_brand_id: rcsBrandId,
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function deleteSolapiAccountAction(): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase.from("user_solapi_accounts").delete().eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export interface CheckSolapiBalanceState {
  error?: string;
  balance?: number;
  point?: number;
}

export async function checkSolapiBalanceAction(): Promise<CheckSolapiBalanceState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: account, error: fetchError } = await supabase
    .from("user_solapi_accounts")
    .select("api_key, api_secret")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !account) return { error: "등록된 SOLAPI 계정이 없습니다." };

  try {
    const result = await getBalance(account);
    return { balance: result.balance, point: result.point };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "잔액 조회에 실패했습니다." };
  }
}

export interface TestSolapiSmsState {
  error?: string;
  success?: boolean;
}

/** 등록된 발신번호로, 사용자가 입력한 본인 번호에 테스트 문자 1통을 보낸다. */
export async function testSolapiSmsAction(toPhone: string): Promise<TestSolapiSmsState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const to = toPhone.trim();
  if (!to) return { error: "테스트로 받을 본인 번호를 입력해주세요." };

  const { data: account, error: fetchError } = await supabase
    .from("user_solapi_accounts")
    .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !account) return { error: "등록된 SOLAPI 계정이 없습니다." };

  try {
    await sendSms(account, to, "[상품소싱 자동화] SOLAPI 계정 테스트 문자입니다.");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "테스트 발송에 실패했습니다." };
  }
}
