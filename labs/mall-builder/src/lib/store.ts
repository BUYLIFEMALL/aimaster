import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Store = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  status: "active" | "suspended";
  created_at: string;
};

const STORE_COLUMNS = "id, owner_id, slug, name, status, created_at";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** 로그인하지 않았으면 로그인 화면으로(돌아올 주소 포함) */
export async function requireUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** 내가 운영자인 몰 목록 (보안 규칙이 내 몰만 돌려준다) */
export async function getMyStores(userId: string): Promise<Store[]> {
  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("mall_builder_store_staff")
    .select("store_id")
    .eq("user_id", userId);
  const ids = (staff ?? []).map((row) => row.store_id as string);
  if (!ids.length) return [];
  const { data } = await supabase.from("mall_builder_stores").select(STORE_COLUMNS).in("id", ids).order("created_at");
  return (data ?? []) as Store[];
}

/** 주소로 몰 찾기 — 정지된 몰은 보안 규칙상 운영자에게만 보인다. 없으면 404 */
export async function getStoreBySlug(slug: string): Promise<Store> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_stores").select(STORE_COLUMNS).eq("slug", slug).maybeSingle();
  if (!data) notFound();
  return data as Store;
}

export async function isStoreStaff(storeId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_is_store_staff", { p_store_id: storeId });
  return data === true;
}
