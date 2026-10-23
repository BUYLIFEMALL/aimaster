"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";

/**
 * 게시글 작성(생성) 화면에서 재생성/업로드 이력 중 하나를 삭제할 때, DB는 아직 없으므로
 * (post/slide 행이 없음) Storage 파일만 지워서 계속 쌓이지 않게 한다. 경로가 본인 소유
 * 폴더("{user_id}/...")가 아니면 조용히 무시한다.
 */
export async function deleteUploadedImageAction(formData: FormData): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const imageUrl = String(formData.get("imageUrl") ?? "");

  const marker = "/insta-post-images/";
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return {};
  const path = imageUrl.slice(idx + marker.length);
  if (!path.startsWith(`${user.id}/`)) return {};

  const supabase = await createClient();
  await supabase.storage.from("insta-post-images").remove([path]);
  return {};
}
