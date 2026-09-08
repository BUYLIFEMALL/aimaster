"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { sendReportToKakaoCore } from "@/lib/kakaoSend";

export interface SendKakaoState {
  error?: string;
  success?: boolean;
}

/**
 * 리포트 1건을 카카오톡 채널(SOLAPI 친구톡/브랜드메시지)로 발송한다. 수신 번호는
 * trending-product-finder Phase 10과 동일하게 루트 공용 `profiles.phone`을 재사용한다
 * (신규 필드 추가 없음). 실제 발송 로직은 텔레그램 승인 웹훅과 공유하기 위해
 * lib/kakaoSend.ts로 분리했다.
 */
export async function sendReportToKakaoAction(
  _prevState: SendKakaoState,
  formData: FormData,
): Promise<SendKakaoState> {
  const user = await requireProgramAccess();
  const reportId = String(formData.get("reportId") ?? "");
  if (!reportId) return { error: "리포트를 찾을 수 없습니다." };

  const supabase = await createClient();
  const result = await sendReportToKakaoCore(supabase, user.id, reportId);
  revalidatePath(`/reports/${reportId}`);
  return result;
}
