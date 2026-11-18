import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendViaSmtpAccount, type SmtpAccountCredentials } from "@/lib/email/transport";
import { sendAlimtalk, sendFriendtalk, sendSms, type SolapiAccountCredentials } from "@/lib/solapi/client";
import { followupAllowed } from "@/lib/crm/submissionStatus";

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
  status: string | null;
}

function fillTemplate(text: string, submission: DueSubmission): string {
  return text.replace(/\{name\}/g, submission.name ?? "고객");
}


export interface FollowupRunResult {
  sent: number;
  failed: number;
  /** 결과 미확정이라 보류(발송·기록 0 — 나중에 확정되면 다음 실행에서 보냄) */
  held: number;
  /** 보내는 도중 상태가 미확정으로 바뀌어 남은 채널을 멈춘 건(이미 보낸 채널이 있어 기록은 남김, 자동 재발송 0) */
  interrupted: number;
  /**
   * 한 채널도 보내기 전에 상태가 미확정으로 바뀌었는데 선점 기록을 지우지 못한 건(오류·예외·0행·행 수 불명).
   * 기록이 남아 있어 상태가 확정돼도 **자동으로 재개되지 않는다** — 운영자가 예약 실행 결과(요약)에서 보고 확인해야 한다.
   * 자동 재삭제·재발송 0.
   */
  releaseFailed: number;
  /** 규칙 자체를 실행하지 않은 이유(폼 연결 소유 불일치·조회 실패) */
  skippedReason?: string;
}

type Admin = ReturnType<typeof createAdminClient>;

/**
 * 이 규칙 회원·이 폼의 접수인지와 최신 상태를 다시 읽어 팔로우업을 보내도 되는지 본다.
 * 조회 실패·행 없음(다른 회원 접수 포함)이면 false. DB 읽기와 외부 발송 사이의 아주 짧은 틈까지 막는 원자 보장은 아니다
 * (트랜잭션 없이 외부 API를 부르기 때문) — 읽기 시점의 최신 상태만 보장한다.
 */
async function ownedAndAllowed(admin: Admin, rule: FollowupRule, submissionId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("crm_submissions")
    .select("id, status")
    .eq("id", submissionId)
    .eq("user_id", rule.user_id)
    .eq("form_source_id", rule.form_source_id)
    .maybeSingle();
  if (error || !data) return false;
  return followupAllowed((data as { status: string | null }).status);
}

/**
 * 활성화된 팔로우업 규칙 하나를 실행한다 — 조건에 맞는(days_after 경과 + 아직 발송 안 한)
 * 접수건을 찾아 채널별로 발송하고, crm_followup_sends에 먼저 기록(선점)해 중복 발송을 막는다.
 * lib/schedulerMember/dispatch.ts(운영자 cron·회원 cron-job.org 공용)에서 규칙마다 호출한다.
 *
 * 회원 경계(2026-11-18 CRM18-05): 규칙의 폼 연결이 규칙 회원 것인지 먼저 확인하고, 후보·중복 조회·재확인 모두
 * user_id와 form_source_id를 함께 건다 — 다른 회원이 남의 폼 id로 넣은 접수는 후보·보류 개수 어디에도 섞이지 않는다.
 * 미확정 보류(주인님 결정 2026-11-18): 선점 직전과 채널마다 발송 직전에 최신 상태를 다시 읽는다.
 */
export async function runFollowupRule(rule: FollowupRule): Promise<FollowupRunResult> {
  const admin = createAdminClient();
  const empty = { sent: 0, failed: 0, held: 0, interrupted: 0, releaseFailed: 0 };

  const { data: source, error: sourceError } = await admin
    .from("crm_form_sources")
    .select("id")
    .eq("id", rule.form_source_id)
    .eq("user_id", rule.user_id)
    .maybeSingle();
  if (sourceError) return { ...empty, skippedReason: "폼 연결 조회 실패" };
  if (!source) return { ...empty, skippedReason: "규칙의 폼 연결이 이 회원 것이 아님" };

  const cutoff = new Date(Date.now() - rule.days_after * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates, error: candidatesError } = await admin
    .from("crm_submissions")
    .select("id, name, phone, email, raw_values, status")
    .eq("form_source_id", rule.form_source_id)
    .eq("user_id", rule.user_id)
    .lte("created_at", cutoff);
  if (candidatesError) return { ...empty, skippedReason: "접수 조회 실패" };
  if (!candidates || candidates.length === 0) return empty;

  const { data: alreadySent, error: alreadyError } = await admin
    .from("crm_followup_sends")
    .select("submission_id")
    .eq("rule_id", rule.id)
    .eq("user_id", rule.user_id)
    .in(
      "submission_id",
      candidates.map((c) => c.id),
    );
  if (alreadyError) return { ...empty, skippedReason: "발송 기록 조회 실패" };
  const sentIds = new Set((alreadySent ?? []).map((s) => s.submission_id));
  const notYetSent = candidates.filter((c) => !sentIds.has(c.id));
  // 주인님 결정(2026-11-18): 접수 확인 발송 결과가 확정되지 않은 접수는 팔로우업을 보류한다.
  // 보류 건은 발송·선점 기록을 남기지 않으므로, 나중에 상태가 확정되면 다음 실행 때 한 번 보낸다.
  const due = notYetSent.filter((c) => followupAllowed(c.status));
  let held = notYetSent.length - due.length;

  if (due.length === 0) return { ...empty, held };

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
  let interrupted = 0;
  let releaseFailed = 0;

  for (const submission of due as DueSubmission[]) {
    // 계정 조회(await) 사이에 상태가 바뀌었을 수 있으니 선점 직전에 이 회원·이 폼의 최신 상태를 다시 읽는다.
    if (!(await ownedAndAllowed(admin, rule, submission.id))) {
      held++;
      continue;
    }

    // 중복 발송 방지(v1.10): 보내기 전에 발송 기록을 먼저 넣어 선점한다 — (rule_id, submission_id) 고유 제약 때문에
    // 운영자 호출·회원 호출이 겹쳐도 먼저 넣은 실행만 보낸다. 상태값이 sent/failed뿐이라 「발송 중」은 failed로 넣고 끝나면 고친다
    // (실패한 팔로우업은 원래도 다시 보내지 않으므로 중간에 서버가 멈춰도 동작은 예전과 같다). 기준: booking-reminder v1.21.
    const { data: claim, error: claimError } = await admin
      .from("crm_followup_sends")
      .insert({ user_id: rule.user_id, rule_id: rule.id, submission_id: submission.id, status: "failed", error_message: "발송 중" })
      .select("id")
      .maybeSingle();
    if (claimError || !claim) continue;

    const text = fillTemplate(rule.message_text, submission);
    const errors: string[] = [];
    const steps: { label: string; run: () => Promise<unknown> }[] = [];

    if (rule.channel_email && submission.email) {
      if (!smtpAccount) errors.push("SMTP 계정 미등록");
      else {
        const acc = smtpAccount;
        const to = submission.email;
        steps.push({ label: "이메일", run: () => sendViaSmtpAccount(acc, to, rule.message_subject ?? rule.name, `<p>${text}</p>`) });
      }
    }

    if ((rule.channel_sms || rule.channel_alimtalk || rule.channel_friendtalk) && submission.phone) {
      if (!solapiAccount) {
        errors.push("SOLAPI 계정 미등록");
      } else {
        const acc = solapiAccount;
        const phone = submission.phone;
        if (rule.channel_sms) steps.push({ label: "SMS", run: () => sendSms(acc, phone, text) });
        if (rule.channel_alimtalk && rule.kakao_template_id) {
          const templateId = rule.kakao_template_id;
          steps.push({
            label: "알림톡",
            run: () => {
              const variables: Record<string, string> = {};
              for (const [kakaoVar, question] of Object.entries(rule.kakao_variables)) {
                variables[kakaoVar] = submission.raw_values[question] ?? "";
              }
              return sendAlimtalk(acc, phone, { templateId, variables });
            },
          });
        }
        if (rule.channel_friendtalk) steps.push({ label: "친구톡", run: () => sendFriendtalk(acc, phone, text) });
      }
    }

    // 채널마다 보내기 직전에 상태를 다시 읽고, 미확정으로 바뀌었으면 남은 채널을 멈춘다(이미 보낸 채널은 되돌리지 않음).
    const attempted: string[] = [];
    let halted = false;
    for (const step of steps) {
      if (!(await ownedAndAllowed(admin, rule, submission.id))) {
        halted = true;
        break;
      }
      attempted.push(step.label);
      try {
        await step.run();
      } catch (err) {
        errors.push(`${step.label}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (halted && attempted.length === 0) {
      // 한 채널도 시도하지 않았으면 선점을 풀어 보류로 되돌린다 — 상태가 확정되면 다음 실행에서 보낸다.
      // 삭제가 정확히 1행으로 확인된 경우만 보류(held). 오류·예외·0행·행 수 불명이면 기록이 남아 자동 재개가 안 되므로
      // releaseFailed로 따로 세고, 기록에 진단 문구를 남긴다(재삭제·재발송 0).
      let released = false;
      try {
        const { data: gone, error: delError } = await admin
          .from("crm_followup_sends")
          .delete()
          .eq("id", claim.id)
          .eq("user_id", rule.user_id)
          .select("id");
        released = !delError && Array.isArray(gone) && gone.length === 1;
      } catch {
        released = false;
      }
      if (released) {
        held++;
        continue;
      }
      releaseFailed++;
      try {
        await admin
          .from("crm_followup_sends")
          .update({
            status: "failed",
            error_message: "선점 해제 실패 — 결과가 확정돼도 자동으로 보내지 않음(운영자 확인 필요). 발송 시도 0",
            sent_at: new Date().toISOString(),
          })
          .eq("id", claim.id)
          .eq("user_id", rule.user_id);
      } catch {
        // 진단 문구 기록도 실패하면 기록은 「발송 중」으로 남는다 — 어느 쪽이든 자동 재발송은 없다.
      }
      continue;
    }
    if (halted) {
      // 이미 시도한 채널이 있으면 기록을 지우지 않는다(지우면 다음 실행에서 같은 채널을 다시 보냄) — 자동 재발송 0.
      interrupted++;
      const msg = [`상태가 미확정으로 바뀌어 남은 채널을 멈춤(시도: ${attempted.join(", ")})`, ...errors].join(" / ");
      await admin
        .from("crm_followup_sends")
        .update({ status: "failed", error_message: msg, sent_at: new Date().toISOString() })
        .eq("id", claim.id)
        .eq("user_id", rule.user_id);
      continue;
    }

    const status = errors.length > 0 ? "failed" : "sent";
    if (status === "sent") sent++;
    else failed++;

    await admin
      .from("crm_followup_sends")
      .update({ status, error_message: errors.length > 0 ? errors.join(" / ") : null, sent_at: new Date().toISOString() })
      .eq("id", claim.id)
      .eq("user_id", rule.user_id);
  }

  return { sent, failed, held, interrupted, releaseFailed };
}
