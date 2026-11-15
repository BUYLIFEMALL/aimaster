// M2-5 몰 약관 읽기(서버) — 분양몰은 본사(원본 몰) 문서를 보여 준다. 표(0097)가 없는 DB에서도 깨지지 않게 빈 값으로.
import { createClient } from "@/lib/supabase/server";
import type { PolicyKind } from "./policies";

export type StorePolicy = { body: string; updated_at: string | null };

export async function getStorePolicies(store: { id: string; kind?: string; source_store_id?: string | null }): Promise<Record<PolicyKind, StorePolicy>> {
  const supabase = await createClient();
  const owner = store.kind === "resale" && store.source_store_id ? store.source_store_id : store.id;
  const out: Record<PolicyKind, StorePolicy> = { terms: { body: "", updated_at: null }, privacy: { body: "", updated_at: null } };
  const { data, error } = await supabase.from("mall_builder_store_policies").select("kind, body, updated_at").eq("store_id", owner);
  if (error) return out;
  for (const r of data ?? []) {
    if (r.kind === "terms" || r.kind === "privacy") out[r.kind as PolicyKind] = { body: r.body as string, updated_at: r.updated_at as string };
  }
  return out;
}
