import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SHOP_IMAGE_BUCKET } from "@/lib/imageSrc";

// v1.21: 내보낸 파일(긴 PNG·섹션 ZIP)을 서버 응답 본문으로 보내지 않고, 회원 본인 폴더에 저장한 뒤
// 짧은 서명 주소로 내려받게 한다. Vercel 함수 응답은 4.5MB까지라 12~15장을 합친 긴 PNG가 넘을 수 있다.
// 서명 주소는 회원 본인 세션으로 만들고(버킷 RLS: 본인 폴더만), 60초만 유효하다.
const DOWNLOAD_URL_SECONDS = 60;

/** 저장에 성공하면 저장 위치를 돌려준다. 실패하면 null. */
export async function storeExport(
  supabase: SupabaseClient,
  path: string,
  body: Buffer,
  contentType: string,
): Promise<string | null> {
  const { error } = await supabase.storage
    .from(SHOP_IMAGE_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  return error ? null : path;
}

/** 저장된 파일을 내려받기 이름으로 받는 서명 주소로 보낸다. 서명에 실패하면 null. */
export async function redirectToDownload(
  supabase: SupabaseClient,
  path: string,
  fileName: string,
): Promise<NextResponse | null> {
  // 내려받기 이름은 서명 주소 뒤에 직접 붙인다: storage-js의 { download: 이름 }은 이름을 두 번 인코딩해
  // 한글 이름이 「%EC%8B%9C…」 글자 그대로 저장됐다(2026-10-22 v1.21 크롬 확인). 한 번만 인코딩하면 서버가
  // filename*=UTF-8''… 로 보내 한글 이름으로 저장된다(서명은 그대로 유효).
  const { data, error } = await supabase.storage.from(SHOP_IMAGE_BUCKET).createSignedUrl(path, DOWNLOAD_URL_SECONDS);
  if (error || !data?.signedUrl) return null;
  const sep = data.signedUrl.includes("?") ? "&" : "?";
  return NextResponse.redirect(`${data.signedUrl}${sep}download=${encodeURIComponent(fileName)}`, 303);
}

export function safeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").trim() || "product";
}
