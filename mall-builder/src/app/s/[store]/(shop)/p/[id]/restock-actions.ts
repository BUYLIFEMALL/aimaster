"use server";

// 재입고 알림 신청(D16) — 회원·비회원 모두. 검사(동의·번호·품절 여부·중복·신청 수 제한)는 DB 함수가 한다
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";

export type RestockResult = { ok: boolean; message: string };

export async function requestRestockAction(
  slug: string,
  productId: string,
  variantId: string | null,
  phone: string,
  agree: boolean,
): Promise<RestockResult> {
  if (!/^[0-9a-f-]{36}$/.test(productId) || (variantId && !/^[0-9a-f-]{36}$/.test(variantId))) {
    return { ok: false, message: "상품을 찾을 수 없습니다." };
  }
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_restock_request", {
    p_store_id: store.id,
    p_product_id: productId,
    p_variant_id: variantId,
    p_phone: phone,
    p_agree: agree,
  });
  if (error) return { ok: false, message: error.message };
  const already = (data as { already?: boolean } | null)?.already;
  return {
    ok: true,
    message: already ? "이미 신청하셨습니다. 다시 입고되면 알려 드립니다." : "신청했습니다. 다시 입고되면 문자로 알려 드립니다.",
  };
}
