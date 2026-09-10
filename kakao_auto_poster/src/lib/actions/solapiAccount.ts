"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getBalance, sendSms } from "@/lib/solapi/client";

export interface SolapiAccountActionState {
  error?: string;
}

/**
 * SOLAPI 계정(apiKey/apiSecret/발신번호/카카오 채널)을 등록·수정한다. 사용자당 1개(user_id
 * unique, 공용 테이블)라 upsert로 처리한다 — trending-product-finder/lib/actions/
 * solapiAccount.ts와 동일 구현.
 */
export async function saveSolapiAccountAction(formData: FormData): Promise<SolapiAccountActionState> {
  const user = await requireProgramAccess();

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const apiSecret = String(formData.get("apiSecret") ?? "").trim();
  const senderPhone = String(formData.get("senderPhone") ?? "").trim();
  const kakaoPfId = String(formData.get("kakaoPfId") ?? "").trim() || null;
  const rcsBrandId = String(formData.get("rcsBrandId") ?? "").trim() || null;
  const channelFriendUrl = String(formData.get("channelFriendUrl") ?? "").trim() || null;
  const alimtalkTemplateId = String(formData.get("alimtalkTemplateId") ?? "").trim() || null;

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
      channel_friend_url: channelFriendUrl,
      alimtalk_template_id: alimtalkTemplateId,
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

/**
 * 카카오 발송과 이메일을 함께/대체로 쓸지 켜고 끄는 토글 — 수신자 목록 화면의 "자유
 * 메시지 발송" 버튼 옆에 둔다(사용자 지시, 2026-09-10). ON이면 카카오 발송이 성공해도
 * 이메일이 등록된 사람에게는 이메일도 함께 보내고, 카카오 발송이 실패하면 이메일로
 * 대체 발송한다. OFF면 이 자동화 발송 경로들에서 이메일을 전혀 건드리지 않고 카카오만
 * 시도한다(전화번호 없는 이메일 전용 수신자는 이 설정과 무관하게 항상 이메일로 받는다).
 * SOLAPI 계정이 아직 없으면 켤 대상 자체가 없으므로 에러를 반환한다.
 */
export async function setEmailDualSendEnabledAction(enabled: boolean): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_solapi_accounts")
    .update({ email_dual_send_enabled: enabled })
    .eq("user_id", user.id)
    .select("user_id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "SOLAPI 계정을 먼저 등록해주세요." };

  revalidatePath("/recipients");
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
    await sendSms(account, to, "[카카오톡 뉴스레터 자동화] SOLAPI 계정 테스트 문자입니다.");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "테스트 발송에 실패했습니다." };
  }
}
