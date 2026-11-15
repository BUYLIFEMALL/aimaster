"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DomainState = { error: string | null; message: string | null; domain: string };

// M5-1b 자기 도메인(2026-11-15) — 대표 운영사만. 검사·정리는 DB 함수 mall_builder_set_custom_domain(0093)이 한다
export async function saveDomainAction(slug: string, input: string): Promise<DomainState> {
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id, custom_domain").eq("slug", slug).maybeSingle();
  if (!store) return { error: "몰을 찾을 수 없습니다.", message: null, domain: "" };
  const { data, error } = await supabase.rpc("mall_builder_set_custom_domain", { p_store_id: store.id, p_domain: input });
  if (error) return { error: error.message, message: null, domain: (store.custom_domain as string | null) ?? "" };
  revalidatePath(`/s/${slug}/admin/settings`);
  const domain = (data as string | null) ?? "";
  return {
    error: null,
    domain,
    message: domain
      ? `${domain}을(를) 저장했습니다. 아래 DNS 설정을 마치면 플랫폼이 연결해 드립니다(보통 하루 안).`
      : "자기 도메인을 지웠습니다.",
  };
}
