import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRow } from "@/lib/categories";

export type Store = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  status: "active" | "suspended";
  business_info: unknown; // readBusinessInfo()로 읽는다
  created_at: string;
};

const STORE_COLUMNS = "id, owner_id, slug, name, status, business_info, created_at";

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

/** 몰의 카테고리 — 보안 규칙상 손님에게는 보이는 것만, 운영자에게는 숨긴 것까지 온다 */
export async function getCategoryRows(storeId: string): Promise<CategoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_categories")
    .select("id, parent_id, name, depth, sort, is_visible")
    .eq("store_id", storeId);
  return (data ?? []) as CategoryRow[];
}

/** 운영자 관리 화면 공통 입구 — 로그인 확인 후 몰과 「운영자인가」를 함께 돌려준다 */
export async function getStaffStore(slug: string, path: string): Promise<{ store: Store; staff: boolean }> {
  await requireUser(path);
  const store = await getStoreBySlug(slug);
  return { store, staff: await isStoreStaff(store.id) };
}
