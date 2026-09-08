"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { sendReportToKakaoCore } from "@/lib/kakaoSend";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateAndUploadReportImage } from "@/lib/ai/reportImage";

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

export interface GenerateImageState {
  error?: string;
  url?: string;
}

/**
 * 수정 화면(RichTextEditor)에서 "✨ AI 이미지 생성" 버튼으로 호출한다. Gemini(나노바나나)를
 * 직접 호출해서 이미지를 만들고(docs/PLATFORM_PATTERNS.md §12), 이 프로젝트 전용 공개 버킷
 * kakao-report-images(본인 폴더)에 업로드한 뒤 공개 URL을 반환한다 — 에디터가 그 URL을
 * <img>로 삽입한다. 회원 본인의 gemini 키가 없으면 등록 안내로 막는다(폴백 없음).
 */
export async function generateReportImageAction(
  _prevState: GenerateImageState,
  formData: FormData,
): Promise<GenerateImageState> {
  const user = await requireProgramAccess();
  const prompt = String(formData.get("prompt") ?? "").trim();
  if (!prompt) return { error: "이미지로 만들 내용을 입력해주세요." };

  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, user.id, "gemini");
  if (!apiKey) {
    return { error: "Gemini API 키가 등록되어 있지 않습니다. 설정 페이지에서 먼저 등록해주세요." };
  }

  try {
    const url = await generateAndUploadReportImage(supabase, user.id, apiKey, prompt);
    if (!url) return { error: "이미지 업로드에 실패했습니다." };
    return { url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "이미지 생성에 실패했습니다." };
  }
}
