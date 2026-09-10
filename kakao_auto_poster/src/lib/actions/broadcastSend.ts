"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { sendAlimtalk, sendFriendtalk } from "@/lib/solapi/client";
import { sendEmailFallback } from "@/lib/emailFallback";
import { buildReportNotificationEmail } from "@/lib/email/reportEmail";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kakao-auto-poster.vercel.app";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface BroadcastSendResultRow {
  label: string | null;
  phone: string;
  ok: boolean;
  error?: string;
  viaEmail?: boolean;
}

export interface SendCustomBroadcastState {
  error?: string;
  results?: BroadcastSendResultRow[];
}

/**
 * 수신자 목록 화면에서 체크박스로 고른 사람들에게 자유롭게 쓴 메시지를 즉시 보낸다.
 * 리포트 자동 발송(lib/kakaoSend.ts)과 달리 대상을 직접 골라서 1회성으로 보내는
 * 용도라 알림톡(사전 승인된 고정 템플릿만 가능)은 쓸 수 없고, 브랜드메시지(자유형)로만
 * 보낸다 — crm-google-form의 sendRcsPromotionAction과 같은 성격의 기능이다. 그래서
 * 채널을 친구 추가하지 않은 사람에게는 도달하지 않는다(기본값 targeting: 'I').
 */
export async function sendCustomBroadcastAction(
  recipientIds: string[],
  message: string,
): Promise<SendCustomBroadcastState> {
  const user = await requireProgramAccess();
  const text = message.trim();

  if (recipientIds.length === 0) return { error: "발송할 대상을 1명 이상 선택해주세요." };
  if (!text) return { error: "발송할 메시지를 입력해주세요." };

  const supabase = await createClient();
  const { data: solapiAccount } = await supabase
    .from("user_solapi_accounts")
    .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!solapiAccount) {
    return { error: "SOLAPI 계정이 등록되어 있지 않습니다. 설정 페이지에서 먼저 등록해주세요." };
  }
  if (!solapiAccount.kakao_pf_id) {
    return { error: "카카오 채널 ID(pfId)가 등록되어 있지 않습니다. 설정 페이지에서 등록해주세요." };
  }

  const { data: targets, error: fetchError } = await supabase
    .from("kakao_broadcast_recipients")
    .select("id, label, phone, email")
    .eq("user_id", user.id)
    .eq("excluded", false)
    .in("id", recipientIds);

  if (fetchError) return { error: fetchError.message };
  if (!targets || targets.length === 0) return { error: "선택한 수신자를 찾을 수 없습니다(발송제외 처리된 사람은 제외됩니다)." };

  const results: BroadcastSendResultRow[] = [];
  const logRows: {
    user_id: string;
    recipient_id: string;
    recipient_label: string | null;
    recipient_phone: string;
    message: string;
    ok: boolean;
    error: string | null;
    channel: string;
    fallback_email: boolean;
  }[] = [];

  for (const target of targets) {
    try {
      await sendFriendtalk(solapiAccount, target.phone, text);
      results.push({ label: target.label, phone: target.phone, ok: true });
      logRows.push({
        user_id: user.id,
        recipient_id: target.id,
        recipient_label: target.label,
        recipient_phone: target.phone,
        message: text,
        ok: true,
        error: null,
        channel: "brand",
        fallback_email: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "발송 실패";
      // 카카오(브랜드메시지)가 실패했고 이메일이 등록돼 있으면 대체 발송을 시도한다 —
      // 성공하면 결과는 "성공(이메일로 대체)"으로 표시한다.
      let handledByEmail = false;
      if (target.email) {
        const subject = "[카카오톡 뉴스레터 자동화] 새 메시지가 도착했습니다";
        const html = `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;"><p style="white-space:pre-line;color:#333;line-height:1.6;">${escapeHtml(text)}</p></div>`;
        const fallback = await sendEmailFallback(supabase, user.id, target.email, subject, html);
        handledByEmail = fallback.ok;
      }
      results.push({ label: target.label, phone: target.phone, ok: handledByEmail, error: handledByEmail ? undefined : errorMessage, viaEmail: handledByEmail });
      logRows.push({
        user_id: user.id,
        recipient_id: target.id,
        recipient_label: target.label,
        recipient_phone: target.phone,
        message: text,
        ok: handledByEmail,
        error: handledByEmail ? null : errorMessage,
        channel: "brand",
        fallback_email: handledByEmail,
      });
    }
  }

  // 발송 내역 화면(/broadcast-log)에서 나중에 조회할 수 있도록 기록한다. 로그 저장이
  // 실패해도 이미 나간 메시지 자체는 되돌릴 수 없으므로, 발송 결과 자체는 그대로 반환한다.
  await supabase.from("kakao_broadcast_send_log").insert(logRows);

  return { results };
}

export interface SendReportAlimtalkState {
  error?: string;
  results?: BroadcastSendResultRow[];
}

/**
 * 수신자 목록 화면에서 체크박스로 고른 사람들에게, 이미 생성된 리포트 하나를 골라
 * "알림톡"으로 발송한다. 자유 메시지 발송(sendCustomBroadcastAction)과 달리 자유 문구를
 * 받지 않고 리포트의 제목/URL만 승인된 템플릿 변수(#{title}/#{url})에 채워 넣는다 — 알림톡은
 * 사전 승인된 고정 템플릿만 가능하기 때문(사용자 지시, 2026-09-10: "메세지 그룹을 두 그룹으로
 * 나눠서" 자유 문구=브랜드메시지, 정보 콘텐츠=알림톡으로 명확히 분리). 브랜드메시지와 달리
 * 채널을 친구 추가하지 않은 사람에게도 도달한다.
 */
export async function sendReportAlimtalkToRecipientsAction(
  recipientIds: string[],
  reportId: string,
): Promise<SendReportAlimtalkState> {
  const user = await requireProgramAccess();

  if (recipientIds.length === 0) return { error: "발송할 대상을 1명 이상 선택해주세요." };
  if (!reportId) return { error: "보낼 리포트를 선택해주세요." };

  const supabase = await createClient();
  const [{ data: solapiAccount }, { data: report }] = await Promise.all([
    supabase
      .from("user_solapi_accounts")
      .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id, alimtalk_template_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("kakao_reports").select("id, title, summary").eq("id", reportId).eq("user_id", user.id).maybeSingle(),
  ]);

  if (!solapiAccount?.kakao_pf_id) {
    return { error: "카카오 채널(SOLAPI) 계정이 연동되어 있지 않습니다. 설정 페이지에서 먼저 등록해주세요." };
  }
  if (!solapiAccount.alimtalk_template_id) {
    return { error: "알림톡 템플릿이 등록되어 있지 않습니다. 설정 페이지에서 승인받은 템플릿 ID를 먼저 등록해주세요." };
  }
  if (!report) return { error: "리포트를 찾을 수 없습니다." };

  const { data: targets, error: fetchError } = await supabase
    .from("kakao_broadcast_recipients")
    .select("id, label, phone, email")
    .eq("user_id", user.id)
    .eq("excluded", false)
    .in("id", recipientIds);

  if (fetchError) return { error: fetchError.message };
  if (!targets || targets.length === 0) return { error: "선택한 수신자를 찾을 수 없습니다(발송제외 처리된 사람은 제외됩니다)." };

  const reportUrl = `${APP_URL}/reports/${report.id}`;
  const results: BroadcastSendResultRow[] = [];
  const logRows: {
    user_id: string;
    recipient_id: string;
    recipient_label: string | null;
    recipient_phone: string;
    message: string;
    ok: boolean;
    error: string | null;
    channel: string;
    fallback_email: boolean;
  }[] = [];

  for (const target of targets) {
    try {
      await sendAlimtalk(solapiAccount, target.phone, {
        templateId: solapiAccount.alimtalk_template_id,
        variables: { "#{title}": report.title, "#{url}": reportUrl },
      });
      results.push({ label: target.label, phone: target.phone, ok: true });
      logRows.push({
        user_id: user.id,
        recipient_id: target.id,
        recipient_label: target.label,
        recipient_phone: target.phone,
        message: `[알림톡] ${report.title}`,
        ok: true,
        error: null,
        channel: "alimtalk",
        fallback_email: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "발송 실패";
      let handledByEmail = false;
      if (target.email) {
        const { subject, html } = buildReportNotificationEmail({ id: report.id, title: report.title, summary: report.summary });
        const fallback = await sendEmailFallback(supabase, user.id, target.email, subject, html);
        handledByEmail = fallback.ok;
      }
      results.push({ label: target.label, phone: target.phone, ok: handledByEmail, error: handledByEmail ? undefined : errorMessage, viaEmail: handledByEmail });
      logRows.push({
        user_id: user.id,
        recipient_id: target.id,
        recipient_label: target.label,
        recipient_phone: target.phone,
        message: `[알림톡] ${report.title}`,
        ok: handledByEmail,
        error: handledByEmail ? null : errorMessage,
        channel: "alimtalk",
        fallback_email: handledByEmail,
      });
    }
  }

  await supabase.from("kakao_broadcast_send_log").insert(logRows);

  return { results };
}
