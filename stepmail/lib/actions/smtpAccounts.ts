"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { sendViaSmtpAccount } from "@/lib/email/transport";

export interface CreateSmtpAccountState {
  error?: string;
}

/** SMTP 계정을 등록한다. 저장 전 실제로 로그인 가능한지 검증하지는 않는다(계정마다 프로토콜
 * 세부사항이 달라 저장 시점 검증이 오히려 오탐을 낼 수 있음) — 대신 "테스트 발송" 버튼으로
 * 등록 후 바로 검증하게 한다. */
export async function createSmtpAccountAction(formData: FormData): Promise<CreateSmtpAccountState> {
  const user = await requireProgramAccess();

  const label = String(formData.get("label") ?? "").trim();
  const provider = String(formData.get("provider") ?? "").trim() || null;
  const smtpHost = String(formData.get("smtpHost") ?? "").trim();
  const smtpPort = Number(formData.get("smtpPort")) || 587;
  const smtpUser = String(formData.get("smtpUser") ?? "").trim();
  const smtpPassword = String(formData.get("smtpPassword") ?? "").trim();
  const fromName = String(formData.get("fromName") ?? "").trim() || null;

  if (!label) return { error: "계정 별칭을 입력해주세요." };
  if (!smtpHost) return { error: "SMTP 호스트를 입력해주세요." };
  if (!smtpUser) return { error: "로그인 계정(이메일)을 입력해주세요." };
  if (!smtpPassword) return { error: "비밀번호(앱 비밀번호)를 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("user_smtp_accounts").insert({
    user_id: user.id,
    label,
    provider,
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_user: smtpUser,
    smtp_password: smtpPassword,
    from_name: fromName,
  });

  if (error) return { error: error.message };

  revalidatePath("/accounts");
  return {};
}

/** SMTP 계정 정보를 수정한다. 비밀번호는 입력한 경우에만 갱신하고, 비워두면 기존 값을 유지한다. */
export async function updateSmtpAccountAction(accountId: string, formData: FormData): Promise<CreateSmtpAccountState> {
  const user = await requireProgramAccess();

  const label = String(formData.get("label") ?? "").trim();
  const smtpHost = String(formData.get("smtpHost") ?? "").trim();
  const smtpPort = Number(formData.get("smtpPort")) || 587;
  const smtpUser = String(formData.get("smtpUser") ?? "").trim();
  const smtpPassword = String(formData.get("smtpPassword") ?? "").trim();
  const fromName = String(formData.get("fromName") ?? "").trim() || null;

  if (!label) return { error: "계정 별칭을 입력해주세요." };
  if (!smtpHost) return { error: "SMTP 호스트를 입력해주세요." };
  if (!smtpUser) return { error: "로그인 계정(이메일)을 입력해주세요." };

  const supabase = await createClient();
  const updatePayload: {
    label: string;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    from_name: string | null;
    smtp_password?: string;
  } = { label, smtp_host: smtpHost, smtp_port: smtpPort, smtp_user: smtpUser, from_name: fromName };
  if (smtpPassword) updatePayload.smtp_password = smtpPassword;

  const { error } = await supabase.from("user_smtp_accounts").update(updatePayload).eq("id", accountId).eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/accounts");
  return {};
}

export async function deleteSmtpAccountAction(accountId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_smtp_accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/accounts");
  return {};
}

export async function toggleSmtpAccountActiveAction(accountId: string, isActive: boolean): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_smtp_accounts")
    .update({ is_active: isActive })
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/accounts");
  return {};
}

export interface TestSmtpAccountState {
  error?: string;
  success?: boolean;
}

/** 등록된 SMTP 계정으로 본인(로그인 이메일)에게 테스트 메일 1통을 보낸다. */
export async function testSmtpAccountAction(accountId: string): Promise<TestSmtpAccountState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: account, error: fetchError } = await supabase
    .from("user_smtp_accounts")
    .select("smtp_host, smtp_port, smtp_user, smtp_password, from_name, label")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !account) return { error: "계정을 찾을 수 없습니다." };
  if (!user.email) return { error: "본인 로그인 이메일을 확인할 수 없습니다." };

  try {
    await sendViaSmtpAccount(
      account,
      user.email,
      `[STEP Mail] "${account.label}" 계정 테스트 발송`,
      `<p>이 메일은 STEP Mail에서 "${account.label}" 이메일 계정 설정이 정상 작동하는지 확인하기 위한 테스트 메일입니다.</p>`,
    );
    await logProgramUsage({ userId: user.id, action: "test_smtp_send", metadata: { accountId } });
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "테스트 발송에 실패했습니다." };
  }
}
