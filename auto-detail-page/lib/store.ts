import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DetailPageTemplate } from "@/types/database.types";

// 원래는 서버 메모리(Map, 1시간 TTL)에 보관했는데, 사용자별로 영구 보관하고
// RLS로 격리하기 위해 Supabase(public.detail_pages)로 옮겼다
// (supabase/migrations/0001_multitenancy.sql). 항상 요청 세션에 묶인
// (RLS가 적용되는) 클라이언트로 호출해야 본인 것만 접근하도록 보장된다.

export async function savePage(
  supabase: SupabaseClient<Database>,
  userId: string,
  params: { template: DetailPageTemplate; productName: string; html: string },
): Promise<string> {
  const { data, error } = await supabase
    .from("detail_pages")
    .insert({
      user_id: userId,
      template: params.template,
      product_name: params.productName,
      html: params.html,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "상세페이지 저장에 실패했습니다.");
  }
  return data.id;
}

export async function getPage(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("detail_pages")
    .select("html")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return data?.html ?? null;
}
