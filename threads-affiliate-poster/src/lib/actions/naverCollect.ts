"use server";

// 2026-11-16 threads-auto(MIT) 이식 2단계 — 네이버 브랜드커넥트 링크 → 회원 브라우저 확장이 실제 상품 페이지에서 수집 → 상품 등록.
// 수집은 회원 PC·회원 브라우저에서만(서버가 쇼핑몰을 읽지 않음). 결과는 회원 소유 표 tap_collect_queue(RLS·30일 정리)에만 둔다.
import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { parseNaverBrandLinks, sanitizeCollected, isNaverBrandAffiliateUrl } from "@/lib/naver/brandConnect";
import type { Database } from "@/types/database.types";

export type NaverQueueRow = Pick<
  Database["public"]["Tables"]["tap_collect_queue"]["Row"],
  "id" | "affiliate_url" | "status" | "connect_kind" | "final_url" | "product_name" | "image_urls" | "reviews" | "error" | "product_id" | "created_at"
>;

const COLUMNS = "id, affiliate_url, status, connect_kind, final_url, product_name, image_urls, reviews, error, product_id, created_at";

export async function listNaverQueueAction(): Promise<{ rows?: NaverQueueRow[]; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tap_collect_queue")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return { error: error.message };
  return { rows: (data ?? []) as NaverQueueRow[] };
}

/** 줄마다 붙여 넣은 naver.me 링크를 대기열에 넣는다(이미 대기열에 있는 링크는 건너뜀). */
export async function addNaverLinksAction(text: string): Promise<{ added?: number; duplicated?: number; rejected?: string[]; error?: string }> {
  const user = await requireProgramAccess();
  const { links, rejected } = parseNaverBrandLinks(text);
  if (!links.length) return { error: "네이버 브랜드커넥트에서 발급한 https://naver.me/… 링크를 줄마다 하나씩 넣어 주세요.", rejected };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("tap_collect_queue").select("affiliate_url").eq("user_id", user.id).in("affiliate_url", links);
  const have = new Set((existing ?? []).map((r) => r.affiliate_url));
  const fresh = links.filter((l) => !have.has(l));
  if (fresh.length) {
    const { error } = await supabase.from("tap_collect_queue").insert(fresh.map((affiliate_url) => ({ user_id: user.id, affiliate_url })));
    if (error) return { error: error.message };
  }
  revalidatePath("/products");
  return { added: fresh.length, duplicated: links.length - fresh.length, rejected };
}

/** 확장이 보낸 수집 결과(또는 확장 오류)를 저장한다. 서버에서 도착 주소·이미지 주소를 다시 검사한다. */
export async function saveNaverCollectedAction(id: string, raw: unknown, extensionError?: string): Promise<{ status?: string; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: row } = await supabase.from("tap_collect_queue").select("id, status").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!row) return { error: "대기열 항목을 찾지 못했습니다." };
  if (row.status === "registered") return { status: "registered" };
  const now = new Date().toISOString();
  if (extensionError) {
    await supabase.from("tap_collect_queue").update({ status: "needs_review", error: String(extensionError).slice(0, 300), updated_at: now }).eq("id", id).eq("user_id", user.id);
    return { status: "needs_review" };
  }
  const c = sanitizeCollected(raw);
  if ("error" in c) {
    await supabase.from("tap_collect_queue").update({ status: "needs_review", error: c.error, updated_at: now }).eq("id", id).eq("user_id", user.id);
    return { status: "needs_review" };
  }
  const { error } = await supabase
    .from("tap_collect_queue")
    .update({
      status: "ready", error: null, connect_kind: c.kind, final_url: c.finalUrl, product_name: c.productName,
      image_urls: c.imageUrls, reviews: c.reviews, facts: c.facts, updated_at: now,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  await logProgramUsage({ userId: user.id, action: "naver_collect_product" });
  return { status: "ready" };
}

/** 「준비됨」 항목을 상품으로 등록한다(최대 30개). 근거(후기·정보)는 대기열 표에 남고 글 생성 때 product_id로 찾아 쓴다. */
export async function registerNaverCollectedAction(ids: string[]): Promise<{ inserted?: number; error?: string }> {
  const user = await requireProgramAccess();
  if (!Array.isArray(ids) || !ids.length) return { error: "등록할 항목을 골라 주세요." };
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("tap_collect_queue")
    .select("id, affiliate_url, final_url, product_name, image_urls, status")
    .eq("user_id", user.id)
    .in("id", ids.slice(0, 30));
  if (error) return { error: error.message };
  let inserted = 0;
  for (const r of rows ?? []) {
    if (r.status !== "ready" || !r.product_name || !r.final_url || !isNaverBrandAffiliateUrl(r.affiliate_url)) continue;
    const images = Array.isArray(r.image_urls) ? (r.image_urls as string[]) : [];
    const { data: product, error: insErr } = await supabase
      .from("affiliate_products")
      .insert({
        user_id: user.id,
        platform: "naver",
        product_name: r.product_name,
        product_url: r.final_url, // 실제 상품 페이지 — 쇼핑/여행 고지 판별에 쓴다
        affiliate_url: r.affiliate_url, // 발급받은 naver.me 링크 그대로
        image_url: images[0] ?? null,
        input_mode: "manual",
      })
      .select("id")
      .single();
    if (insErr || !product) continue;
    await supabase.from("tap_collect_queue").update({ status: "registered", product_id: product.id, updated_at: new Date().toISOString() }).eq("id", r.id).eq("user_id", user.id);
    inserted++;
  }
  if (inserted) await logProgramUsage({ userId: user.id, action: "register_naver_collected" });
  revalidatePath("/products");
  return { inserted };
}

export async function deleteNaverQueueAction(id: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { error } = await supabase.from("tap_collect_queue").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/products");
  return {};
}
