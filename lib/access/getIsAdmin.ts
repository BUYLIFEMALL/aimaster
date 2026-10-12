type SupabaseLike = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/**
 * 지금 로그인한 사용자가 관리자(`profiles.is_admin`)인지 확인한다. 화면 표시(편집 버튼 등) 전용이며,
 * 실제 관리자 화면(/admin)은 미들웨어와 관리자 레이아웃이 따로 막는다.
 */
export async function getIsAdmin(supabase: SupabaseLike): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return profile?.is_admin === true;
}
