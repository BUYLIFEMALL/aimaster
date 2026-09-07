"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { sendFriendtalk } from "@/lib/solapi/client";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kakao-auto-poster.vercel.app";

export interface SendKakaoState {
  error?: string;
  success?: boolean;
}

/**
 * 리포트 1건을 카카오톡 채널(SOLAPI 친구톡/브랜드메시지)로 발송한다. 수신 번호는
 * trending-product-finder Phase 10과 동일하게 루트 공용 `profiles.phone`을 재사용한다
 * (신규 필드 추가 없음).
 */
export async function sendReportToKakaoAction(
  _prevState: SendKakaoState,
  formData: FormData,
): Promise<SendKakaoState> {
  const user = await requireProgramAccess();
  const reportId = String(formData.get("reportId") ?? "");
  if (!reportId) return { error: "리포트를 찾을 수 없습니다." };

  const supabase = await createClient();
  const [{ data: report }, { data: profile }, { data: solapiAccount }] = await Promise.all([
    supabase.from("kakao_reports").select("id, title, summary").eq("id", reportId).eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
    supabase
      .from("user_solapi_accounts")
      .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!report) return { error: "리포트를 찾을 수 없습니다." };
  if (!profile?.phone) {
    return { error: "AIMaster 프로필에 등록된 전화번호가 없습니다. 프로필에서 먼저 등록해주세요." };
  }
  if (!solapiAccount) {
    return { error: "SOLAPI 계정이 등록되어 있지 않습니다. 설정 페이지에서 먼저 등록해주세요." };
  }
  if (!solapiAccount.kakao_pf_id) {
    return { error: "카카오 채널 ID(pfId)가 등록되어 있지 않습니다. 설정 페이지에서 등록해주세요." };
  }

  const text = [`📨 ${report.title}`, "", report.summary, "", `전체 보기: ${APP_URL}/reports/${report.id}`].join("\n");

  try {
    await sendFriendtalk(solapiAccount, profile.phone, text);
    await supabase
      .from("kakao_reports")
      .update({ kakao_sent_at: new Date().toISOString(), kakao_send_error: null })
      .eq("id", reportId);
    revalidatePath(`/reports/${reportId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "발송에 실패했습니다.";
    await supabase.from("kakao_reports").update({ kakao_send_error: message }).eq("id", reportId);
    revalidatePath(`/reports/${reportId}`);
    return { error: message };
  }
}
