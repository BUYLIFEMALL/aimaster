"use client";

import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface UploadImageDirectResult {
  url?: string;
  error?: string;
}

/**
 * 이미지 파일을 브라우저에서 Supabase Storage로 직접 업로드한다(서버 액션을 거치지 않음).
 *
 * 처음엔 Server Action(uploadCustomImageAction/uploadSlideCustomImageAction)으로 파일을
 * 서버에 보낸 뒤 서버가 Storage에 올리는 방식이었는데, Vercel 서버리스 함수의 요청 본문
 * 크기 제한(Next.js의 serverActions.bodySizeLimit을 늘려도 플랫폼 자체 한도까지는 못
 * 늘어남)에 걸려 실제 사진 파일을 올리면 "This page couldn't load. A server error
 * occurred."로 죽는 문제가 있었다(2026-08-13 확인). 브라우저 → Supabase Storage로 바로
 * 올리면 Vercel 함수를 거치지 않아 이 제한 자체가 적용되지 않는다. Storage 버킷 RLS가
 * "{auth.uid()}/파일명" 경로에만 쓰기를 허용하므로 본인 폴더 밖에는 못 쓴다.
 */
export async function uploadImageDirect(file: File): Promise<UploadImageDirectResult> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: "JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "파일 용량은 10MB 이하만 업로드할 수 있습니다." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const ext = file.type.split("/")[1] ?? "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("insta-post-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    return { error: error.message };
  }

  const { data } = supabase.storage.from("insta-post-images").getPublicUrl(path);
  return { url: data.publicUrl };
}
