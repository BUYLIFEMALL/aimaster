// 비회원 주문(D15) 서버 쪽 — 쿠키 장바구니를 상품·옵션으로 풀고, 조회 토큰 쿠키를 읽고 쓴다.
// 쿠키는 몰 주소(/s/<몰>) 아래에만, httpOnly. 가격·재고·권한은 DB 함수(mall_builder_place_guest_order)가 다시 검사한다.
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Variant } from "@/lib/options";
import type { ProductRow } from "@/lib/store";
import { cartCookieName, guestCookieName, GUEST_TOKEN_DAYS, parseCart, serializeCart, type GuestCartLine } from "@/lib/guest";

export type GuestCartRow = { index: number; qty: number; product: ProductRow; variant: (Variant & { id: string }) | null };

function cookieOptions(slug: string, maxAgeDays: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: `/s/${slug}`, maxAge: maxAgeDays * 86400 };
}

export async function readGuestCart(slug: string): Promise<GuestCartLine[]> {
  return parseCart((await cookies()).get(cartCookieName(slug))?.value);
}

/** 서버 동작에서만 부른다(화면 컴포넌트는 쿠키를 쓸 수 없음) */
export async function writeGuestCart(slug: string, lines: GuestCartLine[]) {
  const jar = await cookies();
  if (!lines.length) jar.set(cartCookieName(slug), "", { ...cookieOptions(slug, 0), maxAge: 0 });
  else jar.set(cartCookieName(slug), serializeCart(lines), cookieOptions(slug, 30));
}

/** 쿠키 장바구니 → 상품·옵션(손님 화면과 같은 DB 함수로 읽는다). 지금 보이지 않는 상품 줄은 뺀다 */
export async function loadGuestCart(storeId: string, slug: string): Promise<GuestCartRow[]> {
  const lines = await readGuestCart(slug);
  if (!lines.length) return [];
  const supabase = await createClient();
  const productIds = [...new Set(lines.map((l) => l.p))];
  const variantIds = lines.map((l) => l.v).filter((v): v is string => !!v);
  const [{ data: products }, { data: variants }] = await Promise.all([
    supabase.rpc("mall_builder_shop_products", { p_store_id: storeId, p_ids: productIds, p_limit: productIds.length }),
    variantIds.length
      ? supabase.from("mall_builder_product_variants").select("id, product_id, key, values, extra_price, stock, sku, is_active").in("id", variantIds)
      : Promise.resolve({ data: [] as (Variant & { id: string; product_id: string })[] }),
  ]);
  const pMap = new Map(((products ?? []) as ProductRow[]).map((p) => [p.id, p]));
  const vMap = new Map(((variants ?? []) as (Variant & { id: string; product_id: string })[]).map((v) => [v.id, v]));
  const out: GuestCartRow[] = [];
  lines.forEach((l, index) => {
    const product = pMap.get(l.p);
    if (!product) return;
    const variant = l.v ? vMap.get(l.v) ?? null : null;
    if (l.v && (!variant || variant.product_id !== product.id)) return;
    out.push({ index, qty: l.q, product, variant });
  });
  return out;
}

/** 조회 토큰들 — { 주문 id: 토큰 }, 최근 10개 */
export async function readGuestTokens(slug: string): Promise<Record<string, string>> {
  try {
    const raw = JSON.parse((await cookies()).get(guestCookieName(slug))?.value ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter(([k, v]) => /^[0-9a-f-]{36}$/.test(k) && typeof v === "string" && /^[0-9a-f]{48}$/.test(v))) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function saveGuestToken(slug: string, orderId: string, token: string) {
  const current = await readGuestTokens(slug);
  delete current[orderId];
  const next = Object.fromEntries([...Object.entries(current), [orderId, token]].slice(-10));
  (await cookies()).set(guestCookieName(slug), JSON.stringify(next), cookieOptions(slug, GUEST_TOKEN_DAYS));
}
