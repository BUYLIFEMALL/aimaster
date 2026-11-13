"use client";
// 메이커 P2(2026-11-13): 합성 대표사진을 브라우저에서 본인 폴더 <회원id>/products/<상품id>/main/ 으로 직접 올린다
// (서버 함수 요청 크기 제한 회피 — lib/uploadImageClient.ts와 같은 방식, 버킷 RLS가 본인 폴더만 허용).
import { createClient } from "@/lib/supabase/client";
import { SHOP_IMAGE_BUCKET } from "@/lib/imageSrc";
import { mainPhotoFolder } from "@/lib/mainPhoto";

export async function uploadMainPhoto(productId: string, file: Blob): Promise<{ url?: string; error?: string }> {
  if (file.type !== "image/jpeg" && file.type !== "image/png") return { error: "JPG·PNG 결과만 올릴 수 있습니다." };
  if (file.size > 10 * 1024 * 1024) return { error: "결과가 10MB를 넘습니다." };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const path = `${mainPhotoFolder(user.id, productId)}${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
  const { error } = await supabase.storage.from(SHOP_IMAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: error.message };
  return { url: supabase.storage.from(SHOP_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl };
}
