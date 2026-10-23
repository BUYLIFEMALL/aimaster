import "server-only";

export const DUPLICATE_GROUP_NAME = "중복등록";

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/**
 * 대량등록(엑셀/텍스트 붙여넣기) 중 전화번호나 이메일 중 하나라도 기존 수신자와 겹치는
 * 사람은 조용히 건너뛰지 않고 "중복등록" 그룹으로 몰아서 등록한다 — 회원이 직접 보고
 * 삭제할지 말지 판단할 수 있게 한다(사용자 지시, 2026-09-10). 이 그룹이 없으면 새로
 * 만들고, 이미 있으면(회원이 같은 이름으로 직접 만들어둔 경우 포함) 그대로 재사용한다.
 */
export async function findOrCreateDuplicateGroupId(supabase: SupabaseLike, userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("kakao_broadcast_groups")
    .select("id")
    .eq("user_id", userId)
    .eq("name", DUPLICATE_GROUP_NAME)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("kakao_broadcast_groups")
    .insert({ user_id: userId, name: DUPLICATE_GROUP_NAME })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "중복등록 그룹을 만들지 못했습니다.");
  return created.id as string;
}
