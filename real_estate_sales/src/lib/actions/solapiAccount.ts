"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getBalance, sendSms } from "@/lib/solapi/client";

export interface SolapiAccountActionState {
  error?: string;
  success?: string;
}

/** SOLAPI 계정(apiKey/apiSecret/발신번호/카카오 채널)을 등록·수정한다. 사용자당 1개(user_id
 * unique, 다른 AIMaster 프로그램과 공유하는 공용 테이블)라 upsert로 처리한다. */
export async function saveSolapiAccountAction(
  _prevState: SolapiAccountActionState,
  formData: FormData,
): Promise<SolapiAccountActionState> {
  const user = await requireProgramAccess();

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const apiSecret = String(formData.get("apiSecret") ?? "").trim();
  const senderPhone = String(formData.get("senderPhone") ?? "").trim();
  const kakaoPfId = String(formData.get("kakaoPfId") ?? "").trim() || null;

  if (!apiKey) return { error: "API Key를 입력해주세요." };
  if (!apiSecret) return { error: "API Secret을 입력해주세요." };
  if (!senderPhone) return { error: "SOLAPI에 등록된 발신번호를 입력해주세요." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("user_solapi_accounts")
    .select("rcs_brand_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("user_solapi_accounts").upsert(
    {
      user_id: user.id,
      api_key: apiKey,
      api_secret: apiSecret,
      sender_phone: senderPhone,
      kakao_pf_id: kakaoPfId,
      rcs_brand_id: existing?.rcs_brand_id ?? null,
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: "저장됐어요." };
}

export async function deleteSolapiAccountAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("user_solapi_accounts").delete().eq("user_id", user.id);
  revalidatePath("/settings");
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
    await sendSms(account, to, "[부동산 실거래 투자분석 자동화] SOLAPI 계정 테스트 문자입니다.");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "테스트 발송에 실패했습니다." };
  }
}

export interface KakaoTemplateActionState {
  error?: string;
  success?: string;
}

/** 실거래 알림에서 "카카오 알림톡" 채널을 쓰려면, 본인 Solapi 계정에 미리 승인받은
 * 템플릿 ID를 등록해야 한다. 발송 문구 전체를 하나의 변수(#{내용})로 담는 템플릿을
 * 승인받아 등록하도록 설정 화면에서 안내한다. */
export async function saveKakaoTemplateAction(
  _prevState: KakaoTemplateActionState,
  formData: FormData,
): Promise<KakaoTemplateActionState> {
  const user = await requireProgramAccess();
  const templateId = String(formData.get("templateId") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("real_estate_kakao_templates")
    .upsert({ user_id: user.id, template_id: templateId }, { onConflict: "user_id" });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: "저장됐어요." };
}
