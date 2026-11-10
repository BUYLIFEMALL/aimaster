import type { Category } from "@/types/database.types";

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/**
 * 공개 프로그램이 1개 이상 있는 공개 상위 카테고리만 돌려준다(2026-10-24 주인님 결정). 관리자 화면은 쓰지 않는다.
 * canViewInternal(관리자·내부 열람 계정)이면 비공개(내부용, 예: REA) 카테고리도 함께 돌려준다(2026-11-11, docs/REA_CATEGORY_POLICY.md).
 */
export async function getVisibleCategories(supabase: SupabaseLike, canViewInternal = false) {
  let categoryQuery = supabase.from("categories").select("*").is("parent_id", null);
  if (!canViewInternal) categoryQuery = categoryQuery.eq("is_public", true);
  const [{ data: categories }, { data: programs }] = await Promise.all([
    categoryQuery.order("sort_order"),
    supabase.from("programs").select("category_id").eq("is_active", true),
  ]);
  const used = new Set((programs ?? []).map((p: { category_id: string | null }) => p.category_id));
  return ((categories ?? []) as Category[]).filter((c) => used.has(c.id));
}
