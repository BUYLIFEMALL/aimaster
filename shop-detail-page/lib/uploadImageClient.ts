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
 * Vercel 서버리스 함수 요청 본문 크기 제한을 우회하기 위한 패턴 — insta_auto_poster/threads와 동일
 * (lib/uploadImageClient.ts 참고). Storage 버킷 RLS가 "{auth.uid()}/파일명" 경로에만 쓰기를
 * 허용하므로 본인 폴더 밖에는 못 쓴다.
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
  const path = `${user.id}/products/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("shop-detail-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    return { error: error.message };
  }

  const { data } = supabase.storage.from("shop-detail-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

/**
 * 상품 상세페이지의 특정 섹션에 직접 보유한 이미지를 올린다(AI 생성이 아님).
 * `.../custom/`에 저장해서 `.../generated/`(나노바나나 생성)와 경로로 구분한다.
 */
export async function uploadCustomSectionImage(
  productId: string,
  sectionKey: string,
  file: File,
): Promise<UploadImageDirectResult> {
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
  const path = `${user.id}/products/${productId}/custom/${sectionKey}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("shop-detail-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    return { error: error.message };
  }

  const { data } = supabase.storage.from("shop-detail-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

const MAX_SPEC_DOC_SIZE = 10 * 1024 * 1024;

/**
 * v1.16: 상품 사양서 PDF를 본인 폴더(`<회원id>/products/docs/`)에 올린다. 서버 액션 본문 한도(1MB)를
 * 넘기 쉬워 이미지와 같은 방식으로 브라우저가 직접 올리고, 분석 때 서버가 내려받아 Gemini에 문서로 넘긴다.
 * 30일 정리 작업이 상품에 연결되지 않은 이 폴더 파일을 함께 지운다.
 */
export async function uploadSpecDocument(file: File): Promise<UploadImageDirectResult> {
  if (file.type !== "application/pdf") {
    return { error: "PDF 파일만 올릴 수 있습니다. TXT·MD는 내용이 바로 입력칸에 들어갑니다." };
  }
  if (file.size > MAX_SPEC_DOC_SIZE) {
    return { error: "사양서 PDF는 10MB 이하만 올릴 수 있습니다." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const path = `${user.id}/products/docs/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage
    .from("shop-detail-images")
    .upload(path, file, { contentType: "application/pdf", upsert: false });
  if (error) {
    return { error: error.message };
  }

  const { data } = supabase.storage.from("shop-detail-images").getPublicUrl(path);
  return { url: data.publicUrl };
}
