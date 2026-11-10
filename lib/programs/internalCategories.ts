// 내부(비공개) 카테고리 — REA 등 외부 원본 복제·분석용 (2026-11-11 주인님 지시, docs/REA_CATEGORY_POLICY.md)
// categories.is_public = false 인 카테고리와 그 프로그램은 관리자(is_admin)와 내부 열람 계정(profiles.can_view_internal)에게만 보인다.
// 목록·상세·사이트맵·대시보드 등 프로그램이 보이는 모든 곳은 이 파일의 함수로 거른다 — 화면마다 새로 판정하지 않는다.

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

type CategoryRef = { is_public?: boolean | null } | { is_public?: boolean | null }[] | null | undefined;

/** 조인으로 받은 카테고리(객체·배열·null 모두)가 비공개(내부용)인지. 카테고리가 없으면 공개로 본다. */
export function isInternalCategory(category: CategoryRef): boolean {
  const c = Array.isArray(category) ? category[0] : category;
  return c?.is_public === false;
}

/** 로그인 회원이 내부 카테고리를 볼 수 있는지(관리자 또는 can_view_internal). 비로그인은 false. */
export async function canViewInternalCategories(supabase: SupabaseLike, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase.from("profiles").select("is_admin, can_view_internal").eq("id", userId).maybeSingle();
  return !!data?.is_admin || !!data?.can_view_internal;
}

/** 지금 로그인한 회원 기준 canViewInternalCategories. */
export async function canViewInternalForCurrentUser(
  supabase: SupabaseLike & { auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> } },
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  return canViewInternalCategories(supabase, user?.id);
}

/** 조인한 category로 거른다(목록 화면용). 내부 열람 권한이 없으면 비공개 카테고리 프로그램을 뺀다. */
export function hideInternalByJoinedCategory<T extends object>(programs: T[], canViewInternal: boolean): T[] {
  if (canViewInternal) return programs;
  return programs.filter((p) => !isInternalCategory((p as { category?: CategoryRef }).category));
}

/** 비공개 카테고리 id 목록. */
export async function getInternalCategoryIds(supabase: SupabaseLike): Promise<Set<string>> {
  const { data } = await supabase.from("categories").select("id").eq("is_public", false);
  return new Set(((data ?? []) as { id: string }[]).map((c) => c.id));
}

/** 내부 열람 권한이 없으면 비공개 카테고리 소속 프로그램을 뺀다. */
export function filterInternalPrograms<T extends { category_id?: string | null }>(
  programs: T[],
  internalIds: Set<string>,
  canViewInternal: boolean,
): T[] {
  if (canViewInternal || internalIds.size === 0) return programs;
  return programs.filter((p) => !p.category_id || !internalIds.has(p.category_id));
}
