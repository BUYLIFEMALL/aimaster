"use server";

import { requireProgramAccess } from "@/lib/access";
import { SHOP_IMAGE_BUCKET } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

const MAX_EXTRA = 9;
const MAX_DETAIL = 20;

/** 상세페이지 없이 등록(R4): 회원 본인 폴더에 올린 이미지로 상품을 만들어 기존 등록 화면으로 보낸다. 본인 폴더 경로만 받는다 */
export async function createQuickProductAction(input: { name: string; price: number; salePrice: number; mainPath: string; extraPaths: string[]; detailPaths: string[] }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireProgramAccess();
  const name = String(input.name ?? "").trim().slice(0, 100);
  if (!name) return { ok: false, error: "상품명을 넣어 주세요." };
  const sale = Number(input.salePrice);
  const price = Math.max(Number(input.price) || 0, sale);
  if (!Number.isInteger(sale) || sale <= 0 || sale % 10 !== 0) return { ok: false, error: "판매가를 10원 단위로 넣어 주세요." };
  const own = (p: unknown) => typeof p === "string" && p.startsWith(`${user.id}/`) && !p.includes("..");
  const extra = (input.extraPaths ?? []).filter(own).slice(0, MAX_EXTRA);
  const detail = (input.detailPaths ?? []).filter(own).slice(0, MAX_DETAIL);
  if (!own(input.mainPath)) return { ok: false, error: "대표 이미지를 올려 주세요." };
  if (!detail.length) return { ok: false, error: "상세 이미지를 한 장 이상 올려 주세요." };
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/${SHOP_IMAGE_BUCKET}`;
  const url = (p: string) => `${base}/${p.split("/").map(encodeURIComponent).join("/")}`;
  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from("shop_products")
    .insert({ user_id: user.id, name, price, sale_price: sale, source_image_url: url(input.mainPath), reference_image_urls: extra.map(url) })
    .select("id")
    .single();
  if (error || !product) return { ok: false, error: "상품을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  const { error: imgError } = await supabase.from("shop_product_images").insert(detail.map((p, i) => ({ product_id: product.id, user_id: user.id, section_key: `coupang_detail_${i + 1}`, section_order: i + 1, image_url: url(p) })));
  if (imgError) {
    await supabase.from("shop_products").delete().eq("id", product.id).eq("user_id", user.id);
    return { ok: false, error: "상세 이미지를 저장하지 못했습니다. 다시 시도해 주세요." };
  }
  return { ok: true, id: product.id };
}
