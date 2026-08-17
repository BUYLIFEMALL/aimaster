import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { sendViaSmtpAccount } from "@/lib/email/transport";

type SupabaseLike = SupabaseClient<Database>;

export interface DispatchResult {
  sentCount: number;
  failedCount: number;
}

/**
 * 캠페인 1건을 실제로 실행한다: target_send_count(현재까지 몇 번 받았는지)와 일치하는 리드를
 * 최대 quantity_per_run개 골라, 등록된 SMTP 계정들을 순서대로 돌려가며(로테이션) 한 통씩 순차
 * 발송한다. 성공하면 리드의 send_count를 1 증가시켜 "N차 발송" 상태가 된다(최대 5차,
 * DB check 제약으로도 보장). 수동 "지금 실행" 버튼과 cron 둘 다 이 함수를 공유한다.
 *
 * 네이버 SMTP는 동시 연결 수 제한이 있어(docs/PLATFORM_PATTERNS.md, 421 Too many concurrent
 * connection) 반드시 순차적으로(await 하나씩) 보낸다 — 계정을 여러 개 로테이션해도 각 발송은
 * 항상 순차 실행이다.
 */
export async function dispatchCampaign(
  supabase: SupabaseLike,
  campaign: {
    id: string;
    user_id: string;
    draft_id: string;
    target_send_count: number;
    quantity_per_run: number;
  },
): Promise<DispatchResult> {
  const { data: draft } = await supabase
    .from("stepmail_email_drafts")
    .select("subject, body_html")
    .eq("id", campaign.draft_id)
    .maybeSingle();
  if (!draft) return { sentCount: 0, failedCount: 0 };

  // Database.types.ts에 FK Relationships 메타데이터를 안 넣어뒀기 때문에(다른 서브프로젝트와
  // 동일한 간략화 패턴) 임베디드 조인 select 대신 두 단계 쿼리로 나눠서 타입 추론 문제를 피한다.
  const { data: links } = await supabase
    .from("stepmail_campaign_smtp_accounts")
    .select("smtp_account_id")
    .eq("campaign_id", campaign.id)
    .order("sort_order", { ascending: true });

  const accountIds = (links ?? []).map((l) => l.smtp_account_id);
  if (accountIds.length === 0) return { sentCount: 0, failedCount: 0 };

  const { data: accountRows } = await supabase
    .from("stepmail_smtp_accounts")
    .select("id, smtp_host, smtp_port, smtp_user, smtp_password, from_name, is_active")
    .in("id", accountIds);

  // links의 순서(sort_order)를 그대로 유지하기 위해 accountRows를 accountIds 순서로 재정렬한다.
  const accountsById = new Map((accountRows ?? []).map((a) => [a.id, a]));
  const accounts = accountIds
    .map((id) => accountsById.get(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a) && a!.is_active);

  if (accounts.length === 0) return { sentCount: 0, failedCount: 0 };

  const { data: leads } = await supabase
    .from("stepmail_leads")
    .select("id, email, send_count")
    .eq("user_id", campaign.user_id)
    .eq("status", "new")
    .eq("send_count", campaign.target_send_count)
    .order("created_at", { ascending: true })
    .limit(campaign.quantity_per_run);

  if (!leads || leads.length === 0) return { sentCount: 0, failedCount: 0 };

  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const account = accounts[i % accounts.length]; // 계정 로테이션

    try {
      await sendViaSmtpAccount(account, lead.email, draft.subject, draft.body_html);

      const sentAtIso = new Date().toISOString();
      await supabase
        .from("stepmail_leads")
        .update({ send_count: Math.min(lead.send_count + 1, 5), last_sent_at: sentAtIso })
        .eq("id", lead.id);

      await supabase.from("stepmail_send_log").insert({
        user_id: campaign.user_id,
        campaign_id: campaign.id,
        lead_id: lead.id,
        smtp_account_id: account.id,
        subject: draft.subject,
        status: "sent",
      });
      sentCount++;
    } catch (err) {
      await supabase.from("stepmail_send_log").insert({
        user_id: campaign.user_id,
        campaign_id: campaign.id,
        lead_id: lead.id,
        smtp_account_id: account.id,
        subject: draft.subject,
        status: "failed",
        error_message: err instanceof Error ? err.message : "알 수 없는 오류",
      });
      failedCount++;
    }
  }

  return { sentCount, failedCount };
}
