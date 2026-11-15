import { createClient } from "./supabase/server";

export interface ResellerShopInfo {
  resellerId: string;
  code: string;
  resellerName: string;
  companyName: string | null;
  rate: number;
  picksCount: number;
}

export interface ResellerShopProduct {
  id: string;
  name: string;
  summary: string | null;
  basePrice: number;
  listPrice: number | null;
  imageUrl: string;
  isPicked: boolean;
}

export interface ResellerShopResult {
  ready: boolean;
  reseller: ResellerShopInfo | null;
  products: ResellerShopProduct[];
  isFallback: boolean;
}

/**
 * 리셀러 진열 페이지 (링크샵) 데이터 조회
 */
export async function getResellerShopData(
  storeId: string,
  code: string
): Promise<ResellerShopResult> {
  const supabase = await createClient();
  const cleanCode = code.trim().toUpperCase();

  // 1. 활성 리셀러 조회
  const { data: resellerData, error: rErr } = await supabase
    .from("mall_builder_resellers")
    .select(
      `id, customer_id, code, rate, active,
       customer:mall_builder_store_customers!mall_builder_resellers_customer_id_fkey(name, company)`
    )
    .eq("store_id", storeId)
    .eq("code", cleanCode)
    .eq("active", true)
    .maybeSingle();

  if (rErr || !resellerData) {
    return { ready: true, reseller: null, products: [], isFallback: false };
  }

  type RawReseller = {
    id: string;
    code: string;
    rate: number;
    customer?: { name: string; company: string | null } | null;
  };
  const r = resellerData as unknown as RawReseller;
  const resellerName = r.customer?.name || `파트너 ${r.code}`;
  const companyName = r.customer?.company || null;

  // 2. 리셀러 픽(Pick) 상품 ID 목록 조회
  const { data: picksData } = await supabase
    .from("mall_builder_reseller_picks")
    .select("product_id")
    .eq("reseller_id", r.id);

  const pickedIds = (picksData ?? []).map((p) => p.product_id as string);
  const hasPicks = pickedIds.length > 0;

  // 3. 진열할 상품 목록 조회
  let productsQuery = supabase
    .from("mall_builder_products")
    .select("id, name, summary, base_price, list_price, images, status, visibility")
    .eq("store_id", storeId)
    .eq("status", "active")
    .neq("visibility", "hidden");

  if (hasPicks) {
    productsQuery = productsQuery.in("id", pickedIds).limit(100);
  } else {
    // 픽이 없으면 몰의 대표 활성 상품 최대 24개 노출 (폴백)
    productsQuery = productsQuery.order("created_at", { ascending: false }).limit(24);
  }

  const { data: prodData } = await productsQuery;

  type RawProduct = {
    id: string;
    name: string;
    summary: string | null;
    base_price: number;
    list_price: number | null;
    images?: { url: string }[] | string[] | null;
  };

  const pickedSet = new Set(pickedIds);
  const products: ResellerShopProduct[] = ((prodData ?? []) as unknown as RawProduct[]).map(
    (p) => {
      let imageUrl = "";
      if (Array.isArray(p.images) && p.images.length > 0) {
        const first = p.images[0];
        imageUrl = typeof first === "string" ? first : first?.url || "";
      }
      return {
        id: p.id,
        name: p.name,
        summary: p.summary,
        basePrice: Number(p.base_price || 0),
        listPrice: p.list_price ? Number(p.list_price) : null,
        imageUrl,
        isPicked: pickedSet.has(p.id),
      };
    }
  );

  return {
    ready: true,
    reseller: {
      resellerId: r.id,
      code: r.code,
      resellerName,
      companyName,
      rate: Number(r.rate || 0),
      picksCount: pickedIds.length,
    },
    products,
    isFallback: !hasPicks,
  };
}
