"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newsblurLogin } from "@/lib/ai/collector";

export interface SaveNewsblurAccountState {
  error?: string;
  success?: boolean;
}

export async function saveNewsblurAccountAction(
  _prevState: SaveNewsblurAccountState,
  formData: FormData,
): Promise<SaveNewsblurAccountState> {
  const user = await requireUser();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!username || !password) {
    return { error: "아이디와 비밀번호를 모두 입력해주세요." };
  }

  try {
    // 저장하기 전에 실제로 로그인이 되는지 먼저 확인한다.
    await newsblurLogin(username, password);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "NewsBlur 로그인 확인에 실패했습니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("newsblur_accounts")
    .upsert({ user_id: user.id, username, password }, { onConflict: "user_id" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/candidates");
  return { success: true };
}

export async function deleteNewsblurAccountAction() {
  const user = await requireUser();
  const supabase = await createClient();

  await supabase.from("newsblur_accounts").delete().eq("user_id", user.id);

  revalidatePath("/candidates");
}
