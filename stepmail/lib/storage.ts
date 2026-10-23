import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_BUCKET = "stepmail-images";

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

/** Gemini가 돌려준 base64 이미지를 stepmail-images 버킷에 영구 저장하고 공개 URL을 반환한다
 * (music-audio 버킷의 persistBgmAudio류 패턴과 동일 — 제3자 모델의 임시/inline 데이터를 우리
 * Storage로 옮겨서 실제 발송 메일에도 안전하게 쓸 수 있게 한다). */
export async function persistEmailImage(
  supabase: SupabaseClient,
  userId: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${extensionForMimeType(mimeType)}`;
  const buffer = Buffer.from(base64, "base64");

  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, buffer, { contentType: mimeType, upsert: false });
  if (error) throw new Error(`이미지 저장에 실패했습니다: ${error.message}`);

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
