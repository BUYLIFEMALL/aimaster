import "server-only";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";

// v1.53: AI 상세페이지 자동화(shop-detail-page)의 섹션 이미지 1장을 새 글 첨부로 가져온다(쓰레드 쇼핑제휴 v1.81과 같은 방식).
// 보내는 쪽은 비공개 버킷의 저장 위치만 주소로 넘긴다(열람 열쇠가 담긴 서명 주소는 넘기지 않음).
// 같은 AIMaster DB·같은 로그인이라, 회원 본인 세션으로 본인 폴더만 읽을 수 있다(버킷 RLS: 본인 폴더만).
// Instagram API는 공개 주소의 이미지만 받으므로, 「직접 첨부」와 같은 공개 버킷 insta-post-images 본인 폴더로 복사한다.
// 복사본 이름은 원본 위치로 정해 새로고침해도 파일이 늘지 않는다(이미 있으면 그대로 사용).
const SHOP_DETAIL_BUCKET = "shop-detail-images";
const PATH_RE = /^[0-9a-f-]{36}\/products\/[A-Za-z0-9._\/-]+\.(png|jpe?g|webp)$/i;
const MAX_BYTES = 8 * 1024 * 1024; // Instagram 이미지 한도 8MB

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function importShopDetailImage(
  userId: string,
  path: string,
): Promise<{ url?: string; error?: string }> {
  if (!PATH_RE.test(path) || path.includes("..")) {
    return { error: "상세페이지 이미지 위치가 올바르지 않습니다." };
  }
  if (!path.startsWith(`${userId}/`)) {
    return { error: "본인이 만든 상세페이지 이미지만 가져올 수 있습니다." };
  }

  const supabase = await createClient();
  const { data: file, error: dlError } = await supabase.storage.from(SHOP_DETAIL_BUCKET).download(path);
  if (dlError || !file) {
    return { error: "상세페이지 이미지를 찾을 수 없습니다. 상세페이지에서 이미지가 남아 있는지 확인해 주세요." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "이미지가 8MB를 넘어 인스타그램에 올릴 수 없습니다." };
  }

  const ext = path.split(".").pop()!.toLowerCase();
  const hash = createHash("sha256").update(path).digest("hex").slice(0, 24);
  // 「직접 첨부」와 같은 위치·이름 규칙(<본인>/<영문·숫자·하이픈>.<확장자>)이라 수정·삭제 화면도 그대로 동작한다.
  const target = `${userId}/sd-${hash}.${ext}`;
  const { error: upError } = await supabase.storage
    .from("insta-post-images")
    .upload(target, file, { contentType: CONTENT_TYPES[ext] ?? "image/png", upsert: false });
  // 같은 원본을 이미 복사했으면(새로고침 등) 그 파일을 그대로 쓴다 — 덮어쓰기 권한에 기대지 않는다.
  if (upError && !/already exists|duplicate/i.test(upError.message)) {
    return { error: `이미지 복사 실패: ${upError.message}` };
  }

  const { data } = supabase.storage.from("insta-post-images").getPublicUrl(target);
  return { url: data.publicUrl };
}
