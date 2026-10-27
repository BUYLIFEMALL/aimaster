import "server-only";
import { createClient } from "@/lib/supabase/server";
import { normalizeDefaults, orderSections, type StoreDefaults } from "@/lib/smartstore/fields";

// 상세페이지 자동화(shop-detail-page)와 같은 공용 DB를 회원 세션으로 읽는다 — RLS로 본인 상품만 보인다.
// 이미지는 비공개 버킷 shop-detail-images — 저장된 옛 공개 주소 문자열에서 경로만 꺼내 짧은 서명 주소를 만든다.

export const SHOP_IMAGE_BUCKET = "shop-detail-images";
const PATH_RE = new RegExp(`/storage/v1/object/(?:public|sign|authenticated)/${SHOP_IMAGE_BUCKET}/([^?#]+)`);

export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(PATH_RE);
  return m ? decodeURIComponent(m[1]) : null;
}

export interface ProductRow {
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
  /** 상세페이지에서 회원이 「검토 완료」를 누른 시각(null=검토 전) — 이커머스 한 흐름 4단계 */
  reviewed_at?: string | null;
}

const PRODUCT_COLS = "id,name,product_label,price,sale_price,category,source_image_url,section_sequence,status,updated_at,reviewed_at";

export async function listProducts(userId: string): Promise<{ rows: ProductRow[]; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("shop_products").select(PRODUCT_COLS).eq("user_id", userId).order("updated_at", { ascending: false }).limit(60);
  if (error) console.error("[smartstore-register] listProducts", error.code);
  // 검토 완료 상품을 먼저(그 안에서는 최근 수정 순 유지)
  const rows = ((data ?? []) as ProductRow[]).sort((a, b) => Number(Boolean(b.reviewed_at)) - Number(Boolean(a.reviewed_at)));
  return { rows, error: Boolean(error) };
}

export interface SectionImage {
  sectionKey: string;
  path: string;
  url: string | null;
}

export async function getProductForRegister(userId: string, productId: string) {
  const supabase = await createClient();
  const { data: product } = await supabase.from("shop_products").select(PRODUCT_COLS).eq("id", productId).eq("user_id", userId).maybeSingle();
  if (!product) return null;
  const p = product as ProductRow;
  const { data: rows } = await supabase
    .from("shop_product_images")
    .select("section_key,section_order,image_url")
    .eq("product_id", productId)
    .eq("user_id", userId);
  const ordered = orderSections(((rows ?? []) as { section_key: string; section_order: number; image_url: string | null }[]).filter((r) => r.image_url), p.section_sequence);
  const paths = ordered.map((r) => ({ sectionKey: r.section_key, path: storagePathFromUrl(r.image_url) })).filter((r): r is { sectionKey: string; path: string } => Boolean(r.path));
  const mainPath = storagePathFromUrl(p.source_image_url);
  const all = [...(mainPath ? [mainPath] : []), ...paths.map((r) => r.path)];
  const signed = new Map<string, string>();
  if (all.length) {
    const { data } = await supabase.storage.from(SHOP_IMAGE_BUCKET).createSignedUrls(all, 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }
  const sections: SectionImage[] = paths.map((r) => ({ ...r, url: signed.get(r.path) ?? null }));
  return { product: p, mainImage: mainPath ? { path: mainPath, url: signed.get(mainPath) ?? null } : null, sections };
}

export async function getDefaults(userId: string): Promise<StoreDefaults> {
  const supabase = await createClient();
  const { data } = await supabase.from("smartstore_register_defaults").select("data").eq("user_id", userId).maybeSingle();
  return normalizeDefaults(data?.data);
}

export interface JobRow {
  id: string;
  product_id: string;
  mode: string;
  status: string;
  category_keyword: string;
  market_product_no: string | null;
  failed_step: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export async function listJobs(userId: string, productId?: string): Promise<{ rows: JobRow[]; error: boolean }> {
  const supabase = await createClient();
  let q = supabase
    .from("smartstore_register_jobs")
    .select("id,product_id,mode,status,category_keyword,market_product_no,failed_step,error,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (productId) q = q.eq("product_id", productId);
  const { data, error } = await q;
  if (error) console.error("[smartstore-register] listJobs", error.code);
  return { rows: (data ?? []) as JobRow[], error: Boolean(error) };
}

export const JOB_STATUS: Record<string, { label: string; tone: string }> = {
  queued: { label: "확장 대기", tone: "bg-slate-100 text-slate-700" },
  running: { label: "입력 중", tone: "bg-sky-100 text-sky-800" },
  filled: { label: "입력 완료(회원 확인)", tone: "bg-emerald-100 text-emerald-800" },
  temp_saved: { label: "임시저장 완료", tone: "bg-emerald-100 text-emerald-800" },
  registered: { label: "등록 완료", tone: "bg-green-600 text-white" },
  failed: { label: "실패", tone: "bg-rose-100 text-rose-800" },
  canceled: { label: "취소", tone: "bg-slate-100 text-slate-500" },
};
