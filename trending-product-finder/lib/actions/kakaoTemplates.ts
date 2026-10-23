"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface KakaoTemplateActionState {
  error?: string;
}

/** 예약 소싱 알림/관심상품 변경 알림에서 "카카오 알림톡" 채널을 쓰려면, 본인 Solapi
 * 계정에 미리 승인받은 템플릿 ID를 등록해야 한다. 발송 문구 전체를 하나의 변수(#{내용})로
 * 담는 템플릿을 승인받아 등록하도록 설정 화면에서 안내한다(Phase 21, 2026-09-04). */
export async function saveKakaoTemplatesAction(formData: FormData): Promise<KakaoTemplateActionState> {
  const user = await requireProgramAccess();

  const sourcingTemplateId = String(formData.get("sourcingTemplateId") ?? "").trim() || null;
  const priceTemplateId = String(formData.get("priceTemplateId") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("user_kakao_alimtalk_templates").upsert(
    {
      user_id: user.id,
      sourcing_template_id: sourcingTemplateId,
      price_template_id: priceTemplateId,
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}
