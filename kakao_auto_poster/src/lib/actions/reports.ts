"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export interface UpdateReportState {
  error?: string;
}

/**
 * 리포트의 제목/본문을 직접 수정한다. 본문은 RichTextEditor(components/ui/RichTextEditor.tsx)로
 * 편집하므로 HTML로 저장된다 — AI가 처음 생성한 리포트는 일반 텍스트라, 상세 페이지에서
 * HTML 태그 포함 여부로 렌더링 방식을 구분한다(app/(dashboard)/reports/[id]/page.tsx).
 */
export async function updateReportAction(
  _prevState: UpdateReportState,
  formData: FormData,
): Promise<UpdateReportState> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "");

  if (!id) return { error: "리포트를 찾을 수 없습니다." };
  if (!title) return { error: "제목을 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("kakao_reports")
    .update({ title, content })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/reports/${id}`);
  revalidatePath("/reports");
  return {};
}

export async function deleteReportAction(formData: FormData) {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("kakao_reports").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/reports");
  redirect("/reports");
}
