"use server";
// 메이커 P2(2026-11-13): 바나나 「🛍 상품 대표사진 합성」 결과를 상품의 대표사진 칸(main_image_url)에 새 버전으로 기록한다.
// 파일 업로드는 브라우저가 본인 폴더로 직접 하고(lib/mainPhotoClient.ts), 여기서는 본인 상품·본인 폴더·묵은 작업만 확인해 기록한다.
// 원본 사진(source_image_url)·참고 사진(reference_image_urls)은 건드리지 않는다.
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SHOP_IMAGE_BUCKET, storagePathFromUrl } from "@/lib/imageSrc";
import { isOwnMainPhotoPath, isStale, nextMainHistory } from "@/lib/mainPhoto";

export async function setMainPhotoAction(productId: string, imageUrl: string, baseRevision: string): Promise<{ error?: string; updatedAt?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const path = storagePathFromUrl(imageUrl);
  if (!isOwnMainPhotoPath(path, user.id, productId)) return { error: "대표사진 파일 위치가 올바르지 않습니다." };

  const { data: p } = await supabase.from("shop_products").select("id, updated_at, main_image_urls").eq("id", productId).eq("user_id", user.id).maybeSingle();
  if (!p) {
    await supabase.storage.from(SHOP_IMAGE_BUCKET).remove([path!]);
    return { error: "상품을 찾을 수 없습니다(삭제됐거나 본인 상품이 아닙니다)." };
  }
  if (isStale(baseRevision, p.updated_at)) {
    await supabase.storage.from(SHOP_IMAGE_BUCKET).remove([path!]);
    return { error: "작업을 보낸 뒤 상품이 바뀌었습니다. 상품 목록에서 다시 보내 주세요." };
  }

  const { list, dropped } = nextMainHistory(p.main_image_urls, imageUrl);
  const { data: saved, error } = await supabase.from("shop_products")
    .update({ main_image_url: imageUrl, main_image_urls: list })
    .eq("id", productId).eq("user_id", user.id)
    .select("updated_at").maybeSingle();
  if (error || !saved) {
    await supabase.storage.from(SHOP_IMAGE_BUCKET).remove([path!]);
    return { error: `대표사진을 기록하지 못했습니다: ${error?.message ?? "알 수 없는 오류"}` };
  }
  const old = dropped.map((u) => storagePathFromUrl(u)).filter((x): x is string => isOwnMainPhotoPath(x, user.id, productId));
  if (old.length) await supabase.storage.from(SHOP_IMAGE_BUCKET).remove(old);
  return { updatedAt: saved.updated_at };
}

/** 합성 대표사진을 쓰지 않고 원본 사진으로 되돌린다(이력 파일도 지움) */
export async function clearMainPhotoAction(productId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: p } = await supabase.from("shop_products").select("main_image_urls").eq("id", productId).eq("user_id", user.id).maybeSingle();
  if (!p) return { error: "상품을 찾을 수 없습니다." };
  const { error } = await supabase.from("shop_products").update({ main_image_url: null, main_image_urls: [] }).eq("id", productId).eq("user_id", user.id);
  if (error) return { error: error.message };
  const old = (p.main_image_urls ?? []).map((u) => storagePathFromUrl(u)).filter((x): x is string => isOwnMainPhotoPath(x, user.id, productId));
  if (old.length) await supabase.storage.from(SHOP_IMAGE_BUCKET).remove(old);
  return {};
}
