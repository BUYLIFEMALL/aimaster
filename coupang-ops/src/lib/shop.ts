import "server-only";
import { createClient } from "@/lib/supabase/server";

// 상세페이지 자동화(shop-detail-page) 상품을 회원 세션으로 읽는다 — RLS로 본인 상품만 보인다.
// smartstore-register/src/lib/data.ts의 같은 함수와 같은 규칙(프로그램끼리 코드를 불러 쓰지 않아 이 앱에 따로 둔다).
// 이미지는 비공개 버킷 shop-detail-images — 저장된 주소 문자열에서 경로만 꺼내 짧은 서명 주소(화면 미리보기용)를 만든다.

export const SHOP_IMAGE_BUCKET = "shop-detail-images";
const PATH_RE = new RegExp(`/storage/v1/object/(?:public|sign|authenticated)/${SHOP_IMAGE_BUCKET}/([^?#]+)`);

export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(PATH_RE);
  return m ? decodeURIComponent(m[1]) : null;
}

export function orderSections<T extends { section_key: string; section_order: number }>(rows: T[], sequence: string[] | null | undefined): T[] {
  const base = [...rows].sort((a, b) => a.section_order - b.section_order);
  if (!sequence?.length) return base;
  const rank = new Map(sequence.map((k, i) => [k, i]));
  const inSeq = base.filter((r) => rank.has(r.section_key)).sort((a, b) => rank.get(a.section_key)! - rank.get(b.section_key)!);
  return [...inSeq, ...base.filter((r) => !rank.has(r.section_key))];
}

export interface ShopProduct {
  id: string;
  name: string | null;
  product_label: string | null;
  price: number | null;
  sale_price: number | null;
  category: string | null;
  source_image_url: string | null;
  section_sequence: string[] | null;
  status: string;
  updated_at: string;
  reviewed_at?: string | null;
  reference_image_urls?: string[] | null;
}

const PRODUCT_COLS = "id,name,product_label,price,sale_price,category,source_image_url,section_sequence,status,updated_at,reviewed_at,reference_image_urls";

export function productName(p: Pick<ShopProduct, "name" | "product_label">): string {
  return (p.name || p.product_label || "").trim() || "(상품명 없음)";
}

export async function listShopProducts(userId: string): Promise<{ rows: ShopProduct[]; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("shop_products").select(PRODUCT_COLS).eq("user_id", userId).order("updated_at", { ascending: false }).limit(60);
  if (error) console.error("[coupang-ops] listShopProducts", error.code);
  // 검토 완료 상품을 먼저(그 안에서는 최근 수정 순 유지)
  const rows = ((data ?? []) as ShopProduct[]).sort((a, b) => Number(Boolean(b.reviewed_at)) - Number(Boolean(a.reviewed_at)));
  return { rows, error: Boolean(error) };
}

export interface ShopImage {
  path: string;
  url: string | null;
}

/** 상품 하나 + 대표·참고(추가)·섹션(상세) 이미지 경로. 회원 본인 폴더 경로만 쓴다. */
export async function getShopProduct(userId: string, productId: string) {
  const supabase = await createClient();
  const { data: product } = await supabase.from("shop_products").select(PRODUCT_COLS).eq("id", productId).eq("user_id", userId).maybeSingle();
  if (!product) return null;
  const p = product as ShopProduct;
  const { data: rows } = await supabase
    .from("shop_product_images")
    .select("section_key,section_order,image_url")
    .eq("product_id", productId)
    .eq("user_id", userId);
  const own = (path: string | null): path is string => Boolean(path && path.startsWith(`${userId}/`));
  const ordered = orderSections(((rows ?? []) as { section_key: string; section_order: number; image_url: string | null }[]).filter((r) => r.image_url), p.section_sequence);
  const sectionPaths = ordered.map((r) => storagePathFromUrl(r.image_url)).filter(own);
  const mainPath = storagePathFromUrl(p.source_image_url);
  const extraPaths = (p.reference_image_urls ?? []).map((u) => storagePathFromUrl(u)).filter(own).slice(0, 9);
  const all = [...(own(mainPath) ? [mainPath] : []), ...extraPaths, ...sectionPaths];
  const signed = new Map<string, string>();
  if (all.length) {
    const { data } = await supabase.storage.from(SHOP_IMAGE_BUCKET).createSignedUrls(all, 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }
  const img = (path: string): ShopImage => ({ path, url: signed.get(path) ?? null });
  return {
    product: p,
    mainImage: own(mainPath) ? img(mainPath) : null,
    extraImages: extraPaths.map(img),
    sectionImages: sectionPaths.map(img),
  };
}
