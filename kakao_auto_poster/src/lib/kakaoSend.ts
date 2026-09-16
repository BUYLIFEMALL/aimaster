import "server-only";
import { sendAlimtalk, sendFriendtalk, type SolapiAccountCredentials } from "@/lib/solapi/client";
import { getValidKakaoAccessToken, type KakaoAppCredentials } from "@/lib/kakao/account";
import { sendReportMemoToMe } from "@/lib/kakao/client";
import { sendEmailFallback } from "@/lib/emailFallback";
import { buildReportNotificationEmail } from "@/lib/email/reportEmail";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kakao-auto-poster.vercel.app";

// AIMaster 앱과 텔레그램 웹훅(관리자 클라이언트) 양쪽에서 똑같이 써야 해서, "리포트 1건을
// 실제로 카카오로 보낸다"는 핵심 로직을 여기 하나로 모았다 — 사용자 세션이 있는 서버
// 액션(lib/actions/reports.ts)과, 세션이 없는 텔레그램 승인 웹훅
// (app/api/telegram/webhook/[userId]/route.ts) 둘 다 이 함수를 그대로 호출한다.
type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export async function sendReportToKakaoCore(
  supabase: SupabaseLike,
  userId: string,
  reportId: string,
  // 회원 본인의 카카오 앱 REST API 키/Client Secret(resolveKakaoAppCredentials()로 호출부가
  // 미리 조회해서 넘긴다 — 이 함수는 SupabaseLike 타입만 받아 resolveApiKey()가 요구하는
  // SupabaseClient<Database> 타입을 직접 호출할 수 없다). 없으면(본인 앱 미등록) 카카오
  // 로그인 발송은 자동으로 건너뛰고 SOLAPI 경로로 폴백한다.
  kakaoCredentials: KakaoAppCredentials | null = null,
): Promise<{ error?: string; success?: boolean }> {
  const { data: report } = await supabase
    .from("kakao_reports")
    .select("id, title, summary, topic_id")
    .eq("id", reportId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!report) return { error: "리포트를 찾을 수 없습니다." };

  // 이 리포트가 속한 주제가 특정 그룹만 골라뒀으면(target_group_id) 수신자 목록 발송을
  // 그 그룹에만 한정한다 — null이면 기존과 동일하게 전체 수신자(미분류 포함) 대상이다.
  // 트리거 방식(카카오 채널 즉시 발송/텔레그램 승인/리포트 화면 수동 발송)과 무관하게 이
  // 함수 하나만 거치므로, 여기서 한 번만 조회하면 세 경로 모두에 일관되게 적용된다.
  const { data: topic } = await supabase
    .from("kakao_topics")
    .select("target_group_id")
    .eq("id", report.topic_id)
    .maybeSingle();
  const targetGroupId = topic?.target_group_id ?? null;

  const reportUrl = `${APP_URL}/reports/${report.id}`;
  const text = [`📨 ${report.title}`, "", report.summary, "", `전체 보기: ${reportUrl}`].join("\n");

  const { data: solapiAccount } = await supabase
    .from("user_solapi_accounts")
    .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id, alimtalk_template_id, email_dual_send_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  try {
    // 카카오 로그인("나에게 보내기")이 연동되어 있으면 무료 채널을 우선 사용하고, 없으면
    // 기존 SOLAPI(카카오 채널) 경로로 자동 전환한다 — 둘 다 없으면 설정 안내로 에러를 준다.
    const kakaoAccessToken = await getValidKakaoAccessToken(supabase, userId, kakaoCredentials);
    if (kakaoAccessToken) {
      await sendReportMemoToMe(kakaoAccessToken, {
        title: report.title,
        summary: report.summary,
        url: reportUrl,
      });
    } else {
      const { data: profile } = await supabase.from("profiles").select("phone").eq("id", userId).maybeSingle();

      if (!solapiAccount) {
        return {
          error: "카카오 발송 방법이 연동되어 있지 않습니다. 설정 페이지에서 카카오 로그인(추천) 또는 SOLAPI 계정을 등록해주세요.",
        };
      }
      if (!profile?.phone) {
        return { error: "AIMaster 프로필에 등록된 전화번호가 없습니다. 프로필에서 먼저 등록해주세요." };
      }
      if (!solapiAccount.kakao_pf_id) {
        return { error: "카카오 채널 ID(pfId)가 등록되어 있지 않습니다. 설정 페이지에서 등록해주세요." };
      }

      await sendFriendtalk(solapiAccount, profile.phone, text);
    }

    await supabase
      .from("kakao_reports")
      .update({ kakao_sent_at: new Date().toISOString(), kakao_send_error: null })
      .eq("id", reportId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "발송에 실패했습니다.";
    await supabase.from("kakao_reports").update({ kakao_send_error: message }).eq("id", reportId);
    return { error: message };
  }

  // 본인 알림과는 별개로, 등록해둔 수신자 목록에도 함께 보낸다 — SOLAPI 채널(pfId)이
  // 연동돼 있어야 하며, 수신자가 없거나 채널이 없으면 조용히 건너뛴다(본인 알림은 이미
  // 위에서 성공했으므로 실패로 취급하지 않는다). 알림톡 템플릿(alimtalk_template_id)이
  // 등록돼 있으면 채널 친구 여부와 무관하게 도달하는 알림톡을 쓰고, 없으면 브랜드메시지
  // (채널을 친구 추가한 사람에게만 도달 — SOLAPI 공식 문서 기준, 2026-09-09 재확인)를 쓴다.
  if (solapiAccount?.kakao_pf_id) {
    await broadcastReportToRecipients(supabase, userId, reportId, solapiAccount, targetGroupId, {
      id: report.id,
      title: report.title,
      summary: report.summary,
      url: reportUrl,
      text,
    });
  }

  return { success: true };
}

async function broadcastReportToRecipients(
  supabase: SupabaseLike,
  userId: string,
  reportId: string,
  solapiAccount: SolapiAccountCredentials & { alimtalk_template_id: string | null; email_dual_send_enabled: boolean },
  targetGroupId: string | null,
  report: { id: string; title: string; summary: string; url: string; text: string },
): Promise<void> {
  let query = supabase
    .from("kakao_broadcast_recipients")
    .select("phone, email")
    .eq("user_id", userId)
    .eq("excluded", false);
  // target_group_id가 있으면 그 그룹에 속한 수신자로만 좁힌다(미분류/다른 그룹 제외).
  // null이면 전체 수신자(미분류 포함) 그대로 둔다 — 기존 동작과 하위 호환.
  if (targetGroupId) query = query.eq("group_id", targetGroupId);
  const { data: recipients } = await query;

  if (!recipients || recipients.length === 0) return;

  const failures: string[] = [];
  for (const recipient of recipients as { phone: string | null; email: string | null }[]) {
    // 전화번호 없는(이메일 전용) 수신자는 이 토글과 무관하게 항상 이메일로 받는다(애초에
    // 카카오 발송 자체가 없으므로). 전화번호가 있는 사람은 email_dual_send_enabled가
    // ON일 때만 이메일이 관여한다 — 카카오 발송이 성공해도 이메일을 함께 보내고, 실패하면
    // 이메일로 대체 발송한다. OFF면 카카오만 시도하고 이메일은 전혀 건드리지 않는다
    // (사용자 지시, 2026-09-10).
    if (recipient.phone) {
      let kakaoError: string | null = null;
      try {
        if (solapiAccount.alimtalk_template_id) {
          await sendAlimtalk(solapiAccount, recipient.phone, {
            templateId: solapiAccount.alimtalk_template_id,
            variables: { "#{title}": report.title, "#{url}": report.url },
          });
        } else {
          await sendFriendtalk(solapiAccount, recipient.phone, report.text);
        }
      } catch (err) {
        kakaoError = err instanceof Error ? err.message : "발송 실패";
      }

      if (solapiAccount.email_dual_send_enabled && recipient.email) {
        const { subject, html } = buildReportNotificationEmail({ id: report.id, title: report.title, summary: report.summary });
        if (kakaoError) {
          // 카카오 실패 → 이메일로 대체. 이메일까지 성공하면 이 사람은 실패 집계에서 빠진다.
          const fallback = await sendEmailFallback(supabase, userId, recipient.email, subject, html);
          if (fallback.ok) continue;
        } else {
          // 카카오 성공 → 이메일도 함께 보낸다(best-effort, 실패해도 카카오는 이미 성공이므로
          // 전체 실패로 잡지 않는다).
          await sendEmailFallback(supabase, userId, recipient.email, subject, html);
        }
      }

      if (!kakaoError) continue;
      failures.push(`${recipient.phone.slice(-4)}: ${kakaoError}`);
      continue;
    }

    // 전화번호 없음(이메일 전용) — 토글과 무관하게 항상 이메일 시도
    if (recipient.email) {
      const { subject, html } = buildReportNotificationEmail({ id: report.id, title: report.title, summary: report.summary });
      const fallback = await sendEmailFallback(supabase, userId, recipient.email, subject, html);
      if (fallback.ok) continue;
    }
    failures.push(`${recipient.email ?? "대상불명"}: 전화번호 미등록(이메일 전용 수신자)`);
  }

  const succeeded = recipients.length - failures.length;
  await supabase
    .from("kakao_reports")
    .update({
      broadcast_sent_at: new Date().toISOString(),
      broadcast_error:
        failures.length > 0 ? `${succeeded}/${recipients.length}명 발송 성공, 실패: ${failures.join(", ")}` : null,
    })
    .eq("id", reportId);
}
