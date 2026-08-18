import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendViaSmtpAccount, type SmtpAccountCredentials } from "@/lib/email/transport";
import { sendAlimtalk, sendFriendtalk, sendSms, type SolapiAccountCredentials } from "@/lib/solapi/client";

interface FollowupRule {
  id: string;
  user_id: string;
  form_source_id: string;
  name: string;
  days_after: number;
  channel_email: boolean;
  channel_sms: boolean;
  channel_alimtalk: boolean;
  channel_friendtalk: boolean;
  message_subject: string | null;
  message_text: string;
  kakao_template_id: string | null;
  kakao_variables: Record<string, string>;
}

interface DueSubmission {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  raw_values: Record<string, string>;
}

function fillTemplate(text: string, submission: DueSubmission): string {
  return text.replace(/\{name\}/g, submission.name ?? "고객");
}

/**
 * 활성화된 팔로우업 규칙 하나를 실행한다 — 조건에 맞는(days_after 경과 + 아직 발송 안 한)
 * 접수건을 찾아 채널별로 발송하고, crm_followup_sends에 기록해 중복 발송을 막는다.
 * cron(app/api/cron/followup)에서 규칙마다 호출한다.
 */
export async function runFollowupRule(rule: FollowupRule): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient();

  const cutoff = new Date(Date.now() - rule.days_after * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates } = await admin
    .from("crm_submissions")
    .select("id, name, phone, email, raw_values")
    .eq("form_source_id", rule.form_source_id)
    .lte("created_at", cutoff);

  if (!candidates || candidates.length === 0) return { sent: 0, failed: 0 };

  const { data: alreadySent } = await admin
    .from("crm_followup_sends")
    .select("submission_id")
    .eq("rule_id", rule.id)
    .in(
      "submission_id",
      candidates.map((c) => c.id),
    );
  const sentIds = new Set((alreadySent ?? []).map((s) => s.submission_id));
  const due = candidates.filter((c) => !sentIds.has(c.id));

  if (due.length === 0) return { sent: 0, failed: 0 };

  let smtpAccount: SmtpAccountCredentials | null = null;
  let solapiAccount: SolapiAccountCredentials | null = null;

  if (rule.channel_email) {
    const { data } = await admin
      .from("user_smtp_accounts")
      .select("smtp_host, smtp_port, smtp_user, smtp_password, from_name")
      .eq("user_id", rule.user_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    smtpAccount = data;
  }
  if (rule.channel_sms || rule.channel_alimtalk || rule.channel_friendtalk) {
    const { data } = await admin
      .from("user_solapi_accounts")
      .select("api_key, api_secret, sender_phone, kakao_pf_id")
      .eq("user_id", rule.user_id)
      .maybeSingle();
    solapiAccount = data as SolapiAccountCredentials | null;
  }

  let sent = 0;
  let failed = 0;

  for (const submission of due) {
    const text = fillTemplate(rule.message_text, submission);
    const errors: string[] = [];

    if (rule.channel_email && submission.email) {
      if (!smtpAccount) errors.push("SMTP 계정 미등록");
      else {
        try {
          await sendViaSmtpAccount(
            smtpAccount,
            submission.email,
            rule.message_subject ?? rule.name,
            `<p>${text}</p>`,
          );
        } catch (err) {
          errors.push(`이메일: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    if ((rule.channel_sms || rule.channel_alimtalk || rule.channel_friendtalk) && submission.phone) {
      if (!solapiAccount) {
        errors.push("SOLAPI 계정 미등록");
      } else {
        if (rule.channel_sms) {
          try {
            await sendSms(solapiAccount, submission.phone, text);
          } catch (err) {
            errors.push(`SMS: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        if (rule.channel_alimtalk && rule.kakao_template_id) {
          try {
            const variables: Record<string, string> = {};
            for (const [kakaoVar, question] of Object.entries(rule.kakao_variables)) {
              variables[kakaoVar] = submission.raw_values[question] ?? "";
            }
            await sendAlimtalk(solapiAccount, submission.phone, {
              templateId: rule.kakao_template_id,
              variables,
            });
          } catch (err) {
            errors.push(`알림톡: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        if (rule.channel_friendtalk) {
          try {
            await sendFriendtalk(solapiAccount, submission.phone, text);
          } catch (err) {
            errors.push(`친구톡: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    }

    const status = errors.length > 0 ? "failed" : "sent";
    if (status === "sent") sent++;
    else failed++;

    await admin.from("crm_followup_sends").insert({
      user_id: rule.user_id,
      rule_id: rule.id,
      submission_id: submission.id,
      status,
      error_message: errors.length > 0 ? errors.join(" / ") : null,
    });
  }

  return { sent, failed };
}
