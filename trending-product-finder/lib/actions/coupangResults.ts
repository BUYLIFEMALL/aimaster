"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { hashExtensionToken } from "@/lib/extensionAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resultCutoff } from "@/lib/coupangResults";

// 공용 DB 타입에 없는 표를 쓰므로 from()만 느슨하게 받는다(lib/access.ts와 같은 방식).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any };

const PROGRAM_SLUG = "trending-product-finder";
const AUTO_LABEL = "쿠팡 리뷰 거르기 확장 자동 연결";

export interface ReviewRun {
  id: string;
  keyword: string;
  label: string | null;
  item_count: number;
  created_at: string;
}

export interface ReviewItem {
  product_id: string;
  name: string;
  price: number | null;
  reviews: number;
  is_ad: boolean;
  url: string;
  sales_rank: number | null;
}

export async function listReviewRunsAction(): Promise<{ runs: ReviewRun[]; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = (await createClient()) as unknown as SupabaseLike;
  const { data, error } = await supabase
    .from("coupang_review_runs")
    .select("id, keyword, label, item_count, created_at")
    .eq("user_id", user.id)
    .gte("created_at", resultCutoff())
    .order("created_at", { ascending: false })
    .limit(300);
  return error ? { runs: [], error: "검색 기록을 불러오지 못했습니다." } : { runs: (data ?? []) as ReviewRun[] };
}

export async function getReviewItemsAction(runId: string): Promise<{ items: ReviewItem[]; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = (await createClient()) as unknown as SupabaseLike;
  const { data, error } = await supabase
    .from("coupang_review_items")
    .select("product_id, name, price, reviews, is_ad, url, sales_rank")
    .eq("user_id", user.id)
    .eq("run_id", runId)
    // 판매 순위 순서로. 순위가 없는 예전 기록(2026-11-03 이전)은 리뷰 많은 순
    .order("sales_rank", { ascending: true, nullsFirst: false })
    .order("reviews", { ascending: false })
    .limit(500);
  return error ? { items: [], error: "결과를 불러오지 못했습니다." } : { items: (data ?? []) as ReviewItem[] };
}

export async function renameReviewRunAction(runId: string, label: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = (await createClient()) as unknown as SupabaseLike;
  const { error } = await supabase
    .from("coupang_review_runs")
    .update({ label: label.trim().slice(0, 60) || null })
    .eq("id", runId)
    .eq("user_id", user.id);
  revalidatePath("/coupang-reviews");
  return error ? { error: "이름을 저장하지 못했습니다." } : {};
}

export async function deleteReviewRunAction(runId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = (await createClient()) as unknown as SupabaseLike;
  const { error } = await supabase.from("coupang_review_runs").delete().eq("id", runId).eq("user_id", user.id);
  revalidatePath("/coupang-reviews");
  return error ? { error: "삭제하지 못했습니다." } : {};
}

/** 확장 연결 코드를 새로 만들고, 이 회원의 이전 자동 연결 코드 중 30일 넘게 안 쓴 것을 폐기한다. */
export async function createExtensionConnectTokenAction(): Promise<{ token?: string; error?: string }> {
  const user = await requireProgramAccess();
  const admin = createAdminClient() as unknown as SupabaseLike;
  const token = `pat_${crypto.randomBytes(32).toString("hex")}`;
  const { error } = await admin
    .from("personal_access_tokens")
    .insert({ user_id: user.id, program_slug: PROGRAM_SLUG, label: AUTO_LABEL, token_hash: hashExtensionToken(token) });
  if (error) return { error: "연결 코드를 만들지 못했습니다." };
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  await admin
    .from("personal_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("program_slug", PROGRAM_SLUG)
    .eq("label", AUTO_LABEL)
    .is("revoked_at", null)
    .lt("created_at", cutoff)
    .or(`last_used_at.is.null,last_used_at.lt.${cutoff}`);
  return { token };
}
