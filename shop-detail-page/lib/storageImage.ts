import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SHOP_IMAGE_BUCKET, storagePathFromUrl } from "@/lib/imageSrc";

/**
 * 저장된 이미지(v1.16부터 사양서 PDF 포함) 주소를 base64로 읽는다(Gemini inlineData·긴 PNG 합치기용).
 * v1.15부터 버킷이 비공개라 공개 주소로 fetch할 수 없으므로, 우리 버킷 이미지는 요청 세션
 * 클라이언트(RLS: 본인 폴더만 읽기)로 직접 내려받는다. 다른 회원 경로는 RLS가 막는다.
 */
export async function downloadImageAsBase64(
  supabase: SupabaseClient,
  imageUrl: string,
): Promise<{ base64: string; mimeType: string }> {
  const path = storagePathFromUrl(imageUrl);
  if (path) {
    const { data, error } = await supabase.storage.from(SHOP_IMAGE_BUCKET).download(path);
    if (error || !data) {
      throw new Error(`저장된 이미지를 읽지 못했습니다${error?.message ? ` (${error.message})` : ""}.`);
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    return { base64: buffer.toString("base64"), mimeType: data.type || "image/png" };
  }

  // 서버가 화면에서 넘어온 임의 주소를 대신 받아오지 않도록 우리 버킷 이미지만 허용한다.
  throw new Error("지원하지 않는 이미지 주소입니다. 이미지를 다시 업로드해 주세요.");
}
