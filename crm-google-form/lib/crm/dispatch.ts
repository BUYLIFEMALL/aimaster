import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendViaSmtpAccount } from "@/lib/email/transport";
import { sendTelegramMessage } from "@/lib/telegram/client";

interface FormSourceRow {
  id: string;
  user_id: string;
  name: string;
  notify_email: boolean;
  notify_telegram: boolean;
}

interface SubmissionRow {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  raw_values: Record<string, string>;
}

/**
 * 웹훅으로 접수된 신청 1건에 대해, 신청자에게 이메일(SMTP)을 보내고 운영자 본인에게
 * 텔레그램 알림을 보낸다. 웹훅 라우트(로그인 세션 없음)에서 admin client로 호출되므로,
 * 여기서도 admin client(service role)를 쓰고 반드시 user_id로 직접 필터링한다.
 *
 * Phase 1 범위: 이메일 + 텔레그램만. SMS/카카오(SOLAPI)는 Phase 2~3에서 여기에 이어붙인다.
 */
export async function dispatchSubmissionNotifications(
  source: FormSourceRow,
  submission: SubmissionRow,
): Promise<{ status: "notified" | "failed"; errorMessage?: string }> {
  const admin = createAdminClient();
  const errors: string[] = [];

  if (source.notify_email && submission.email) {
    const { data: smtpAccount } = await admin
      .from("crm_smtp_accounts")
      .select("smtp_host, smtp_port, smtp_user, smtp_password, from_name, label")
      .eq("user_id", source.user_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (smtpAccount) {
      try {
        const displayName = submission.name ? `${submission.name}님` : "고객님";
        await sendViaSmtpAccount(
          smtpAccount,
          submission.email,
          `${displayName}의 신청접수가 완료되었습니다`,
          `<p>${displayName}, "${source.name}" 신청이 정상적으로 접수되었습니다.</p><p>빠른 시간 내에 확인 후 연락드리겠습니다.</p>`,
        );
      } catch (err) {
        errors.push(`이메일 발송 실패: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (source.notify_telegram) {
    const { data: telegramLink } = await admin
      .from("user_telegram_links")
      .select("bot_token, chat_id")
      .eq("user_id", source.user_id)
      .maybeSingle();

    if (telegramLink) {
      try {
        const lines = Object.entries(submission.raw_values).map(([q, a]) => `✅ ${q} : ${a}`);
        await sendTelegramMessage({
          botToken: telegramLink.bot_token,
          chatId: telegramLink.chat_id,
          text: `📋 새 신청 접수 — ${source.name}\n\n${lines.join("\n")}`,
        });
      } catch (err) {
        errors.push(`텔레그램 알림 실패: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (errors.length > 0) {
    return { status: "failed", errorMessage: errors.join(" / ") };
  }
  return { status: "notified" };
}
