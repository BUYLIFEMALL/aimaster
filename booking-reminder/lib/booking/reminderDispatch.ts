import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendViaSmtpAccount, type SmtpAccountCredentials } from "@/lib/email/transport";
import { sendAlimtalk, sendFriendtalk, sendSms, type SolapiAccountCredentials } from "@/lib/solapi/client";

interface ReminderRule {
  id: string;
  user_id: string;
  name: string;
  offset_minutes: number;
  channel_email: boolean;
  channel_sms: boolean;
  channel_alimtalk: boolean;
  channel_friendtalk: boolean;
  message_subject: string | null;
  message_text: string;
  kakao_template_id: string | null;
  kakao_variables: Record<string, string>;
}

interface DueReservation {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  reservation_at: string;
}

function fillTemplate(text: string, reservation: DueReservation): string {
  const time = new Date(reservation.reservation_at).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return text.replace(/\{name\}/g, reservation.customer_name).replace(/\{time\}/g, time);
}

/**
 * 리마인드 규칙 하나를 실행한다 — "예약일시 + offset_minutes"가 이미 지난(= 발송 시점이
 * 된) 예약 중 아직 이 규칙으로 발송 안 한 건을 찾아 채널별로 발송하고
 * booking_reminder_sends에 기록해 중복 발송을 막는다. cron(app/api/cron/reminder)에서
 * 규칙마다 호출한다.
 *
 * offset_minutes가 음수(예약 전)면 cutoff = now + |offset| → "이제 곧(또는 이미 지난)
 * 예약"이 대상이 되고, 양수(예약 후)면 cutoff = now - offset → "이미 방문 후 offset분
 * 지난" 예약이 대상이 된다 (crm-google-form의 followupDispatch.ts와 동일한 lte 패턴).
 */
export async function runReminderRule(rule: ReminderRule): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient();

  const cutoff = new Date(Date.now() - rule.offset_minutes * 60 * 1000).toISOString();

  const { data: candidates } = await admin
    .from("booking_reservations")
    .select("id, customer_name, customer_phone, customer_email, reservation_at")
    .eq("user_id", rule.user_id)
    .eq("status", "booked")
    .lte("reservation_at", cutoff);

  if (!candidates || candidates.length === 0) return { sent: 0, failed: 0 };

  const { data: alreadySent } = await admin
    .from("booking_reminder_sends")
    .select("reservation_id")
    .eq("rule_id", rule.id)
    .in(
      "reservation_id",
      candidates.map((c) => c.id),
    );
  const sentIds = new Set((alreadySent ?? []).map((s) => s.reservation_id));
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

  for (const reservation of due) {
    // 중복 발송 방지(v1.21): 보내기 전에 발송 기록을 먼저 넣어 선점한다 — (rule_id, reservation_id) 고유 제약 때문에
    // 운영자 호출·회원 호출이 겹쳐도 먼저 넣은 실행만 보낸다. 상태값이 sent/failed뿐이라 「발송 중」은 failed로 넣고 끝나면 고친다
    // (실패한 리마인드는 원래도 다시 보내지 않으므로 중간에 서버가 멈춰도 동작은 예전과 같다).
    const { data: claim, error: claimError } = await admin
      .from("booking_reminder_sends")
      .insert({ user_id: rule.user_id, rule_id: rule.id, reservation_id: reservation.id, status: "failed", error_message: "발송 중" })
      .select("id")
      .maybeSingle();
    if (claimError || !claim) continue;

    const text = fillTemplate(rule.message_text, reservation);
    const errors: string[] = [];

    if (rule.channel_email && reservation.customer_email) {
      if (!smtpAccount) errors.push("SMTP 계정 미등록");
      else {
        try {
          await sendViaSmtpAccount(smtpAccount, reservation.customer_email, rule.message_subject ?? rule.name, `<p>${text}</p>`);
        } catch (err) {
          errors.push(`이메일: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    if ((rule.channel_sms || rule.channel_alimtalk || rule.channel_friendtalk) && reservation.customer_phone) {
      if (!solapiAccount) {
        errors.push("SOLAPI 계정 미등록");
      } else {
        if (rule.channel_sms) {
          try {
            await sendSms(solapiAccount, reservation.customer_phone, text);
          } catch (err) {
            errors.push(`SMS: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        if (rule.channel_alimtalk && rule.kakao_template_id) {
          try {
            // 변수값에도 {name}/{time} 치환을 적용한다 — 예: "#{성함}": "{name}"으로 등록하면
            // 실제 발송 시 예약자 이름으로 바뀐다.
            const variables: Record<string, string> = {};
            for (const [key, value] of Object.entries(rule.kakao_variables)) {
              variables[key] = fillTemplate(value, reservation);
            }
            await sendAlimtalk(solapiAccount, reservation.customer_phone, {
              templateId: rule.kakao_template_id,
              variables,
            });
          } catch (err) {
            errors.push(`알림톡: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        if (rule.channel_friendtalk) {
          try {
            await sendFriendtalk(solapiAccount, reservation.customer_phone, text);
          } catch (err) {
            errors.push(`친구톡: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    }

    const status = errors.length > 0 ? "failed" : "sent";
    if (status === "sent") sent++;
    else failed++;

    await admin
      .from("booking_reminder_sends")
      .update({ status, error_message: errors.length > 0 ? errors.join(" / ") : null, sent_at: new Date().toISOString() })
      .eq("id", claim.id);
  }

  return { sent, failed };
}
