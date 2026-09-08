"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { getKakaoAuthorizeUrl } from "@/lib/kakao/client";

export async function connectKakaoAccountAction() {
  const user = await requireProgramAccess();
  // CSRF 방지 및 콜백에서 사용자를 식별하기 위한 state 값 (user.id를 그대로 사용) —
  // threads/src/lib/actions/accounts.ts와 동일한 패턴.
  const authorizeUrl = getKakaoAuthorizeUrl(user.id);
  redirect(authorizeUrl);
}

export async function disconnectKakaoAccountAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("user_kakao_accounts").delete().eq("user_id", user.id);

  revalidatePath("/settings");
}
