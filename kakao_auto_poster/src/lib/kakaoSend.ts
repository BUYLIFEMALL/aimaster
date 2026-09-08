import "server-only";
import { sendFriendtalk } from "@/lib/solapi/client";
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
      const [{ data: profile }, { data: solapiAccount }] = await Promise.all([
        supabase.from("profiles").select("phone").eq("id", userId).maybeSingle(),
        supabase
          .from("user_solapi_accounts")
          .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

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

      const text = [`📨 ${report.title}`, "", report.summary, "", `전체 보기: ${reportUrl}`].join("\n");
      await sendFriendtalk(solapiAccount, profile.phone, text);
    }

    await supabase
      .from("kakao_reports")
      .update({ kakao_sent_at: new Date().toISOString(), kakao_send_error: null })
      .eq("id", reportId);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "발송에 실패했습니다.";
    await supabase.from("kakao_reports").update({ kakao_send_error: message }).eq("id", reportId);
    return { error: message };
  }
}
