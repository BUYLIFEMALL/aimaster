"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface CreateGroupState {
  error?: string;
}

/** 수신자를 묶어서 관리할 그룹을 만든다. 그룹은 이름만 가진 단순한 분류표다. */
export async function createBroadcastGroupAction(
  _prevState: CreateGroupState,
  formData: FormData,
): Promise<CreateGroupState> {
  const user = await requireProgramAccess();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "그룹 이름을 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("kakao_broadcast_groups").insert({ user_id: user.id, name });
  if (error) return { error: error.message };

  revalidatePath("/recipients");
  return {};
}

/**
 * 그룹을 삭제한다. 그 그룹에 속한 수신자는 사라지지 않고 "미분류"로 돌아간다
 * (kakao_broadcast_recipients.group_id가 on delete set null로 설정돼 있음).
 */
export async function deleteBroadcastGroupAction(id: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("kakao_broadcast_groups").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/recipients");
}
