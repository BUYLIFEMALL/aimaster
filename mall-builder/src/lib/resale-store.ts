// T2 분양몰 읽기(0061) — 보안 규칙: 신청은 신청자 본인·원본 몰 대표만 읽힘
import { createClient } from "@/lib/supabase/server";
import type { ResaleApplication } from "@/lib/resale";

const APP_COLUMNS = "id, source_store_id, user_id, slug, name, phone, channel, memo, status, note, store_id, created_at, decided_at";

export type ResaleSource = { id: string; slug: string; name: string };

/** 분양을 받는 몰(공개) */
export async function getResaleSources(): Promise<ResaleSource[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_resale_sources");
  return (data ?? []) as ResaleSource[];
}

/** 내 분양 신청(최근 순) */
export async function getMyResaleApplications(userId: string): Promise<ResaleApplication[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_resale_applications").select(APP_COLUMNS).eq("user_id", userId).order("created_at", { ascending: false });
  return (data ?? []) as ResaleApplication[];
}

/** 원본 몰 대표: 이 몰에 들어온 분양 신청 */
export async function getStoreResaleApplications(storeId: string): Promise<ResaleApplication[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_resale_applications").select(APP_COLUMNS).eq("source_store_id", storeId).order("created_at", { ascending: false }).limit(200);
  return (data ?? []) as ResaleApplication[];
}

/** 분양몰 몇 개를 id로(신청자 화면 — 영업 중 몰은 누구나 읽힘, 멈춘 몰은 대표·직원만) */
export async function getStoresByIds(ids: string[]): Promise<ResaleStoreRow[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_stores").select("id, slug, name, owner_id, status, resale_expires_at, created_at").in("id", ids);
  return (data ?? []) as ResaleStoreRow[];
}

export type ResaleStoreRow ={ id: string; slug: string; name: string; owner_id: string; status: string; resale_expires_at: string | null; created_at: string };

/** 원본 몰 대표: 이 몰의 분양몰 목록(분양몰 읽기는 몰 표 보안 규칙 — 영업 중 몰은 누구나 읽힘) */
export async function getResaleStoresOf(sourceStoreId: string): Promise<ResaleStoreRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_stores")
    .select("id, slug, name, owner_id, status, resale_expires_at, created_at")
    .eq("source_store_id", sourceStoreId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ResaleStoreRow[];
}
