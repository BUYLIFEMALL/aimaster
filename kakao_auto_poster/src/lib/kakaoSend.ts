import "server-only";
import { sendAlimtalk, sendFriendtalk, type SolapiAccountCredentials } from "@/lib/solapi/client";
import { getValidKakaoAccessToken } from "@/lib/kakao/account";
import { sendReportMemoToMe } from "@/lib/kakao/client";

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
): Promise<{ error?: string; success?: boolean }> {
  const { data: report } = await supabase
    .from("kakao_reports")
    .select("id, title, summary")
    .eq("id", reportId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!report) return { error: "리포트를 찾을 수 없습니다." };

  const reportUrl = `${APP_URL}/reports/${report.id}`;
  const text = [`📨 ${report.title}`, "", report.summary, "", `전체 보기: ${reportUrl}`].join("\n");

  const { data: solapiAccount } = await supabase
    .from("user_solapi_accounts")
    .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id, alimtalk_template_id")
    .eq("user_id", userId)
    .maybeSingle();

  try {
    // 카카오 로그인("나에게 보내기")이 연동되어 있으면 무료 채널을 우선 사용하고, 없으면
    // 기존 SOLAPI(카카오 채널) 경로로 자동 전환한다 — 둘 다 없으면 설정 안내로 에러를 준다.
    const kakaoAccessToken = await getValidKakaoAccessToken(supabase, userId);
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
    await broadcastReportToRecipients(supabase, userId, reportId, solapiAccount, {
      title: report.title,
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
  solapiAccount: SolapiAccountCredentials & { alimtalk_template_id: string | null },
  report: { title: string; url: string; text: string },
): Promise<void> {
  const { data: recipients } = await supabase
    .from("kakao_broadcast_recipients")
    .select("phone")
    .eq("user_id", userId);

  if (!recipients || recipients.length === 0) return;

  const failures: string[] = [];
  for (const recipient of recipients as { phone: string }[]) {
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
      const message = err instanceof Error ? err.message : "발송 실패";
      failures.push(`${recipient.phone.slice(-4)}: ${message}`);
    }
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
