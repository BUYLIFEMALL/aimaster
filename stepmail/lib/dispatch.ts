import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { sendViaSmtpAccount } from "@/lib/email/transport";
import { sendSms } from "@/lib/solapi/client";
import { buildSmsText } from "@/lib/sms";
import { sendKakaoBrandMessage } from "@/lib/kakaoBrand";
import { kstDayStartIso, personalizeEmail, pickAccountIndex, randomGapMs, RUN_BUDGET_MS } from "@/lib/emailPacing";

type SupabaseLike = SupabaseClient<Database>;

export interface DispatchResult {
  sentCount: number;
  failedCount: number;
  /** 준비가 안 돼 아무것도 보내지 않은 이유(지금 실행 화면에 안내) */
  notice?: string;
}

/**
 * 캠페인 1건을 실제로 실행한다: target_send_count(현재까지 몇 번 받았는지)와 일치하는 리드를
 * 최대 quantity_per_run개 골라 캠페인 채널(이메일·문자·둘 다)로 순차 발송한다. 한 채널이라도
 * 성공하면 리드의 send_count를 1 증가시켜 "N차 발송" 상태가 된다(최대 5차, DB check 제약으로도 보장).
 * 수동 "지금 실행" 버튼과 cron 둘 다 이 함수를 공유한다.
 *
 * 네이버 SMTP는 동시 연결 수 제한이 있어(docs/PLATFORM_PATTERNS.md, 421 Too many concurrent
 * connection) 반드시 순차적으로(await 하나씩) 보낸다 — 계정을 여러 개 로테이션해도 각 발송은
 * 항상 순차 실행이다. 문자(v1.27)는 회원 본인 SOLAPI 계정(공용 user_solapi_accounts)으로, 전화번호가
 * 있는 리드에게만 보내며 「(광고)」·수신거부 안내를 자동으로 붙인다(lib/sms.ts).
 */
export async function dispatchCampaign(
  supabase: SupabaseLike,
  campaign: {
    id: string;
    user_id: string;
    draft_id: string | null;
    target_send_count: number;
    quantity_per_run: number;
  },
  options: {
    /** 이 시각(ms)이 지나면 남은 리드는 다음 실행에 넘긴다. 예약 실행은 캠페인 여러 개가 같은 마감을 나눠 쓴다. */
    deadline?: number;
    /** 메일 사이 쉬기(시험에서는 바로 넘어가게 바꿔 끼움). */
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<DispatchResult> {
  const deadline = options.deadline ?? Date.now() + RUN_BUDGET_MS;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const { data: settings } = await supabase
    .from("stepmail_campaigns")
    .select("channel, sms_text, sms_optout, mobile_type, kakao_fallback_sms")
    .eq("id", campaign.id)
    .maybeSingle();
  const channel = settings?.channel ?? "email";
  const wantsEmail = channel !== "sms";
  const wantsSms = channel !== "email";
  // v1.28: 휴대폰 발송 방식 — 문자 또는 카카오 브랜드 메시지(회원 본인 카카오 채널 pfId 필요, 없으면 보내지 않음)
  const useKakao = settings?.mobile_type === "kakao";

  let draft: { subject: string; body_html: string } | null = null;
  let accounts: { id: string; smtp_host: string; smtp_port: number; smtp_user: string; smtp_password: string; from_name: string | null; is_active: boolean }[] = [];
  if (wantsEmail) {
    if (campaign.draft_id) {
      const { data } = await supabase
        .from("stepmail_email_drafts")
        .select("subject, body_html")
        .eq("id", campaign.draft_id)
        .maybeSingle();
      draft = data;
    }
    if (!draft) return { sentCount: 0, failedCount: 0, notice: "이메일 초안을 찾을 수 없습니다." };

    // Database.types.ts에 FK Relationships 메타데이터를 안 넣어뒀기 때문에(다른 서브프로젝트와
    // 동일한 간략화 패턴) 임베디드 조인 select 대신 두 단계 쿼리로 나눠서 타입 추론 문제를 피한다.
    const { data: links } = await supabase
      .from("stepmail_campaign_smtp_accounts")
      .select("smtp_account_id")
      .eq("campaign_id", campaign.id)
      .order("sort_order", { ascending: true });

    const accountIds = (links ?? []).map((l) => l.smtp_account_id);
    if (accountIds.length > 0) {
      const { data: accountRows } = await supabase
        .from("user_smtp_accounts")
        .select("id, smtp_host, smtp_port, smtp_user, smtp_password, from_name, is_active")
        .in("id", accountIds);

      // links의 순서(sort_order)를 그대로 유지하기 위해 accountRows를 accountIds 순서로 재정렬한다.
      const accountsById = new Map((accountRows ?? []).map((a) => [a.id, a]));
      accounts = accountIds
        .map((id) => accountsById.get(id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a) && a!.is_active);
    }
    if (accounts.length === 0) return { sentCount: 0, failedCount: 0, notice: "사용할 수 있는 이메일 발송 계정이 없습니다." };
  }

  // 계정별 하루 한도(2026-11-14): 오늘(한국 시간) 이 계정으로 보낸 메일 수를 발송 기록에서 센다(다른 캠페인 발송 포함).
  const usedToday = new Map<string, number>();
  if (wantsEmail && accounts.length > 0) {
    const { data: sentRows } = await supabase
      .from("stepmail_send_log")
      .select("smtp_account_id")
      .eq("user_id", campaign.user_id)
      .eq("status", "sent")
      .gte("sent_at", kstDayStartIso())
      .in("smtp_account_id", accounts.map((a) => a.id));
    for (const row of sentRows ?? []) {
      if (row.smtp_account_id) usedToday.set(row.smtp_account_id, (usedToday.get(row.smtp_account_id) ?? 0) + 1);
    }
  }

  let solapi: { api_key: string; api_secret: string; sender_phone: string; kakao_pf_id: string | null; rcs_brand_id: string | null } | null = null;
  if (wantsSms) {
    if (!settings?.sms_text?.trim() || !settings?.sms_optout?.trim()) {
      return { sentCount: 0, failedCount: 0, notice: "문자 본문과 수신거부 안내를 입력해 주세요." };
    }
    const { data } = await supabase
      .from("user_solapi_accounts")
      .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id")
      .eq("user_id", campaign.user_id)
      .maybeSingle();
    solapi = data;
    if (!solapi) return { sentCount: 0, failedCount: 0, notice: "설정에서 본인 SOLAPI 문자 계정을 먼저 연결해 주세요." };
    if (useKakao && !solapi.kakao_pf_id) {
      return { sentCount: 0, failedCount: 0, notice: "카카오 브랜드 메시지는 설정에서 본인 카카오 채널 ID(pfId)를 등록해야 보낼 수 있습니다." };
    }
  }

  let leadQuery = supabase
    .from("stepmail_leads")
    .select("id, email, phone, nickname, send_count")
    .eq("user_id", campaign.user_id)
    .eq("status", "new")
    .eq("send_count", campaign.target_send_count);
  if (channel === "sms") leadQuery = leadQuery.not("phone", "is", null);
  const { data: leads } = await leadQuery.order("created_at", { ascending: true }).limit(campaign.quantity_per_run);

  if (!leads || leads.length === 0) return { sentCount: 0, failedCount: 0 };

  let sentCount = 0;
  let failedCount = 0;
  let notice: string | undefined;
  let rotation = 0;
  let emailsTried = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    let anySent = false;

    // 시간 한도: 남은 리드는 차수를 올리지 않은 채 두어 다음 실행이 이어서 보낸다.
    if (Date.now() > deadline) {
      notice = `실행 시간 한도로 ${leads.length - i}명은 다음 실행 때 이어서 보냅니다.`;
      break;
    }

    if (wantsEmail && draft) {
      const idx = pickAccountIndex(accounts, usedToday, rotation);
      if (idx < 0) {
        notice = `오늘 모든 발송 계정이 하루 한도에 닿아 ${leads.length - i}명은 내일 이어서 보냅니다.`;
        break;
      }
      const account = accounts[idx]; // 계정 로테이션(한도에 닿은 계정은 건너뜀)
      rotation = idx + 1;
      // 발송 간격: 두 번째 메일부터 2~5초 쉰다(한꺼번에 몰아 보내 스팸으로 막히는 것을 줄임).
      if (emailsTried > 0) await sleep(randomGapMs());
      emailsTried++;
      const mail = personalizeEmail(draft.subject, draft.body_html, lead.nickname);
      try {
        await sendViaSmtpAccount(account, lead.email, mail.subject, mail.bodyHtml);
        usedToday.set(account.id, (usedToday.get(account.id) ?? 0) + 1);
        await supabase.from("stepmail_send_log").insert({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          lead_id: lead.id,
          smtp_account_id: account.id,
          subject: mail.subject,
          channel: "email",
          status: "sent",
        });
        anySent = true;
      } catch (err) {
        await supabase.from("stepmail_send_log").insert({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          lead_id: lead.id,
          smtp_account_id: account.id,
          subject: mail.subject,
          channel: "email",
          status: "failed",
          error_message: err instanceof Error ? err.message : "알 수 없는 오류",
        });
      }
    }

    if (wantsSms && solapi && lead.phone && settings?.sms_text && settings.sms_optout) {
      try {
        const to = lead.phone.replace(/\D/g, "");
        const text = buildSmsText(settings.sms_text, settings.sms_optout, lead.nickname);
        if (useKakao) await sendKakaoBrandMessage(solapi, to, text, { fallbackSms: Boolean(settings.kakao_fallback_sms) });
        else await sendSms(solapi, to, text);
        await supabase.from("stepmail_send_log").insert({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          lead_id: lead.id,
          channel: useKakao ? "kakao" : "sms",
          to_phone: lead.phone,
          status: "sent",
        });
        anySent = true;
      } catch (err) {
        await supabase.from("stepmail_send_log").insert({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          lead_id: lead.id,
          channel: useKakao ? "kakao" : "sms",
          to_phone: lead.phone,
          status: "failed",
          error_message: err instanceof Error ? err.message : "알 수 없는 오류",
        });
      }
    }

    if (anySent) {
      await supabase
        .from("stepmail_leads")
        .update({ send_count: Math.min(lead.send_count + 1, 5), last_sent_at: new Date().toISOString() })
        .eq("id", lead.id);
      sentCount++;
    } else {
      failedCount++;
    }
  }

  return notice ? { sentCount, failedCount, notice } : { sentCount, failedCount };
}
