"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 인스타그램 피드 이미지 권장 상한(8MB)보다 약간 여유
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface UploadImageState {
  imageUrl?: string;
  error?: string;
}

/**
 * 게시글 작성(생성) 화면에서 AI 생성 대신 사용자가 직접 고른 이미지 파일을 업로드한다.
 * 이 시점엔 아직 insta_posts/insta_post_slides 행이 없으므로(제출해야 만들어짐) DB는
 * 건드리지 않고 Storage 업로드 후 공개 URL만 돌려준다 — generateImageAction과 동일한
 * 형태로 클라이언트 state(SlideDraft)에 그대로 꽂아 넣을 수 있게 맞췄다.
 */
export async function uploadCustomImageAction(formData: FormData): Promise<UploadImageState> {
  const user = await requireProgramAccess();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "이미지 파일을 선택해주세요." };
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: "JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "파일 용량은 10MB 이하만 업로드할 수 있습니다." };
  }

  try {
    const supabase = await createClient();
    const ext = file.type.split("/")[1] ?? "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("insta-post-images")
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from("insta-post-images").getPublicUrl(path);
    return { imageUrl: data.publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.";
    return { error: message };
  }
}

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
