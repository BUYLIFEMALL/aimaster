"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { getThreadsAuthorizeUrl } from "@/lib/threads/client";

export async function connectThreadsAccountAction() {
  const user = await requireProgramAccess();
  // CSRF 방지 및 콜백에서 사용자를 식별하기 위한 state 값 (user.id를 그대로 사용)
  const authorizeUrl = getThreadsAuthorizeUrl(user.id);
  redirect(authorizeUrl);
}

export async function disconnectThreadsAccountAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("tap_accounts").delete().eq("user_id", user.id);

  revalidatePath("/settings");
}
