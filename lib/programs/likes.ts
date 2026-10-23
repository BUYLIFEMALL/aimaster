import type { Program } from "@/types/database.types";

type SupabaseLike = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/** 지금 로그인한 회원이 ♥ 추천한 프로그램 id 모음(비로그인이면 빈 집합) */
export async function getLikedProgramIds(supabase: SupabaseLike): Promise<{ loggedIn: boolean; liked: Set<string> }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { loggedIn: false, liked: new Set() };
  const { data } = await supabase.from("program_likes").select("program_id").eq("user_id", user.id);
  return { loggedIn: true, liked: new Set<string>(((data ?? []) as { program_id: string }[]).map((row) => row.program_id)) };
}

/** 추천(♥)을 많이 받은 순(같으면 관리자 지정 순서 → 최신 등록순) — 왼쪽에서 오른쪽으로 나열할 때 쓴다 */
export function sortByLikes<T extends Pick<Program, "like_count" | "sort_order" | "created_at">>(programs: T[]): T[] {
  return [...programs].sort((a, b) => {
    const likeDiff = (b.like_count ?? 0) - (a.like_count ?? 0);
    if (likeDiff !== 0) return likeDiff;
    const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
