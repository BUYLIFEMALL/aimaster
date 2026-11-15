// M2-4 상품정보제공고시·KC 인증 읽기(서버) — 상품 상세·수정 화면에서만 따로 읽는다(목록 조회에는 싣지 않음).
// DB 0096이 아직 없는 환경에서는 오류 대신 「없음」을 돌려줘 화면이 깨지지 않게 한다.
import { createClient } from "@/lib/supabase/server";
import { readKc, readNotice, type KcCert, type ProductNotice } from "./productNotice";

export async function getProductNotice(productId: string): Promise<{ notice: ProductNotice | null; kc: KcCert[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mall_builder_products").select("info_notice, kc_certs").eq("id", productId).maybeSingle();
  if (error || !data) return { notice: null, kc: [] };
  return { notice: readNotice(data.info_notice), kc: readKc(data.kc_certs) };
}
