"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface SaveSmtpAccountState {
  error?: string;
}

/**
 * 리포트 알림용 SMTP 계정을 저장한다. 공용 `user_smtp_accounts` 테이블(stepmail 등이 이미
 * 만들어둔 것)을 그대로 재사용하되, 이 프로젝트는 SolapiAccountSection/TelegramSection과
 * 같은 "회원당 계정 1개" 단순 UI로 쓴다 — 이미 등록된 행이 있으면 새로 만들지 않고
 * 덮어쓴다(멀티 계정/공급자별 그룹 UI는 이 프로젝트에는 필요 없음).
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

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("user_smtp_accounts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing && !smtpPassword) {
    return { error: "비밀번호(앱 비밀번호)를 입력해주세요." };
  }

  const error = existing
    ? (
        await supabase
          .from("user_smtp_accounts")
          .update({
            smtp_host: smtpHost,
            smtp_port: smtpPort,
            smtp_user: smtpUser,
            // 비밀번호를 새로 입력하지 않고 수정하면(호스트/이름만 바꾸는 경우) 기존 값을 유지한다.
            ...(smtpPassword ? { smtp_password: smtpPassword } : {}),
            from_name: fromName || null,
            is_active: true,
          })
          .eq("id", existing.id)
      ).error
    : (
        await supabase.from("user_smtp_accounts").insert({
          user_id: user.id,
          label: "카카오톡 뉴스레터 자동화",
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_password: smtpPassword,
          from_name: fromName || null,
          is_active: true,
        })
      ).error;

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function deleteSmtpAccountAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("user_smtp_accounts").delete().eq("user_id", user.id);

  revalidatePath("/settings");
}
