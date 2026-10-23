"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface SaveSmtpAccountState {
  error?: string;
}

/**
 * 리포트 알림용 SMTP 계정을 새로 등록한다. 공용 `user_smtp_accounts` 테이블(stepmail 등이
 * 이미 만들어둔 것)을 그대로 재사용한다 — 다른 프로그램에서 이미 여러 개(예: Gmail+네이버)
 * 등록해뒀을 수 있어(실제로 buylifemall 계정에 2개 존재) "회원당 1개"로 단정하지 않고
 * 항상 새 행으로 추가한다. 발송 시(lib/emailNotify.ts)는 is_active=true인 것 중 하나를
 * 골라 쓴다.
 */
export async function saveSmtpAccountAction(
  _prevState: SaveSmtpAccountState,
  formData: FormData,
): Promise<SaveSmtpAccountState> {
  const user = await requireProgramAccess();
  const smtpHost = String(formData.get("smtpHost") ?? "").trim();
  const smtpPort = Number(formData.get("smtpPort") ?? 587);
  const smtpUser = String(formData.get("smtpUser") ?? "").trim();
  const smtpPassword = String(formData.get("smtpPassword") ?? "");
  const fromName = String(formData.get("fromName") ?? "").trim();

  if (!smtpHost || !smtpUser) return { error: "SMTP 호스트와 계정을 입력해주세요." };
  if (!smtpPassword) return { error: "비밀번호(앱 비밀번호)를 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("user_smtp_accounts").insert({
    user_id: user.id,
    label: smtpUser,
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_user: smtpUser,
    smtp_password: smtpPassword,
    from_name: fromName || null,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function deleteSmtpAccountAction(id: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("user_smtp_accounts").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/settings");
}
